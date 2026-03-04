const rateLimit = {};

/**
 * Simple in-memory rate limiter to prevent brute force.
 * @param {Object} options - { windowMs, max, message }
 */
const simpleRateLimiter = (options) => {
    const { windowMs, max, message } = options;

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();

        if (!rateLimit[ip]) {
            rateLimit[ip] = { count: 1, firstRequest: now };
            return next();
        }

        const diff = now - rateLimit[ip].firstRequest;

        if (diff > windowMs) {
            // Reset window
            rateLimit[ip] = { count: 1, firstRequest: now };
            return next();
        }

        rateLimit[ip].count++;

        if (rateLimit[ip].count > max) {
            console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip}`);
            return res.status(429).json({
                message: message || 'Too many requests, please try again later.'
            });
        }

        next();
    };
};

module.exports = simpleRateLimiter;
