const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Status = sequelize.define('Status', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: '#3B82F6'
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Status;
