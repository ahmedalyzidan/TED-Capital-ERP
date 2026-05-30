const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');

// 1. Load .env config
const envPath = fs.existsSync(path.join(__dirname, '../../.env')) 
    ? path.join(__dirname, '../../.env') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

const isProduction = process.env.NODE_ENV === 'production';

// Base PostgreSQL configuration
const baseConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
    port: process.env.DB_PORT || 5432,
    max: 20, // Concurrency limit per tenant pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000
};

// 2. Central/Default Connection Pool
const centralDatabaseName = process.env.DB_DATABASE || process.env.DB_NAME || 'erp_ted_capital';
const centralPool = new Pool({ ...baseConfig, database: centralDatabaseName });

centralPool.on('error', (err) => {
    console.error('🔥 Central Database Pool Error:', err.message);
});

// Cache for tenant connection pools
const tenantPools = {};
const tenantStorage = new AsyncLocalStorage();

// In-memory cache: company name (lowercase) → db_name
const companyDbCache = new Map();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function refreshCompanyCache() {
    try {
        const res = await centralPool.query('SELECT name, db_name FROM companies WHERE is_active = TRUE');
        companyDbCache.clear();
        for (const row of res.rows) {
            companyDbCache.set(row.name.trim().toLowerCase(), row.db_name);
        }
        cacheLoadedAt = Date.now();
    } catch (err) {
        // DB may not have the table yet on first boot — use hardcoded fallback silently
    }
}

// Hardcoded fallback in case DB lookup fails
const HARDCODED_MAP = {
    'ted capital': 'erp_ted_capital',
    'تيد كابيتال': 'erp_ted_capital',
    'design concept': 'erp_design_concept',
    'ديزاين كونسبت': 'erp_design_concept',
    'ديزاين كونسيبت': 'erp_design_concept',
    'primemed pharma': 'erp_primemed_pharma',
    'برايم ميد': 'erp_primemed_pharma',
    'برايمميد': 'erp_primemed_pharma',
    'master builder': 'erp_master_builder',
    'ماستر بيلدر': 'erp_master_builder',
};

// Normalize company names to safe database names
function normalizeCompanyName(name) {
    if (!name) return centralDatabaseName;
    const key = name.trim().toLowerCase();

    // 1. Check live cache
    if (companyDbCache.size > 0 && companyDbCache.has(key)) {
        return companyDbCache.get(key);
    }

    // 2. Check hardcoded fallback
    if (HARDCODED_MAP[key]) return HARDCODED_MAP[key];

    // 3. Refresh cache asynchronously (non-blocking) if stale
    if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
        refreshCompanyCache().catch(() => {});
    }

    // 4. Generic fallback: erp_<sanitized_name>
    return 'erp_' + key.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

// Pre-warm cache on startup
setTimeout(() => refreshCompanyCache(), 2000);


// Helper to get or create connection pool for a company
function getOrCreatePool(companyName) {
    const dbName = normalizeCompanyName(companyName);
    
    if (dbName === centralDatabaseName) {
        return centralPool;
    }

    if (tenantPools[dbName]) {
        return tenantPools[dbName];
    }

    console.log(`📡 Creating connection pool for tenant database: ${dbName} (Company: "${companyName}")`);
    
    const pool = new Pool({
        ...baseConfig,
        database: dbName
    });

    pool.on('error', (err) => {
        console.error(`🔥 Database Pool Error for ${dbName}:`, err.message);
    });

    tenantPools[dbName] = pool;
    return pool;
}

const targetProps = {
    tenantStorage,
    getOrCreatePool,
    centralPool,
    refreshCompanyCache,
    normalizeCompanyName
};

const poolProxy = new Proxy(targetProps, {
    get(target, prop) {
        // If property exists directly on the target object (our helpers), return it
        if (prop in target) {
            return target[prop];
        }

        // Resolve the active pool from AsyncLocalStorage context, fallback to centralPool
        const activePool = tenantStorage.getStore() || centralPool;

        // Bind functions to the resolved pool to preserve context
        if (typeof activePool[prop] === 'function') {
            return activePool[prop].bind(activePool);
        }
        return activePool[prop];
    }
});

module.exports = poolProxy;