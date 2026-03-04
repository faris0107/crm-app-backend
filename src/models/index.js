const sequelize = require('../config/db.config');
const Entity = require('./Entity');
const User = require('./User');
const Person = require('./Person');
const Status = require('./Status');
const Timeline = require('./Timeline');
const Role = require('./Role');

// --- Associations ---

// Role has many Users
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// Entity has many Users
Entity.hasMany(User, { foreignKey: 'entity_id' });
User.belongsTo(Entity, { foreignKey: 'entity_id' });

// User Hierarchy (Admin -> Staff)
User.hasMany(User, { as: 'Subordinates', foreignKey: 'parent_id' });
User.belongsTo(User, { as: 'Parent', foreignKey: 'parent_id' });

// Entity has many People
Entity.hasMany(Person, { foreignKey: 'entity_id' });
Person.belongsTo(Entity, { foreignKey: 'entity_id' });

// Entity has many Statuses
Entity.hasMany(Status, { foreignKey: 'entity_id' });
Status.belongsTo(Entity, { foreignKey: 'entity_id', constraints: false });

// Status has many People
Status.hasMany(Person, { foreignKey: 'status_id' });
Person.belongsTo(Status, { foreignKey: 'status_id' });

// User (Staff) has many People (Assigned)
User.hasMany(Person, { as: 'AssignedPeople', foreignKey: 'assigned_to' });
Person.belongsTo(User, { as: 'Assignee', foreignKey: 'assigned_to' });

// Person has many Timelines
Person.hasMany(Timeline, { foreignKey: 'person_id' });
Timeline.belongsTo(Person, { foreignKey: 'person_id' });

// User who created the timeline entry
User.hasMany(Timeline, { foreignKey: 'user_id' });
Timeline.belongsTo(User, { foreignKey: 'user_id' });

// Creator/Updater for User
User.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
User.belongsTo(User, { as: 'Updater', foreignKey: 'updated_by' });

// Creator/Updater for Person
Person.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
Person.belongsTo(User, { as: 'Updater', foreignKey: 'updated_by' });

module.exports = {
    sequelize,
    Entity,
    User,
    Person,
    Status,
    Timeline,
    Role
};
