require('dotenv').config();
const sequelize = require('./src/config/db.config');

async function checkAndDrop() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        const dropConstraints = async (tableName) => {
            const [indexes] = await sequelize.query(`SHOW INDEX FROM ${tableName} WHERE Key_name != 'PRIMARY'`);
            for (let idx of indexes) {
                if (idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY') {
                    console.log(`Dropping unique index ${idx.Key_name} from ${tableName}`);
                    try {
                        await sequelize.query(`ALTER TABLE ${tableName} DROP INDEX ${idx.Key_name}`);
                        console.log('Success');
                    } catch(e) {
                         console.log('Error dropping index', e.message);
                    }
                }
            }
        };

        await dropConstraints('Users');
        await dropConstraints('People');
        
        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkAndDrop();
