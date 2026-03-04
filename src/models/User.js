const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: { isEmail: true }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    user_code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    mobile: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    google_id: {
        type: DataTypes.STRING
    },
    refresh_token: {
        type: DataTypes.TEXT
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    parent_id: {
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
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true
    },
    updated_by: {
        type: DataTypes.UUID,
        allowNull: true
    }
});

module.exports = User;
