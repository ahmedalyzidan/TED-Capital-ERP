const { tenantStorage, getOrCreatePool } = require('../config/db');

const tenantContextMiddleware = (req, res, next) => {
    // 0. Force central/default database for authentication and public endpoints
    const path = (req.path || '').toLowerCase();
    const originalUrl = (req.originalUrl || '').toLowerCase();
    if (
        path === '/login' ||
        path === '/refresh' ||
        path === '/health' ||
        path.startsWith('/public/') ||
        originalUrl.includes('/login') ||
        originalUrl.includes('/refresh') ||
        originalUrl.includes('/health') ||
        originalUrl.includes('/public/')
    ) {
        return tenantStorage.run(null, () => {
            next();
        });
    }

    // 1. Identify company from header, query, or JWT claims
    let companyName = req.headers['x-selected-company'] || req.query.company || (req.user && req.user.linkedCompany) || '';

    // If company is empty, "all", or "كل الشركات", route to central/default database
    const centralNames = ['all', 'all companies', 'كل الشركات', ''];
    const isCentral = centralNames.includes(companyName.trim().toLowerCase());

    if (isCentral) {
        // Run with central/default pool (null tenant)
        return tenantStorage.run(null, () => {
            next();
        });
    }

    try {
        // Get or create pool for this specific company
        const tenantPool = getOrCreatePool(companyName);
        
        // Execute request inside the AsyncLocalStorage context for this pool
        tenantStorage.run(tenantPool, () => {
            req.tenantPool = tenantPool;
            next();
        });
    } catch (err) {
        console.error(`🔥 Failed to route request to company database (${companyName}):`, err.message);
        res.status(500).json({ error: `Database routing error: ${err.message}` });
    }
};

module.exports = tenantContextMiddleware;
