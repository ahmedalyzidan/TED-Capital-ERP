const pool = require('./backend/config/db');

async function check() {
    try {
        const inv = await pool.query('SELECT COUNT(*) FROM inventory_items');
        const sales = await pool.query('SELECT COUNT(*) FROM inventory_sales');
        const po = await pool.query('SELECT COUNT(*) FROM purchase_orders');
        
        console.log('Inventory Items:', inv.rows[0].count);
        console.log('Inventory Sales:', sales.rows[0].count);
        console.log('Purchase Orders:', po.rows[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
