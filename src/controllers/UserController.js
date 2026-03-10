const { User, Role, Person } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

exports.addUser = async (req, res) => {
    try {
        const { email, name, role_id, entity_id, password, user_code, mobile, parent_id } = req.body;

        // --- Uniqueness Checks ---
        const existingEmail = await User.findOne({ where: { email, is_deleted: false } });
        if (existingEmail) return res.status(400).json({ message: 'User with this email already exists' });

        if (mobile) {
            const existingMobile = await User.findOne({ where: { mobile, is_deleted: false } });
            if (existingMobile) return res.status(400).json({ message: 'User with this mobile number already exists' });
        }
        // -------------------------

        // --- Role Hierarchy Check ---
        const targetRole = await Role.findByPk(role_id);
        if (!targetRole) return res.status(400).json({ message: 'Invalid role' });

        const currentUserRole = req.user.role;
        const isSystem = !req.user.entity_id;
        let finalParentId = parent_id;

        if (!isSystem) {
            if (currentUserRole === 'ADMIN') {
                if (targetRole.name !== 'L1') {
                    return res.status(403).json({ message: 'Admins can only create L1 Managers' });
                }
                finalParentId = req.user.id;
            } else if (currentUserRole === 'L1') {
                if (targetRole.name !== 'L2') {
                    return res.status(403).json({ message: 'L1 Managers can only create L2 Supervisors' });
                }
                finalParentId = req.user.id;
            } else {
                return res.status(403).json({ message: 'Insufficient permissions to create members at this level' });
            }
        } else {
            // --- Superadmin Hierarchy Rule ---
            if (targetRole.name === 'L1') {
                if (!finalParentId) {
                    return res.status(400).json({ message: 'An L1 Manager must be assigned to an Admin' });
                }
                const parent = await User.findByPk(finalParentId, { include: [Role] });
                if (!parent || parent.Role?.name !== 'ADMIN') {
                    return res.status(400).json({ message: 'L1 Manager must report to an Admin' });
                }
            } else if (targetRole.name === 'L2') {
                if (!finalParentId) {
                    return res.status(400).json({ message: 'An L2 Supervisor must be assigned to an L1 Manager' });
                }
                const parent = await User.findByPk(finalParentId, { include: [Role] });
                if (!parent || parent.Role?.name !== 'L1') {
                    return res.status(400).json({ message: 'L2 Supervisor must report to an L1 Manager' });
                }
            } else if (targetRole.name === 'ADMIN') {
                finalParentId = null;
            }
        }
        // ----------------------------

        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const user = await User.create({
            email,
            name,
            role_id,
            user_code: user_code || null,
            mobile: mobile || null,
            password: hashedPassword,
            entity_id: entity_id || req.user.activeEntityId,
            parent_id: finalParentId,
            created_by: req.user.id
        });

        // Don't return password in response
        const userJson = user.toJSON();
        delete userJson.password;

        res.status(201).json(userJson);
    } catch (error) {
        console.error('[USER CONTROLLER] Error adding user:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { deleted, inactive, parent_id, role } = req.query;
        let where = { ...req.tenantFilter };

        // Soft delete filter: show deleted only if explicitly requested, otherwise hide them
        if (deleted === 'true') {
            where.is_deleted = true;
        } else {
            where.is_deleted = false;
        }

        // Active filter: if inactive=true, show only inactive. If all=true, show both.
        // Default: show only active
        if (inactive === 'true') {
            where.active = false;
        }

        // --- Hierarchical Filtering ---
        if (parent_id === 'null') {
            where.parent_id = null;
        } else if (parent_id) {
            where.parent_id = parent_id;
        }
        // ------------------------------

        const roleWhere = (req.user.role === 'SUPERADMIN' && req.user.activeEntityId)
            ? { name: { [Op.not]: 'SUPERADMIN' } }
            : {};

        if (role) roleWhere.name = role;

        const users = await User.findAll({
            where,
            attributes: ['id', 'name', 'role_id', 'email', 'user_code', 'active', 'is_deleted', 'parent_id', 'entity_id', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: Role,
                    as: 'Role',
                    where: roleWhere,
                    attributes: ['name'],
                    required: true
                },
                {
                    model: User,
                    as: 'Parent',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'Creator',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'Updater',
                    attributes: ['id', 'name']
                }
            ]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, role_id, entity_id, password, user_code, mobile, parent_id } = req.body;

        // --- Uniqueness Checks ---
        if (email) {
            const existingEmail = await User.findOne({
                where: { email, is_deleted: false, id: { [Op.ne]: id } }
            });
            if (existingEmail) return res.status(400).json({ message: 'User with this email already exists' });
        }

        if (mobile) {
            const existingMobile = await User.findOne({
                where: { mobile, is_deleted: false, id: { [Op.ne]: id } }
            });
            if (existingMobile) return res.status(400).json({ message: 'User with this mobile number already exists' });
        }
        // -------------------------

        const user = await User.findByPk(id, {
            include: [{ model: Role, attributes: ['name'] }]
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const currentUserRole = req.user.role;
        const isSystem = !req.user.entity_id;
        let finalParentId = parent_id !== undefined ? parent_id : user.parent_id;

        // --- Permission Check for Target User ---
        if (!isSystem) {
            if (currentUserRole === 'ADMIN') {
                if (!['L1', 'L2'].includes(user.Role.name)) {
                    return res.status(403).json({ message: 'Admins can only edit L1 or L2 users' });
                }
            } else if (currentUserRole === 'L1') {
                if (user.Role.name !== 'L2') {
                    return res.status(403).json({ message: 'L1 Managers can only edit L2 Supervisors' });
                }
            } else {
                return res.status(403).json({ message: 'Insufficient permissions to edit users' });
            }
        }
        // ----------------------------------------

        // --- Role Hierarchy Check ---
        if (role_id) {
            const targetRole = await Role.findByPk(role_id);
            if (!targetRole) return res.status(400).json({ message: 'Invalid role' });

            if (!isSystem) {
                if (currentUserRole === 'ADMIN') {
                    if (targetRole.name !== 'L1') {
                        return res.status(403).json({ message: 'Admins can only assign L1 Managers' });
                    }
                } else if (currentUserRole === 'L1') {
                    if (targetRole.name !== 'L2') {
                        return res.status(403).json({ message: 'L1 Managers can only assign L2 Supervisors' });
                    }
                }
            } else {
                if (targetRole.name === 'ADMIN') finalParentId = null;
            }
        }
        // ----------------------------

        const updateData = {
            email,
            name,
            role_id,
            user_code: user_code === '' ? null : (user_code || user.user_code),
            mobile: mobile === '' ? null : (mobile || user.mobile),
            parent_id: finalParentId,
            updated_by: req.user.id
        };

        // Only SuperAdmin can change entity_id
        if (!req.user.entity_id && entity_id !== undefined) {
            updateData.entity_id = entity_id;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await user.update(updateData);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('[USER CONTROLLER] Error updating user:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.restoreUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({
            where: { id, ...req.tenantFilter, is_deleted: true },
            include: [{ model: Role, attributes: ['name'] }]
        });
        if (!user) return res.status(404).json({ message: 'Deleted user not found' });

        // --- Role Hierarchy Check ---
        const currentUserRole = req.user.role;
        const isSystem = !req.user.entity_id;

        if (!isSystem) {
            if (currentUserRole === 'ADMIN') {
                if (!['L1', 'L2'].includes(user.Role.name)) {
                    return res.status(403).json({ message: 'Admins can only restore L1 or L2 users' });
                }
            } else if (currentUserRole === 'L1') {
                if (user.Role.name !== 'L2') {
                    return res.status(403).json({ message: 'L1 Managers can only restore L2 Supervisors' });
                }
            } else {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }
        }
        // ----------------------------

        await user.update({ is_deleted: false, active: true });
        res.json({ message: 'User restored successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }

        const user = await User.findOne({
            where: { id, ...req.tenantFilter },
            include: [{ model: Role, attributes: ['name'] }]
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- Hierarchy Protection Check ---
        const roleName = user.Role?.name;

        if (roleName === 'ADMIN') {
            const hasL1 = await User.findOne({ where: { parent_id: id, is_deleted: false } });
            if (hasL1) {
                return res.status(400).json({
                    message: "You can't delete this Admin because there are L1 Managers under them. Please delete all L1 Managers first."
                });
            }
        } else if (roleName === 'L1') {
            const hasL2 = await User.findOne({ where: { parent_id: id, is_deleted: false } });
            if (hasL2) {
                return res.status(400).json({
                    message: "You can't delete this L1 Manager because there are L2 Supervisors under them. Please delete all L2 Supervisors first."
                });
            }
        } else if (roleName === 'L2') {
            const hasContacts = await Person.findOne({ where: { assigned_to: id, is_deleted: false } });
            if (hasContacts) {
                return res.status(400).json({
                    message: "You can't delete this L2 Supervisor because there are Contacts assigned to them. Please re-assign or delete those Contacts first."
                });
            }
        }
        // ---------------------------------

        // --- Role Hierarchy Check ---
        const currentUserRole = req.user.role;
        const isSystem = !req.user.entity_id;

        if (!isSystem) {
            if (currentUserRole === 'ADMIN') {
                if (!['L1', 'L2'].includes(user.Role.name)) {
                    return res.status(403).json({ message: 'Admins can only delete L1 or L2 users' });
                }
            } else if (currentUserRole === 'L1') {
                if (user.Role.name !== 'L2') {
                    return res.status(403).json({ message: 'L1 Managers can only delete L2 Supervisors' });
                }
            } else {
                return res.status(403).json({ message: 'Insufficient permissions to delete users' });
            }
        }
        // ----------------------------

        await user.update({ is_deleted: true });
        res.json({ message: 'User deleted successfully (soft delete)' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
