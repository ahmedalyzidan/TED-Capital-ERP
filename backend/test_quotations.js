const pool = require('./config/db');

async function test() {
  try {
    const { rows } = await pool.query('SELECT * FROM sales_quotations LIMIT 5');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

test();
