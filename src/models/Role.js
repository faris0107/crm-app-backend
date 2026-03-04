const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: true
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

module.exports = Role;
