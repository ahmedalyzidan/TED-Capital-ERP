const pool = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        const mpo = 'MPO-404519';
        console.log('1. Fetch POs');
        const posRes = await client.query("SELECT * FROM purchase_orders WHERE (master_po_no = $1 OR id::text = $1) AND is_deleted = false", [mpo]);
        const pos = posRes.rows;
        const poIds = pos.map(p => p.id);
        console.log('POs found:', pos.length, poIds);
        
        if (pos.length === 0) {
            console.log('Early return: no POs');
            return;
        }

        console.log('2. Fetch Deposits');
        const depositsRes = await client.query("SELECT * FROM ledger WHERE (description ILIKE $1 OR reference_no ILIKE $1) AND is_deleted = false", [`%${mpo}%`]);
        console.log('Deposits found:', depositsRes.rows.length);

        console.log('3. Fetch DDP');
        const ddpRes = await client.query("SELECT * FROM po_expenses WHERE po_id = ANY($1) OR master_po_no = $2", [poIds, mpo]);
        console.log('DDP found:', ddpRes.rows.length);

        console.log('4. Fetch Stock Items');
        const stockRes = await client.query("SELECT * FROM inventory_items WHERE po_id = ANY($1)", [poIds]);
        const stock = stockRes.rows;
        const stockIds = stock.map(s => s.id);
        console.log('Stock found:', stock.length, stockIds);
        
        let sales = [];
        let bookings = [];
        if (stockIds.length > 0) {
            console.log('5a. Fetch Sales');
            const salesRes = await client.query("SELECT * FROM inventory_sales WHERE inventory_id = ANY($1) AND is_deleted = false", [stockIds]);
            sales = salesRes.rows;
            console.log('Sales found:', sales.length);

            console.log('5b. Fetch Bookings');
            const bookRes = await client.query("SELECT * FROM inventory_bookings WHERE inventory_id = ANY($1) AND is_deleted = false", [stockIds]);
            bookings = bookRes.rows;
            console.log('Bookings found:', bookings.length);
        }

        console.log('6. Fetch Client Txns');
        const clientNames = [...new Set(sales.map(s => s.customer_name).concat(bookings.map(b => b.customer_name)))].filter(Boolean);
        console.log('Client names:', clientNames);
        if (clientNames.length > 0) {
            const txnsRes = await client.query(
                "SELECT * FROM ledger WHERE (account_name = ANY($1) OR description ILIKE ANY($2)) AND credit > 0 AND is_deleted = false ORDER BY created_at DESC LIMIT 50", 
                [clientNames, clientNames.map(n => `%${n}%`)]
            );
            console.log('Client txns found:', txnsRes.rows.length);
        }

        console.log('7. Audit Logs');
        const auditRes = await client.query("SELECT * FROM audit_logs WHERE record_id = ANY($1) OR details ILIKE $2 ORDER BY created_at DESC LIMIT 30", [poIds, `%${mpo}%`]);
        console.log('Audits found:', auditRes.rows.length);

        console.log('Done successfully!');
    } catch (err) {
        console.error("MPO 360 Error:", err);
    } finally {
        client.release();
        process.exit();
    }
}
run();
