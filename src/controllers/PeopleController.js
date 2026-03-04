const PeopleService = require('../services/PeopleService');
const xlsx = require('xlsx');

exports.getPeople = async (req, res) => {
    try {
        const people = await PeopleService.getAllPeople(req.tenantFilter);
        res.json(people);
    } catch (error) {
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
        await PeopleService.deletePerson(req.params.id, req.user.activeEntityId, req.user.id);
        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
