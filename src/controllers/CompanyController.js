const { Entity, User, Person, Status, Role, Timeline } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

exports.createCompany = async (req, res) => {
    try {
        const { name, code, primary_email, primary_mobile, admin_name, admin_email, admin_password } = req.body;

        // 1. Create the Company (Entity)
        const entity = await Entity.create({
            name,
            code,
            primary_email,
            primary_mobile
        });

        // 2. Seed Default Roles for this Company
        const companyRoles = [
            { name: 'ADMIN', description: 'Company overall administrator', is_system: false, entity_id: entity.id },
            { name: 'STAFF', description: 'Company staff member', is_system: false, entity_id: entity.id },
            { name: 'USER', description: 'Standard platform users', is_system: false, entity_id: entity.id }
        ];
        
        const createdRoles = {};
        for (const r of companyRoles) {
            const role = await Role.create(r);
            createdRoles[r.name] = role.id;
        }

        // 3. Seed Default Statuses for this Company
        const defaultStatuses = [
            { name: 'New Lead', color: '#10B981', entity_id: entity.id },
            { name: 'In Progress', color: '#3B82F6', entity_id: entity.id },
            { name: 'Following Up', color: '#F59E0B', entity_id: entity.id },
            { name: 'Lost', color: '#EF4444', entity_id: entity.id }
        ];
        await Status.bulkCreate(defaultStatuses);

        // 4. Create the Admin for this Company
        const hashedPassword = await bcrypt.hash(admin_password, 10);
        const adminUser = await User.create({
            email: admin_email,
            name: admin_name,
            password: hashedPassword,
            role_id: createdRoles['ADMIN'],
            entity_id: entity.id,
            active: true
        });

        res.status(201).json({
            message: 'Company, Roles, and Statuses created successfully',
            company: entity,
            admin: { id: adminUser.id, name: adminUser.name, email: adminUser.email }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getCompanies = async (req, res) => {
    try {
        const { deleted } = req.query;
        let where = {};
        
        if (deleted === 'true') {
            where.is_deleted = true;
        } else {
            where.is_deleted = false;
        }

        const companies = await Entity.findAll({
            where,
            include: [{
                model: User,
                where: { role_id: { [Op.ne]: null } }, // Simplified check since we now use role_id
                attributes: ['id', 'name', 'email', 'mobile'],
                required: false
            }]
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateCompany = async (req, res) => {
    try {
        const entity = await Entity.findByPk(req.params.id);
        if (!entity) throw new Error('Company not found');

        await entity.update(req.body);
        res.json(entity);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteCompany = async (req, res) => {
    try {
        const entity = await Entity.findByPk(req.params.id);
        if (!entity) throw new Error('Company not found');

        // Note: In a production environment, you might want to use soft-delete (active: false)
        // or ensure all dependent data is handled. For now, we'll do a hard delete if allowed.

        await entity.update({ is_deleted: true });
        res.json({ message: 'Company deleted successfully (soft delete)' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.restoreCompany = async (req, res) => {
    try {
        const entity = await Entity.findOne({
            where: { id: req.params.id, is_deleted: true }
        });
        if (!entity) return res.status(404).json({ message: 'Deleted company not found' });

        await entity.update({ is_deleted: false, active: true });
        res.json({ message: 'Company restored successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const companyCount = await Entity.count();
        const userCount = await User.count();
        const contactCount = await Person.count();

        res.json({
            companies: companyCount,
            users: userCount,
            contacts: contactCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
