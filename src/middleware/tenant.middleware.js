/**
 * Tenant middleware to ensure multitenancy safety.
 * It ensures that every database operation is scoped to the user's entity.
 * 
 * Logic is now dynamic based on the presence of entity_id:
 * - If user.entity_id is NULL: User is a System-level user (Super Admin).
 * - If user.entity_id has a value: User is a Tenant-level user (Admin/Staff/etc).
 */
exports.scopeToTenant = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // SYSTEM-LEVEL USERS (No company link)
    if (req.user.entity_id === null || req.user.entity_id === undefined) {
        const contextHeader = req.headers['x-company-context'];
        const targetId = contextHeader || req.query.entityId || req.body.entity_id;

        if (targetId && targetId !== 'null' && targetId !== 'undefined') {
            console.log(`[TENANT] SuperAdmin context identified: ${targetId}`);
            req.tenantFilter = { entity_id: targetId };
            req.user.activeEntityId = targetId;
        } else {
            console.log(`[TENANT] SuperAdmin in GLOBAL view`);
            req.tenantFilter = {}; // NOT scoped - see EVERYTHING
            req.user.activeEntityId = null;
        }
        return next();
    }

    // TENANT-LEVEL USERS (Linked to a company)
    // They are strictly locked to their own entity_id
    req.tenantFilter = { entity_id: req.user.entity_id };
    req.user.activeEntityId = req.user.entity_id;

    next();
};
