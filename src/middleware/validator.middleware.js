const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator errors.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn(`[VALIDATION] Refused request to ${req.url} - Errors:`, errors.array());
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
    }
    next();
};

module.exports = { validate };
