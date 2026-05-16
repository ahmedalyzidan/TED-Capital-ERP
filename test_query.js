
const pool = require('./backend/config/db');
async function test() {
    try {
        const queryStr = `SELECT p.*, 
            (SELECT COUNT(*) FROM partners WHERE project_name = p.name AND (partner_type = 'Partner' OR partner_type = 'Both')) AS partners_count,
            (SELECT COUNT(*) FROM partners WHERE project_name = p.name AND (partner_type = 'Admin' OR partner_type = 'Both')) AS admins_count,
            COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Capital Injection'), 0) AS deposits,
            COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Withdrawal'), 0) AS withdrawals,
            (p.budget - COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Capital Injection'), 0)) AS remaining_budget
            FROM projects p ORDER BY p.id DESC LIMIT 100 OFFSET 0`;
        const res = await pool.query(queryStr);
        console.log('COUNT:', res.rows.length);
        if (res.rows.length > 0) {
            console.log('FIRST PROJECT:', res.rows[0].name);
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        process.exit(0);
    }
}
test();
