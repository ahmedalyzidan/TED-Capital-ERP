const pool = require('./backend/config/db');

async function migrateCRM() {
    try {
        console.log("🚀 Migrating CRM Module to Enterprise Grade...");

        // 1. Leads Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS crm_leads (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(255),
                contact_person VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                source VARCHAR(100), -- Web, Referral, LinkedIn, Cold Call
                status VARCHAR(50) DEFAULT 'New', -- New, Contacted, Qualified, Lost
                assigned_to VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Opportunities (Sales Funnel)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS crm_opportunities (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                expected_value NUMERIC(15,2),
                probability INTEGER CHECK (probability BETWEEN 0 AND 100),
                stage VARCHAR(50) DEFAULT 'Qualification', -- Qualification, Proposal, Negotiation, Won, Lost
                expected_closing_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Customer Interactions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS crm_interactions (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
                type VARCHAR(50), -- Call, Email, Meeting, Note
                notes TEXT,
                interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100)
            )
        `);

        console.log("✅ CRM Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateCRM();
