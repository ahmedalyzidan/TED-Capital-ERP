const pool = require('./config/db');

async function inspect() {
  try {
    const res = await pool.query("SELECT id, invoice_number, items FROM sales_invoices ORDER BY id DESC LIMIT 10");
    console.log("LAST 10 INVOICES:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

inspect();
