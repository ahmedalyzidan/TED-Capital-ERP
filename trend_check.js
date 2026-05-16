const pool = require('./backend/config/db');

async function check() {
    try {
        const sales = await pool.query('SELECT date, total_amount FROM inventory_sales');
        console.log('Sales Data:', JSON.stringify(sales.rows, null, 2));
        
        const trend = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', current_date) - interval '5 months',
                    date_trunc('month', current_date),
                    interval '1 month'
                )::date as month
            ),
            sales AS (
                SELECT date_trunc('month', date)::date as month, SUM(total_amount) as amount
                FROM inventory_sales
                GROUP BY 1
            )
            SELECT 
                to_char(m.month, 'Mon YYYY') as month_label,
                COALESCE(s.amount, 0) as sales
            FROM months m
            LEFT JOIN sales s ON m.month = s.month
            ORDER BY m.month ASC
        `);
        console.log('Trend Results:', JSON.stringify(trend.rows, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
