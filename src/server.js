const express = require('express');
const { Op } = require('sequelize');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger.config');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();

// --- Security Check ---
if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1);
}

const simpleRateLimiter = require('./middleware/rateLimiter.middleware');

// --- Middleware ---
app.disable('x-powered-by'); // Extra precaution

// Tight Helmet configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
        },
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "same-origin" },
}));

// Restricted CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-company-context'],
    credentials: true,
}));
app.use(morgan('dev'));
app.use(logger.request);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// --- Routes ---
// Auth routes get rate limited to prevent brute force
app.use('/api/auth', simpleRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes'
}), require('./routes/auth.routes'));

app.use('/api/people', require('./routes/people.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/statuses', require('./routes/status.routes'));
app.use('/api/companies', require('./routes/company.routes'));
app.use('/api/roles', require('./routes/role.routes'));

// --- Health Check ---
app.get('/health', (req, res) => res.json({ status: 'UP', timestamp: new Date() }));

// --- Error Handler ---
app.use((err, req, res, next) => {
    logger.error(err.message, err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

const initializeDatabase = async () => {
    const { Entity, User, Status, Role } = require('./models');
    console.log('🌱 Initializing/Updating default data...');

    // Drop global unique constraints that prevent multi-company usage
    try {
        const drop = async (tableName) => {
            const [indexes] = await sequelize.query(`SHOW INDEX FROM ${tableName} WHERE Key_name != 'PRIMARY'`);
            for (let idx of indexes) {
                if (idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
                    console.log(`Dropping unique index ${idx.Key_name} from ${tableName}`);
                    try { await sequelize.query(`ALTER TABLE ${tableName} DROP INDEX ${idx.Key_name}`); } catch(e) {}
                }
            }
        };
        await drop('Users');
        await drop('People');
    } catch(e) { console.error('Error dropping constraints', e); }

    // 1. Seed Global Roles
    const defaultRoles = [
        { name: 'SUPERADMIN', description: 'Total system access', is_system: true, entity_id: null }
    ];

    const rolesMap = {};
    for (const r of defaultRoles) {
        const [role] = await Role.findOrCreate({
            where: { name: r.name, entity_id: null },
            defaults: r
        });
        rolesMap[r.name] = role.id;
    }

    // 2. Ensure ALL companies have default roles and statuses
    const allCompanies = await Entity.findAll({ where: { is_deleted: false } });
    for (const company of allCompanies) {
        // Migration: Rename existing 'STAFF' roles to 'L1' (any casing)
        await Role.update(
            { name: 'L1', description: 'Level 1 Manager' },
            {
                where: {
                    name: { [Op.like]: '%staff%' },
                    entity_id: company.id
                }
            }
        ).catch(() => {
            // Fallback for DBs that don't support iLike (like SQLite)
            return Role.update(
                { name: 'L1', description: 'Level 1 Manager' },
                { where: { name: 'STAFF', entity_id: company.id } }
            );
        });

        // Roles for this company
        const companyRoles = [
            { name: 'ADMIN', description: 'Company overall administrator', is_system: false, entity_id: company.id },
            { name: 'L1', description: 'Level 1 Manager', is_system: false, entity_id: company.id },
            { name: 'L2', description: 'Level 2 Supervisor', is_system: false, entity_id: company.id },
            { name: 'USER', description: 'Standard platform users', is_system: false, entity_id: company.id }
        ];
        for (const dr of companyRoles) {
            await Role.findOrCreate({
                where: { name: dr.name, entity_id: company.id },
                defaults: dr
            });
        }

        // Statuses for this company
        const statuses = [
            { name: 'New Lead', color: '#10B981', entity_id: company.id },
            { name: 'In Progress', color: '#3B82F6', entity_id: company.id },
            { name: 'Following Up', color: '#F59E0B', entity_id: company.id },
            { name: 'Lost', color: '#EF4444', entity_id: company.id }
        ];
        for (const ds of statuses) {
            await Status.findOrCreate({
                where: { name: ds.name, entity_id: company.id },
                defaults: ds
            });
        }
    }

    // 3. Create/Update System Super Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [user, created] = await User.findOrCreate({
        where: { email: 'admin@test.com' },
        defaults: {
            name: 'System Super Admin',
            role_id: rolesMap['SUPERADMIN'],
            password: hashedPassword,
            entity_id: null
        }
    });

    if (!created) {
        if (!user.password) user.password = hashedPassword;
        user.role_id = rolesMap['SUPERADMIN'];
        user.entity_id = null; // Ensure Super Admin is global
        await user.save();
    }
    console.log(`✅ Initialization complete. Verified ${allCompanies.length} companies.`);
};

sequelize.authenticate().then(async () => {
    console.log('✅ Database connected and synced');
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log('\n******************************************');
        console.log(`🚀 IMANIYA KAVALAI SERVER STARTING AT: ${new Date().toISOString()}`);
        console.log(`Backend running on http://localhost:${PORT}`);
        console.log('******************************************\n');
        console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
    });
}).catch(err => {
    console.error('❌ Database connection failed:', err);
});

module.exports = app;
