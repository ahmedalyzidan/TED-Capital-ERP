const pool = require('./config/db');

async function check() {
    try {
        const res = await pool.query(`SELECT * FROM information_schema.views WHERE view_definition ILIKE '%sales_history%'`);
        console.log("VIEWS with sales_history:", res.rows.map(r => r.table_name));

        const res2 = await pool.query(`SELECT * FROM information_schema.triggers WHERE trigger_name ILIKE '%sales%' OR event_object_table ILIKE '%sales%'`);
        console.log("TRIGGERS:", res2.rows.map(r => ({ name: r.trigger_name, table: r.event_object_table })));

        const res3 = await pool.query(`SELECT * FROM information_schema.routines WHERE routine_definition ILIKE '%sales_history%'`);
        console.log("ROUTINES with sales_history:", res3.rows.map(r => r.routine_name));
    } catch(e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit();
    }
}
check();
