const { Status } = require('../models');
const { Op } = require('sequelize');

exports.getStatuses = async (req, res) => {
    try {
        const { all } = req.query;
        let queryFilter = {};

        if (req.user.activeEntityId) {
            // Context-scoped user (Tenant or SuperAdmin in context)
            queryFilter = {
                [Op.or]: [
                    { entity_id: req.user.activeEntityId },
                    { entity_id: null }
                ]
            };
        } else {
            // Global Super Admin (No context)
            queryFilter = {}; // All statuses
        }

        // Always filter out deleted items
        queryFilter.is_deleted = false;

        // If not requesting all, only show active ones
        if (all !== 'true') {
            queryFilter.active = true;
        }

        const statuses = await Status.findAll({
            where: queryFilter,
            order: [['name', 'ASC']]
        });
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStatus = async (req, res) => {
    try {
        const { name, color } = req.body;
        const entityId = req.body.entity_id || req.user.activeEntityId || null;
        const status = await Status.create({
            name,
            color,
            entity_id: entityId
        });
        res.status(201).json(status);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { name, color, active } = req.body;
        const status = await Status.findOne({
            where: { id: req.params.id, ...req.tenantFilter }
        });

        if (!status) return res.status(404).json({ message: 'Status not found' });

        await status.update({ name, color, active });
        res.json(status);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteStatus = async (req, res) => {
    try {
        const status = await Status.findOne({
            where: { id: req.params.id, ...req.tenantFilter }
        });

        if (!status) return res.status(404).json({ message: 'Status not found' });

        await status.update({ is_deleted: true });
        res.json({ message: 'Status deleted successfully (soft delete)' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
