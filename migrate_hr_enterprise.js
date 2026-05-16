const pool = require('./backend/config/db');

async function migrateHR() {
    try {
        console.log("🚀 Migrating HR Module to Enterprise Grade...");

        // 1. Leave Requests
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leave_requests (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
                leave_type VARCHAR(50) NOT NULL, -- Annual, Sick, Casual, Unpaid
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days NUMERIC(4,1),
                reason TEXT,
                status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
                approved_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Performance Reviews
        await pool.query(`
            CREATE TABLE IF NOT EXISTS performance_reviews (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
                reviewer_id INTEGER REFERENCES staff(id),
                review_period VARCHAR(50), -- Q1 2024, Annual 2023
                technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
                soft_skills_score INTEGER CHECK (soft_skills_score BETWEEN 1 AND 5),
                overall_rating TEXT,
                manager_comments TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Employee Documents (Digital Archive)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_documents (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
                doc_type VARCHAR(100), -- ID Card, Passport, Contract, Diploma
                doc_path TEXT NOT NULL,
                expiry_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Add Leave Balance to Staff
        await pool.query("ALTER TABLE staff ADD COLUMN IF NOT EXISTS leave_balance NUMERIC(4,1) DEFAULT 21");

        console.log("✅ HR Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateHR();
