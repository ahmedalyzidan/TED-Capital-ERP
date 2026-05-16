const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'erp_db',
    password: process.env.DB_PASS || '1985',
    port: process.env.DB_PORT || 5432,
});

async function seed() {
    console.log("🚀 Seeding default system parameters and metadata...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Default Projects (to provide initial companies)
        const projects = [
            ['General Workspace', 'TED Capital', 'P-001', 'Active'],
            ['Interior Design Project', 'Design Concept', 'P-002', 'Active']
        ];
        for (let p of projects) {
            await client.query(
                "INSERT INTO projects (name, company, project_serial, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                p
            );
        }

        // 2. System Parameters
        const params = [
            ['Unit', 'Pcs'],
            ['Unit', 'Box'],
            ['Unit', 'Kg'],
            ['Unit', 'Mtr'],
            ['Company', 'TED Capital'],
            ['Company', 'Design Concept'],
            ['Project', 'General Workspace'],
            ['Currency', 'EGP'],
            ['Currency', 'USD']
        ];
        for (let param of params) {
            await client.query(
                "INSERT INTO system_parameters (category, value) SELECT $1::text, $2::text WHERE NOT EXISTS (SELECT 1 FROM system_parameters WHERE category=$1::text AND value=$2::text)",
                param
            );
        }

        // 3. Ensure Admin User
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin', 10);
        await client.query(
            "INSERT INTO users (username, password_hash, role, status) SELECT 'admin', $1, 'Admin', 'Active' WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='admin')",
            [hash]
        );

        await client.query('COMMIT');
        console.log("✅ Seeding completed successfully.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Seeding failed:", e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
