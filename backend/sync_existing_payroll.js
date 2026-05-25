const pool = require('./config/db');

async function syncPayroll() {
    console.log("🔄 Starting Retroactive Payroll Expense Sync...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch all payroll entries along with staff details
        const payrollRes = await client.query(`
            SELECT p.*, s.name as staff_name, s.company as staff_company, s.company_id as staff_company_id
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            ORDER BY p.id ASC
        `);
        
        console.log(`Found ${payrollRes.rows.length} existing payroll records.`);

        for (const pay of payrollRes.rows) {
            const amountVal = parseFloat(pay.basic_salary || 0) + parseFloat(pay.incentives || 0) + parseFloat(pay.commissions || 0);
            
            if (amountVal <= 0) continue;

            const [month, year] = (pay.period || "").split('-');

            if (pay.project_name === 'General' || pay.project_name === 'general') {
                // Fetch active in-progress projects at the time of sync
                const activeProjectsRes = await client.query("SELECT id, name FROM projects WHERE status = 'In Progress'");
                const activeProjects = activeProjectsRes.rows;
                if (activeProjects.length > 0) {
                    const distributedAmount = amountVal / activeProjects.length;
                    for (const activeProj of activeProjects) {
                        // Check if already synced
                        const checkRes = await client.query(
                            "SELECT id FROM expenses WHERE project_id = $1 AND payment_method = 'Payroll' AND description LIKE $2",
                            [activeProj.id, `%راتب الموظف ${pay.staff_name} لشهر ${month}-${year}%`]
                        );
                        if (checkRes.rows.length === 0) {
                            await client.query(
                                `INSERT INTO expenses (description, amount, currency, category_id, project_id, expense_date, payment_method, supplier_name, status, company_entity, company_id, metadata)
                                 VALUES ($1, $2, 'EGP', 3, $3, CURRENT_DATE, 'Payroll', $4, 'Approved', $5, $6, $7)`,
                                [
                                    `توزيع مصاريف إدارية (راتب الموظف ${pay.staff_name} لشهر ${month}-${year})`,
                                    distributedAmount,
                                    activeProj.id,
                                    pay.staff_name,
                                    pay.staff_company || 'TED Capital',
                                    pay.staff_company_id || 1,
                                    JSON.stringify({
                                        category: 'مصاريف رواتب وأجور',
                                        unit: 'شهر',
                                        qty: 1,
                                        rate: distributedAmount,
                                        allocationType: 'general_distribution',
                                        beneficiary: pay.staff_name,
                                        retroactive: true
                                    })
                                ]
                            );
                        }
                    }
                }
            } else {
                // Specific project
                const projRes = await client.query("SELECT id FROM projects WHERE name = $1 LIMIT 1", [pay.project_name]);
                if (projRes.rows.length > 0) {
                    const projId = projRes.rows[0].id;
                    
                    // Check if already synced
                    const checkRes = await client.query(
                        "SELECT id FROM expenses WHERE project_id = $1 AND payment_method = 'Payroll' AND description LIKE $2",
                        [projId, `%الموظف ${pay.staff_name} لشهر ${pay.period}%`]
                    );
                    if (checkRes.rows.length === 0) {
                        await client.query(
                            `INSERT INTO expenses (description, amount, currency, category_id, project_id, expense_date, payment_method, supplier_name, status, company_entity, company_id, metadata)
                             VALUES ($1, $2, 'EGP', 3, $3, CURRENT_DATE, 'Payroll', $4, 'Approved', $5, $6, $7)`,
                            [
                                `رواتب وأجور - الموظف ${pay.staff_name} لشهر ${pay.period}`,
                                amountVal,
                                projId,
                                pay.staff_name,
                                pay.staff_company || 'TED Capital',
                                pay.staff_company_id || 1,
                                JSON.stringify({
                                    category: 'مصاريف رواتب وأجور',
                                    unit: 'شهر',
                                    qty: 1,
                                    rate: amountVal,
                                    allocationType: 'project',
                                    beneficiary: pay.staff_name,
                                    retroactive: true
                                })
                            ]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log("✅ Retroactive Payroll Expense Sync Completed successfully!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Sync Failed:", e);
    } finally {
        client.release();
    }
}

syncPayroll();
