const PeopleService = require('../services/PeopleService');
const { Person, User } = require('../models');
const { Op } = require('sequelize');
const xlsx = require('xlsx');
const logger = require('../utils/logger');

exports.getPeople = async (req, res) => {
    try {
        const { limit = 48, page = 1, assigned_to, parent_l1, parent_admin, search, status_id, show_deleted } = req.query;
        const offset = (page - 1) * limit;

        const isSuperAdmin = !req.user.entity_id;
        let finalFilter = { ...req.tenantFilter };

        if (show_deleted === 'true' && isSuperAdmin) {
            finalFilter.is_deleted = true;
        } else {
            finalFilter.is_deleted = false;
            finalFilter.active = true;
        }

        if (status_id) {
            finalFilter.status_id = status_id;
        }

        // --- Role Based Restriction ---
        if (req.user.role === 'L2') {
            // L2 can ONLY see their own assigned contacts
            finalFilter.assigned_to = req.user.id;
        } else if (assigned_to === 'null') {
            finalFilter.assigned_to = null;
        } else if (assigned_to) {
            finalFilter.assigned_to = assigned_to;
        } else if (parent_l1) {
            const l2s = await User.findAll({ where: { parent_id: parent_l1 }, attributes: ['id'] });
            finalFilter.assigned_to = l2s.map(u => u.id);
        } else if (parent_admin) {
            const l1s = await User.findAll({ where: { parent_id: parent_admin }, attributes: ['id'] });
            const l2s = await User.findAll({ where: { parent_id: l1s.map(u => u.id) }, attributes: ['id'] });
            finalFilter.assigned_to = l2s.map(u => u.id);
        }

        if (search) {
            const searchTerms = search.trim();
            finalFilter[Op.or] = [
                { name: { [Op.like]: `%${searchTerms}%` } },
                { text_id: { [Op.like]: `%${searchTerms}%` } },
                { mobile: { [Op.like]: `%${searchTerms}%` } }
            ];
        }

        const people = await PeopleService.getAllPeople(finalFilter, limit, offset);

        const totalCount = await Person.count({
            where: finalFilter
        });

        res.json({
            people,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: totalCount > (offset + people.length)
            }
        });
    } catch (error) {
        logger.error('SERVER ERROR IN GET_PEOPLE:', error.stack);
        res.status(500).json({ message: error.message });
    }
};

exports.getPerson = async (req, res) => {
    try {
        const person = await PeopleService.getPersonDetail(req.params.id, req.tenantFilter);
        res.json(person);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.createPerson = async (req, res) => {
    try {
        const entityId = req.body.entity_id || req.user.activeEntityId;
        const person = await PeopleService.createPerson(req.body, entityId, req.user.id, req.user.role);
        res.status(201).json(person);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updatePerson = async (req, res) => {
    try {
        const entityId = req.body.entity_id || req.user.activeEntityId;
        const person = await PeopleService.updatePerson(
            req.params.id,
            req.body,
            entityId,
            req.user.id,
            req.user.role
        );
        res.json(person);
    } catch (error) {
        const status = error.message.includes('Unauthorized') ? 403 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.bulkUpload = async (req, res) => {
    try {
        if (!req.file) throw new Error('No file uploaded');

        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const entityId = req.body.entity_id || req.user.activeEntityId;
        const created = [];
        for (const item of data) {
            if (item.Name && item.ID) {
                const person = await PeopleService.createPerson({
                    name: item.Name,
                    text_id: item.ID.toString(),
                    mobile: item.Mobile?.toString(),
                    tags: item.Tags ? item.Tags.split(',') : []
                }, entityId, req.user.id);
                created.push(person);
            }
        }
        res.json({ message: `Imported ${created.length} contacts`, count: created.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePerson = async (req, res) => {
    try {
        await PeopleService.deletePerson(req.params.id, req.user.activeEntityId, req.user.id, req.user.role);
        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.restorePerson = async (req, res) => {
    try {
        const person = await PeopleService.restorePerson(req.params.id, req.user.activeEntityId, req.user.id, req.user.role);
        res.json(person);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
