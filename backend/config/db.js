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
const centralDatabaseName = process.env.DB_DATABASE || process.env.DB_NAME || 'erp_db';
const centralPool = new Pool({ ...baseConfig, database: centralDatabaseName });

centralPool.on('error', (err) => {
    console.error('🔥 Central Database Pool Error:', err.message);
});

// Cache for tenant connection pools
const tenantPools = {};
const tenantStorage = new AsyncLocalStorage();

// Normalize company names to safe database names
function normalizeCompanyName(name) {
    if (!name) return centralDatabaseName;
    
    // Check common company translations/names
    const lowerName = name.trim().toLowerCase();
    if (lowerName.includes('ted capital') || lowerName.includes('تيد كابيتال')) {
        return 'erp_ted_capital';
    }
    if (lowerName.includes('design concept') || lowerName.includes('ديزاين كونسبت') || lowerName.includes('ديزاين كونسيبت')) {
        return 'erp_design_concept';
    }
    if (lowerName.includes('primemed pharma') || lowerName.includes('برايم ميد') || lowerName.includes('برايمميد')) {
        return 'erp_primemed_pharma';
    }
    if (lowerName.includes('master builder') || lowerName.includes('ماستر بيلدر')) {
        return 'erp_master_builder';
    }

    // Fallback: convert non-standard names to database-friendly names
    return 'erp_' + lowerName.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

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
    centralPool
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