const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Person = sequelize.define('Person', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    text_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mobile: {
        type: DataTypes.STRING
    },
    country_code: {
        type: DataTypes.STRING,
        defaultValue: '+91'
    },
    tags: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true
    },
    updated_by: {
        type: DataTypes.UUID,
        allowNull: true
    },
    referred_by: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Person;
