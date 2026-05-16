const pool = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        const mpo = 'MPO-404519';
        console.log('1: Fetch POs');
        const posRes = await client.query('SELECT * FROM purchase_orders WHERE (master_po_no = $1 OR id::text = $1) AND is_deleted = false', [mpo]);
        const poIds = posRes.rows.map(p => p.id);
        
        console.log('2: Fetch Deposits');
        await client.query('SELECT * FROM ledger WHERE (description ILIKE $1 OR reference_no ILIKE $1) AND is_deleted = false', [`%${mpo}%`]);
        
        console.log('3: Fetch DDP');
        // Fallback for poIds being empty
        const safePoIds = poIds.length > 0 ? poIds : [-1];
        await client.query('SELECT d.*, po.master_po_no FROM po_ddp_lcy_charges d LEFT JOIN purchase_orders po ON d.po_id = po.id WHERE d.po_id = ANY($1) OR po.master_po_no = $2', [safePoIds, mpo]);
        
        console.log('4: Fetch Stock');
        const stockRes = await client.query('SELECT * FROM inventory_items WHERE po_id = ANY($1)', [safePoIds]);
        const stockIds = stockRes.rows.map(s => s.id);
        
        console.log('5: Fetch Sales & Bookings');
        if (stockIds.length > 0) {
            await client.query('SELECT * FROM inventory_sales WHERE inventory_id = ANY($1) AND is_deleted = false', [stockIds]);
            await client.query('SELECT * FROM inventory_bookings WHERE inventory_id = ANY($1) AND is_deleted = false', [stockIds]);
        }
        
        console.log('6: Fetch Client Txns');
        const txnsRes = await client.query("SELECT * FROM ledger WHERE (account_name = ANY($1) OR description ILIKE ANY($2)) AND credit > 0 AND is_deleted = false ORDER BY created_at DESC LIMIT 50", [['test'], ['%test%']]);
        
        console.log('7: Fetch Audit Logs');
        await client.query('SELECT * FROM audit_logs WHERE record_id = ANY($1) OR details ILIKE $2', [safePoIds, `%${mpo}%`]);
        
        console.log('Done: No SQL Errors!');
    } catch(e) {
        console.error('SQL ERROR:', e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
