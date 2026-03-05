const { Person, Status, User, Timeline } = require('../models');

class PeopleService {
    async getAllPeople(filter) {
        return await Person.findAll({
            where: { ...filter, is_deleted: false, active: true },
            include: [
                { model: Status, attributes: ['name', 'color'] },
                { model: User, as: 'Assignee', attributes: ['name'] },
                { model: User, as: 'Creator', attributes: ['name'] },
                { model: User, as: 'Updater', attributes: ['name'] }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    async getPersonDetail(id, filter) {
        const query = typeof filter === 'object' ? { id, ...filter } : { id, entity_id: filter };
        const person = await Person.findOne({
            where: { ...query, is_deleted: false, active: true },
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
            finalAssignedTo = userId; // L2 always adds to themselves
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
        // 2. Others can edit if it's assigned to them OR if it's currently unassigned (null)
        const isSuperAdmin = !entityId; // Context middleware sets entityId to null for global superadmin

        if (!isSuperAdmin) {
            const canEdit = person.assigned_to === userId || person.assigned_to === null;
            if (!canEdit) {
                throw new Error('Unauthorized: You can only edit contacts assigned to you or unassigned contacts');
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

    async deletePerson(id, entityId, userId) {
        const person = await Person.findOne({ where: { id, entity_id: entityId } });
        if (!person) throw new Error('Person not found');

        await person.update({ is_deleted: true });
        await Timeline.create({
            person_id: person.id,
            user_id: userId,
            action: 'Deleted contact (soft delete)',
            entity_id: entityId
        });
        return { success: true };
    }
}

module.exports = new PeopleService();
