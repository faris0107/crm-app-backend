const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Timeline = sequelize.define('Timeline', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

module.exports = Timeline;
