const pool = require('./backend/config/db');

async function test() {
    try {
        const stats = {};
        
        const valuationByProject = await pool.query(`
            SELECT 
                COALESCE(project_name, 'General') as name,
                SUM(remaining_qty * buy_price) as value
            FROM inventory_items
            WHERE remaining_qty > 0
            GROUP BY project_name
            ORDER BY value DESC
        `);
        stats.valuationByProject = valuationByProject.rows;

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
            ),
            purchases AS (
                SELECT date_trunc('month', created_at)::date as month, SUM(qty * estimated_cost * fx_rate) as amount
                FROM purchase_orders
                GROUP BY 1
            )
            SELECT 
                to_char(m.month, 'Mon YYYY') as month_label,
                COALESCE(s.amount, 0) as sales,
                COALESCE(p.amount, 0) as purchases
            FROM months m
            LEFT JOIN sales s ON m.month = s.month
            LEFT JOIN purchases p ON m.month = p.month
            ORDER BY m.month ASC
        `);
        stats.trend = trend.rows;

        console.log('SUCCESS! Result:', JSON.stringify(stats, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('FAILED! Error:', err.message);
        process.exit(1);
    }
}

test();
