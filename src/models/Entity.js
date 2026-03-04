const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Entity = sequelize.define('Entity', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    primary_email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    primary_mobile: {
        type: DataTypes.STRING,
        unique: true,
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

module.exports = Entity;
