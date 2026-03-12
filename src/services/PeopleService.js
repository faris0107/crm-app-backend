const { Person, Status, User, Timeline } = require('../models');
const { Op } = require('sequelize');

class PeopleService {
    async getAllPeople(filter, limit = null, offset = null) {
        const options = {
            where: { ...filter },
            include: [
                { model: Status, attributes: ['name', 'color'] },
                { model: User, as: 'Assignee', attributes: ['name'] },
                { model: User, as: 'Creator', attributes: ['name'] },
                { model: User, as: 'Updater', attributes: ['name'] }
            ],
            order: [['created_at', 'DESC']]
        };

        if (filter.is_deleted === undefined) {
            options.where.is_deleted = false;
        }
        if (filter.active === undefined) {
            options.where.active = true;
        }

        if (limit) options.limit = parseInt(limit);
        if (offset) options.offset = parseInt(offset);

        // console.log('DEBUG: getAllPeople options:', JSON.stringify(options, null, 2));
        return await Person.findAll(options);
    }

    async getPersonDetail(id, filter) {
        const query = typeof filter === 'object' ? { id, ...filter } : { id, entity_id: filter };
        const whereClause = { ...query };
        if (whereClause.is_deleted === undefined) whereClause.is_deleted = false;
        if (whereClause.active === undefined) whereClause.active = true;

        const person = await Person.findOne({
            where: whereClause,
            include: [
                { model: Status },
                { model: User, as: 'Assignee', attributes: ['name'] },
                { model: User, as: 'Creator', attributes: ['name'] },
                { model: User, as: 'Updater', attributes: ['name'] },
                {
                    model: Timeline,
                    include: [{ model: User, attributes: ['name'] }],
                    order: [['created_at', 'DESC']]
                }
            ]
        });
        if (!person) throw new Error('Person not found');
        return person;
    }

    async createPerson(data, entityId, userId, currentUserRole) {
        let finalAssignedTo = data.assigned_to || null;

        // --- Hierarchy Validation (Only if a target is chosen) ---
        if (currentUserRole === 'L2') {
            if (finalAssignedTo && finalAssignedTo !== userId) {
                throw new Error('As an L2 Supervisor, you can only assign contacts to yourself');
            }
        } else if (finalAssignedTo) {
            // Verify assigning to an L2 role
            const { Role } = require('../models');
            const targetUser = await User.findByPk(finalAssignedTo, {
                include: [{ model: Role, attributes: ['name'] }]
            });

            if (!targetUser || targetUser.Role.name !== 'L2') {
                throw new Error('People can only be added under L2 Supervisors');
            }

            if (currentUserRole === 'L1') {
                // L1 can only add people under their OWN L2 team members
                if (targetUser.parent_id !== userId) {
                    throw new Error('You can only assign contacts to your own L2 team');
                }
            }
        }
        // If not L2 and finalAssignedTo is null, it stays null (Unassigned)
        // ----------------------------

        // --- Unique Mobile Check ---
        if (data.mobile) {
            const existing = await Person.findOne({
                where: {
                    mobile: data.mobile,
                    entity_id: entityId,
                    is_deleted: false
                }
            });
            if (existing) {
                throw new Error('A contact with this mobile number already exists in this company');
            }
        }

        const person = await Person.create({
            ...data,
            entity_id: entityId,
            assigned_to: finalAssignedTo,
            created_by: userId
        });
        await Timeline.create({
            person_id: person.id,
            user_id: userId,
            action: finalAssignedTo ? 'Created and assigned contact' : 'Created unassigned contact',
            entity_id: entityId
        });
        return person;
    }

    async updatePerson(id, data, entityId, userId, role) {
        const person = await Person.findOne({ where: { id, entity_id: entityId } });
        if (!person) throw new Error('Person not found');

        // RBAC check: 
        // 1. Super Admin can edit everything
        // 2. Admin and L1 can edit all contacts in their company
        // 3. L2 can ONLY edit contacts assigned to them
        const isSuperAdmin = !entityId;

        if (!isSuperAdmin) {
            // --- Unique Mobile Check ---
            if (data.mobile && data.mobile !== person.mobile) {
                const existing = await Person.findOne({
                    where: {
                        mobile: data.mobile,
                        entity_id: entityId,
                        is_deleted: false,
                        id: { [Op.ne]: id }
                    }
                });
                if (existing) {
                    throw new Error('A contact with this mobile number already exists in this company');
                }
            }

            let canEdit = false;
            if (role === 'ADMIN' || role === 'L1') {
                canEdit = true;
            } else if (role === 'L2') {
                canEdit = person.assigned_to === userId;
            }

            if (!canEdit) {
                throw new Error('Unauthorized: You can only edit contacts assigned to you');
            }
        }

        await person.update({
            ...data,
            updated_by: userId
        });
        await Timeline.create({
            person_id: person.id,
            user_id: userId,
            action: 'Updated contact details',
            entity_id: entityId
        });
        return person;
    }

    async deletePerson(id, entityId, userId, role) {
        const person = await Person.findOne({ where: { id, entity_id: entityId } });
        if (!person) throw new Error('Person not found');

        // RBAC check for deletion
        if (role === 'L2' && person.assigned_to !== userId) {
            throw new Error('Unauthorized: L2 can only delete their assigned contacts');
        }

        await person.update({ is_deleted: true });
        await Timeline.create({
            person_id: person.id,
            user_id: userId,
            action: 'Deleted contact (soft delete)',
            entity_id: entityId
        });
        return { success: true };
    }

    async restorePerson(id, entityId, userId, role) {
        // Only Super Admin or possibly Admin? User said "superadmin can see that deleted contact as they can restore it"
        // I'll stick to Super Admin (entityId is null for them)
        if (entityId) throw new Error('Unauthorized: Only System Admins can restore contacts');

        const person = await Person.findOne({ where: { id, is_deleted: true } });
        if (!person) throw new Error('Deleted contact not found');

        await person.update({ is_deleted: false });
        await Timeline.create({
            person_id: person.id,
            user_id: userId,
            action: 'Restored contact',
            entity_id: person.entity_id
        });
        return person;
    }
}

module.exports = new PeopleService();
