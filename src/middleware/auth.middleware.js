const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
    console.log('--- [AUTH] verifyToken reached for:', req.url);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, entity_id }
        console.log('[AUTH] Token valid:', req.user.email);
        next();
    } catch (err) {
        console.error('[AUTH] Token verification failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ message: 'Invalid token' });
    }
};

/**
 * Check if the user is a System-level user (not tied to any specific entity)
 * This replaces the "Super Admin" role check with data-driven logic.
 */
exports.isSystemUser = (req, res, next) => {
    // If entity_id exists (is truthy), it means they belong to a company and should be blocked.
    if (req.user.entity_id) {
        console.log(`[ACL] Blocked non-system user ${req.user.email} from system route`);
        return res.status(403).json({ message: 'Operation restricted to system-level users' });
    }
    next();
};

/**
 * Check if the user is an Admin of their company or a System-level user.
 */
exports.isAdmin = (req, res, next) => {
    const userRole = req.user.role;
    const isSystem = !req.user.entity_id;

    if (isSystem || userRole === 'ADMIN') {
        return next();
    }

    return res.status(403).json({ message: 'Admin access required' });
};

/**
 * Check if user is L1/L2 or Admin (or System User)
 */
exports.isStaffOrAdmin = (req, res, next) => {
    const userRole = req.user.role;
    const isSystem = !req.user.entity_id;

    if (isSystem || userRole === 'ADMIN' || userRole === 'L1' || userRole === 'L2') {
        return next();
    }

    return res.status(403).json({ message: 'Management access required (Admin or L1)' });
};

/**
 * Validates role-based permissions for user management
 * - SuperAdmin: Can manage anyone.
 * - Admin: Can manage L1 and L2.
 * - L1: Can manage L2.
 */
exports.canManageUser = (targetRoleName) => {
    return (req, res, next) => {
        const currentUserRole = req.user.role;
        const isSystem = !req.user.entity_id;

        if (isSystem) return next();

        if (currentUserRole === 'ADMIN') {
            if (['L1', 'L2'].includes(targetRoleName)) return next();
        }

        if (currentUserRole === 'L1') {
            if (targetRoleName === 'L2') return next();
        }

        return res.status(403).json({ message: `Insufficient permissions: ${currentUserRole} cannot manage ${targetRoleName}` });
    };
};
