const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_DATABASE || 'erp_db',
  password: process.env.DB_PASSWORD || '1985',
  port: process.env.DB_PORT || 5432,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

module.exports = {
  query,
  pool
};
