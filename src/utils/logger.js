const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'app.log');

const logger = {
    info: (message) => {
        const timestamp = new Date().toISOString();
        const log = `[${timestamp}] INFO: ${message}\n`;
        fs.appendFileSync(logFile, log);
        console.log(log.trim());
    },
    error: (message, stack = '') => {
        const timestamp = new Date().toISOString();
        const log = `[${timestamp}] ERROR: ${message}\n${stack ? stack + '\n' : ''}`;
        fs.appendFileSync(logFile, log);
        console.error(log.trim());
    },
    request: (req, res, next) => {
        const timestamp = new Date().toISOString();
        const { method, url, ip } = req;

        res.on('finish', () => {
            const log = `[${timestamp}] ${method} ${url} - ${res.statusCode} - ${ip}\n`;
            fs.appendFileSync(logFile, log);
            console.log(log.trim());
        });
        next();
    }
};

module.exports = logger;
