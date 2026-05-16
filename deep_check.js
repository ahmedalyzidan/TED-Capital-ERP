const pool = require('./backend/config/db');

async function check() {
    try {
        const inv = await pool.query('SELECT * FROM inventory_items');
        console.log('Inventory Items:', JSON.stringify(inv.rows, null, 2));
        
        const intel = await pool.query(`
            SELECT 
                COALESCE(project_name, 'General') as name,
                SUM(remaining_qty * buy_price) as value
            FROM inventory_items
            WHERE remaining_qty > 0
            GROUP BY project_name
            ORDER BY value DESC
        `);
        console.log('Valuation by Project:', JSON.stringify(intel.rows, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
