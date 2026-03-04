const { Role } = require('../models');
const { Op } = require('sequelize');

exports.getRoles = async (req, res) => {
    try {
        const { entity_id } = req.user;
        const activeEntityId = req.user.activeEntityId;

        let where = { is_deleted: false, active: true };
        
        if (activeEntityId || entity_id) {
            // User is in a company context: show roles for this company + global public roles
            where[Op.or] = [
                { entity_id: activeEntityId || entity_id },
                { entity_id: null }
            ];
        }

        const roles = await Role.findAll({
            where,
            order: [['name', 'ASC']]
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

