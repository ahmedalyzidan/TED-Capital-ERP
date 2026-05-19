require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./backend/config/db');

async function run() {
    try {
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'projects'
        `);
        console.log("COLUMNS:");
        console.log(columns.rows);

        const data = await pool.query("SELECT * FROM projects LIMIT 5");
        console.log("DATA:");
        console.log(JSON.stringify(data.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
