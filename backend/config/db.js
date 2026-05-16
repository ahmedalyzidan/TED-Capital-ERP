const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env from project root or backend folder
const envPath = fs.existsSync(path.join(__dirname, '../../.env')) 
    ? path.join(__dirname, '../../.env') 
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

const isProduction = process.env.NODE_ENV === 'production';

// 🌟 Enterprise DB Logic: Exclusively using the Local Docker DB (db) for maximum security and performance.
const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'erp_db', 
    password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
    port: process.env.DB_PORT || 5432,
    max: 50, // Higher concurrency for Elite scale
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000 // Force kill slow queries to prevent server hang
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('🔥 Unexpected Database Error:', err.message);
});

pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('🔥 Database Connection Failed:', err.message);
    } else {
        console.log(`✅ Connected to Hetzner Local (Docker) PostgreSQL DB`);
    }
});

module.exports = pool;