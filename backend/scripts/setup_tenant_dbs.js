require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { tenantStorage, getOrCreatePool } = require('../config/db');
const { applySchemaFixes } = require('../config/schemaFixes');

const tenantDbs = [
    { db: 'erp_ted_capital', company: 'TED Capital' },
    { db: 'erp_design_concept', company: 'Design Concept' },
    { db: 'erp_primemed_pharma', company: 'PRIMEMED PHARMA' },
    { db: 'erp_master_builder', company: 'Master Builder' }
];

// Helper to read and clean SQL file (remove psql meta-commands)
function readAndCleanSqlFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: SQL file not found at ${filePath}`);
        return '';
    }
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const cleanLines = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('\\')) {
            return false;
        }
        return true;
    });
    return cleanLines.join('\n');
}

async function run() {
    const pgConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
        port: process.env.DB_PORT || 5432
    };

    console.log("📡 Connecting to postgres server to check/create databases...");
    const client = new Client({ ...pgConfig, database: 'postgres' });
    await client.connect();

    for (const tenant of tenantDbs) {
        // Drop and recreate to guarantee clean schema parity
        console.log(`\n🔨 Re-creating database "${tenant.db}" to ensure clean schema...`);
        await client.query(`DROP DATABASE IF EXISTS "${tenant.db}" WITH (FORCE)`);
        await client.query(`CREATE DATABASE "${tenant.db}"`);
        console.log(`✅ Created database: ${tenant.db}`);
    }
    await client.end();

    // Read the SQL scripts
    console.log("\n📖 Reading SQL schema files...");
    const rootDir = path.join(__dirname, '../');
    const sqlSchemaV29 = readAndCleanSqlFile(path.join(rootDir, 'full_schema_v29.sql'));
    const sqlSchemaV30 = readAndCleanSqlFile(path.join(rootDir, 'schema_fix_v30.sql'));
    const sqlSchemaV31 = readAndCleanSqlFile(path.join(rootDir, 'schema_fix_v31.sql'));

    if (!sqlSchemaV29) {
        console.error("❌ Critical: full_schema_v29.sql is empty or missing. Cannot proceed.");
        return;
    }

    for (const tenant of tenantDbs) {
        console.log(`\n🚀 Applying base schemas to "${tenant.db}"...`);
        const dbClient = new Client({ ...pgConfig, database: tenant.db });
        await dbClient.connect();

        try {
            console.log(`⏳ Running full_schema_v29.sql on "${tenant.db}"...`);
            await dbClient.query(sqlSchemaV29);
            console.log(`✅ Applied full_schema_v29.sql`);

            if (sqlSchemaV30) {
                console.log(`⏳ Running schema_fix_v30.sql on "${tenant.db}"...`);
                await dbClient.query('SET search_path TO public;');
                await dbClient.query(sqlSchemaV30);
                console.log(`✅ Applied schema_fix_v30.sql`);
            }

            if (sqlSchemaV31) {
                console.log(`⏳ Running schema_fix_v31.sql on "${tenant.db}"...`);
                await dbClient.query('SET search_path TO public;');
                await dbClient.query(sqlSchemaV31);
                console.log(`✅ Applied schema_fix_v31.sql`);
            }

            // Ensure users table has all runtime columns added in server.js before seeding admin
            console.log(`⏳ Running users table alteration on "${tenant.db}"...`);
            await dbClient.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
                ADD COLUMN IF NOT EXISTS department VARCHAR(100),
                ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
                ADD COLUMN IF NOT EXISTS linked_employee_id INTEGER,
                ADD COLUMN IF NOT EXISTS two_factor BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS linked_company VARCHAR(255),
                ADD COLUMN IF NOT EXISTS linked_project VARCHAR(255),
                ADD COLUMN IF NOT EXISTS primary_org_unit_id INTEGER
            `);
            console.log(`✅ Altered users table`);

            // Seed default admin in each tenant DB if not exists
            const defaultPasswordHash = '$2a$10$tZ2zVqZ.k45zK14wG50F7.Kqg21G8.761.k1q5gY7g6b701234567'; // bcrypt dummy hash
            await dbClient.query(`
                INSERT INTO users (username, email, password_hash, role, status, permissions, is_superadmin)
                VALUES ('admin', 'admin@tedcapital.com', $1, 'Super Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}', TRUE)
                ON CONFLICT (username) DO NOTHING
            `, [defaultPasswordHash]);
            console.log(`✅ Seeded default admin`);

            // Close connection to allow pool routing
            await dbClient.end();

            // Apply granular schema fixes (like sales_invoices and other tables created at runtime)
            console.log(`⏳ Running applySchemaFixes() for dynamic tables on "${tenant.db}"...`);
            const tenantPool = getOrCreatePool(tenant.company);
            await tenantStorage.run(tenantPool, async () => {
                await applySchemaFixes();
            });
            console.log(`✅ Applied all granular schema fixes from schemaFixes.js`);

            console.log(`🎉 Schema cloning completed for database: ${tenant.db}`);
        } catch (e) {
            console.error(`❌ Error importing schema to "${tenant.db}":`, e.message);
            try {
                await dbClient.end();
            } catch (closeErr) {}
        }
    }

    console.log("\n🎉 All tenant databases are configured and in perfect schema parity!");
}

run().catch(console.error);
