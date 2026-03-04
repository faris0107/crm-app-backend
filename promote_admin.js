const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const email = process.argv[2] || 'superadmin@test.com';
const password = process.argv[3] || 'superadmin123';

async function setupSystemUser() {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Find or create a user who is NOT linked to any entity
        const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                name: 'System Administrator',
                password: hashedPassword,
                role: 'ADMIN', // Role still exists but entity_id will be null
                entity_id: null,
                active: true
            }
        });

        if (!created) {
            // If user exists, ensure entity_id is NULL to give them system-wide access
            await user.update({
                entity_id: null,
                password: hashedPassword
            });
            console.log(`✅ User ${email} has been promoted to System Administrator (NULL entity_id)`);
        } else {
            console.log(`🚀 New System Administrator created: ${email}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up system user:', error.message);
        process.exit(1);
    }
}

setupSystemUser();
