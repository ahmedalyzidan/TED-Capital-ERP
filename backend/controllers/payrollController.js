const pool = require('../config/db');
const { logAdvancedAudit } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');

const grantAdvance = async (req, res) => {
    const { staff_id, amount, deduction_per_month, request_date, repayment_method } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';

        // Check if staff exists
        const staffRes = await client.query("SELECT * FROM staff WHERE id = $1", [staff_id]);
        if (staffRes.rows.length === 0) throw new Error("الموظف غير موجود.");
        const staffName = staffRes.rows[0].name;

        await client.query(`
            INSERT INTO staff_advances (staff_id, amount, deduction_per_month, remaining_balance, status, request_date, repayment_method)
            VALUES ($1, $2, $3, $2, 'Approved', $4, $5)
        `, [staff_id, amount, deduction_per_month, request_date || new Date(), repayment_method || 'Payroll Deduction']);

        // Accounting: Debit Advance Receivable, Credit Cash/Bank
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: 'سلف العاملين / ذمم موظفين',
            creditAccount: 'النقدية بالصندوق / البنوك',
            amount: parseFloat(amount),
            costCenter: 'General',
            description: `منح سلفة للموظف ${staffName} - طريقة السداد: ${repayment_method}`,
            username: username
        });

        await client.query('COMMIT');
        res.json({ message: "تم تسجيل السلفة وتوليد القيود المحاسبية بنجاح." });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] POST /staff/advance:", error);
        res.status(500).json({ error: error.message || "حدث خطأ أثناء حفظ السلفة." });
    } finally {
        client.release();
    }
};

const processPayroll = async (req, res) => {
    const { 
        staffId, month, year, projects, 
        basic_salary, incentives, commissions, 
        expenses, profit_share, deductions, advance_deduction,
        category
    } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const username = req.user ? req.user.username : 'System';

        if (!hasAccess(req.user, 'payroll', 'create')) {
            throw new Error("Access Denied.");
        }

        const staffRes = await client.query("SELECT * FROM staff WHERE id = $1", [staffId]);
        if (staffRes.rows.length === 0) throw new Error("الموظف غير موجود.");
        const staff = staffRes.rows[0];

        const b = parseFloat(basic_salary || staff.salary || 0);
        const inc = parseFloat(incentives || 0);
        const manualCom = parseFloat(commissions || 0);
        const exp = parseFloat(expenses || 0);
        const prof = parseFloat(profit_share || 0);
        const ded = parseFloat(deductions || 0);
        const adv = parseFloat(advance_deduction || 0);

        // Fetch automated commissions
        const pendingCommRes = await client.query("SELECT id, amount FROM sales_commissions WHERE staff_id = $1 AND status = 'Pending'", [staffId]);
        let autoCommissions = 0;
        const commIds = [];
        for (let c of pendingCommRes.rows) {
            autoCommissions += parseFloat(c.amount);
            commIds.push(c.id);
        }

        const totalCommissions = manualCom + autoCommissions;
        
        // Total Gross Salary Expense (excluding auto-commissions as they are already expensed during sale)
        const grossSalaryExpense = b + inc + manualCom + exp + prof;
        
        // Total Net Amount to be paid to staff (including everything)
        const netAmount = grossSalaryExpense + autoCommissions - (ded + adv);

        const totalPercent = projects.reduce((sum, p) => sum + parseFloat(p.percent || 0), 0);
        if (totalPercent !== 100) {
            throw new Error("مجموع التوزيع على المشاريع يجب أن يكون 100%");
        }

        // Handle Advance Repayment
        if (adv > 0) {
            const advanceRes = await client.query("SELECT id, remaining_balance FROM staff_advances WHERE staff_id = $1 AND remaining_balance > 0 AND status = 'Approved' ORDER BY request_date ASC", [staffId]);
            let remainingAdvToDeduct = adv;
            
            for (let advRecord of advanceRes.rows) {
                if (remainingAdvToDeduct <= 0) break;
                let currentBal = parseFloat(advRecord.remaining_balance);
                let deductAmount = Math.min(currentBal, remainingAdvToDeduct);
                
                await client.query("UPDATE staff_advances SET remaining_balance = remaining_balance - $1 WHERE id = $2", [deductAmount, advRecord.id]);
                remainingAdvToDeduct -= deductAmount;
            }
            await client.query("UPDATE staff_advances SET status = 'Paid_Off' WHERE staff_id = $1 AND remaining_balance <= 0", [staffId]);
        }

        // Record Payroll for each project and generate corresponding accounting entries
        for (const p of projects) {
            const ratio = parseFloat(p.percent) / 100;
            
            // Distribute the gross salary expense and net amounts proportionally
            const projectGrossExpense = grossSalaryExpense * ratio;
            const projectAdvDeduction = adv * ratio;
            const projectNetExpensePayment = projectGrossExpense - (ded * ratio) - projectAdvDeduction;

            if (projectGrossExpense > 0) {
                await client.query(
                    "INSERT INTO payroll (staff_id, project_name, amount, period, basic_salary, incentives, commissions, deductions, advance_deduction, net_salary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                    [staffId, p.project_name, projectNetExpensePayment + (autoCommissions * ratio), `${month}-${year}`, b*ratio, inc*ratio, (manualCom + autoCommissions)*ratio, ded*ratio, projectAdvDeduction, projectNetExpensePayment + (autoCommissions * ratio)]
                );

                // Accounting Integration for this project:
                // 1. Debit Salary Expense (Gross)
                // 2. Credit Advance Receivable (if any adv was deducted)
                // 3. Credit Cash / Bank (Net Amount paid)
                // Note: The sum of Credits = Net + Adv + Deductions(if any liability, here we just treat ded as unaccrued expense reduction). 
                // To keep it simple and accurate, we debit the exact Net + Adv. If 'ded' is a penalty, it just reduces the gross.
                // Wait, gross - penalty is what the company actually incurs. Let's debit (projectNet + projectAdvDeduction).
                
                const incurredExpense = projectNetExpensePayment + projectAdvDeduction;

                // Step 1: Record Advance Deduction Return
                if (projectAdvDeduction > 0) {
                    await AccountingService.recordDoubleEntry(client, {
                        debitAccount: 'مصاريف رواتب وأجور',
                        creditAccount: 'سلف العاملين / ذمم موظفين',
                        amount: projectAdvDeduction,
                        costCenter: p.project_name,
                        description: `تسوية سلفة من راتب ${month}-${year} للموظف ${staff.name}`,
                        username: username
                    });
                }

                // Step 2: Record Cash Payment for the salary expense part
                if (projectNetExpensePayment > 0) {
                    await AccountingService.recordDoubleEntry(client, {
                        debitAccount: 'مصاريف رواتب وأجور',
                        creditAccount: 'النقدية بالصندوق / البنوك',
                        amount: projectNetExpensePayment,
                        costCenter: p.project_name,
                        description: `صرف صافي راتب ${month}-${year} للموظف ${staff.name}`,
                        username: username
                    });
                }

                // Actual Project Expenses Log Integration:
                if (p.project_name === 'General') {
                    const activeProjectsRes = await client.query(
                        "SELECT id, name FROM projects WHERE status IN ('Active', 'In Progress') AND company = $1",
                        [staff.company || 'TED Capital']
                    );
                    const activeProjects = activeProjectsRes.rows;
                    if (activeProjects.length > 0) {
                        const distributedAmount = projectGrossExpense / activeProjects.length;
                        for (const activeProj of activeProjects) {
                            await client.query(
                                `INSERT INTO expenses (description, amount, currency, category_id, project_id, expense_date, payment_method, supplier_name, status, company_entity, company_id, created_by, approved_by, metadata)
                                 VALUES ($1, $2, 'EGP', 3, $3, CURRENT_DATE, 'Payroll', $4, 'Approved', $5, $6, $7, $7, $8)`,
                                [
                                    `توزيع مصاريف إدارية (راتب الموظف ${staff.name} لشهر ${month}-${year})`,
                                    distributedAmount,
                                    activeProj.id,
                                    staff.name,
                                    staff.company || 'TED Capital',
                                    staff.company_id || 1,
                                    req.user?.id || null,
                                    JSON.stringify({
                                        category: category || 'مصاريف المرتبات والأجور',
                                        unit: 'شهر',
                                        qty: 1,
                                        rate: distributedAmount,
                                        allocationType: 'general_distribution',
                                        beneficiary: staff.name
                                    })
                                ]
                            );
                        }
                    }
                } else {
                    const projRes = await client.query("SELECT id FROM projects WHERE name = $1 LIMIT 1", [p.project_name]);
                    if (projRes.rows.length > 0) {
                        const projId = projRes.rows[0].id;
                        await client.query(
                            `INSERT INTO expenses (description, amount, currency, category_id, project_id, expense_date, payment_method, supplier_name, status, company_entity, company_id, created_by, approved_by, metadata)
                             VALUES ($1, $2, 'EGP', 3, $3, CURRENT_DATE, 'Payroll', $4, 'Approved', $5, $6, $7, $7, $8)`,
                            [
                                `رواتب وأجور - الموظف ${staff.name} لشهر ${month}-${year}`,
                                projectGrossExpense,
                                projId,
                                staff.name,
                                staff.company || 'TED Capital',
                                staff.company_id || 1,
                                req.user?.id || null,
                                JSON.stringify({
                                    category: category || 'مصاريف المرتبات والأجور',
                                    unit: 'شهر',
                                    qty: 1,
                                    rate: projectGrossExpense,
                                    allocationType: 'project',
                                    beneficiary: staff.name
                                })
                            ]
                        );
                    }
                }
            }
        }

        // Step 3: Settle Automated Commissions globally (not split by project to avoid rounding issues, or just log once)
        if (autoCommissions > 0 && commIds.length > 0) {
            await client.query("UPDATE sales_commissions SET status = 'Paid' WHERE id = ANY($1::int[])", [commIds]);
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: 'عمولات مستحقة',
                creditAccount: 'النقدية بالصندوق / البنوك',
                amount: autoCommissions,
                costCenter: 'General',
                description: `صرف عمولات مستحقة للموظف ${staff.name} مع راتب ${month}-${year}`,
                username: username
            });
        }

        await logAdvancedAudit(client, username, 'payroll', staffId, 'GENERATE', `Processed payroll for ${month}-${year}`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم إصدار الراتب وتسوية السلف وتوليد القيود المحاسبية بنجاح." });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error processing payroll:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

const getPayrollSummary = async (req, res) => {
    const { month, year } = req.params;
    try {
        // 1. Fetch all active staff
        const staffRes = await pool.query("SELECT id, name, salary, company, department, job_title FROM staff WHERE status = 'Active' ORDER BY id ASC");
        const staffList = staffRes.rows;

        const summary = [];

        for (let staff of staffList) {
            // 2. Fetch Attendance Summary (Suggested Deductions)
            const attRes = await pool.query(`
                SELECT COUNT(DISTINCT DATE(check_in::TIMESTAMP)) as present_days 
                FROM attendance 
                WHERE staff_id = $1::int AND EXTRACT(MONTH FROM check_in::TIMESTAMP) = $2::int AND EXTRACT(YEAR FROM check_in::TIMESTAMP) = $3::int
            `, [staff.id, month, year]);
            
            const presentDays = parseInt(attRes.rows[0].present_days) || 0;
            const expectedDays = 26; 
            const absentDays = Math.max(0, expectedDays - presentDays);
            const dayValue = parseFloat(staff.salary || 0) / 30;
            const suggestedDeduction = Math.round(absentDays * dayValue);

            // 3. Fetch Pending Commissions
            const commRes = await pool.query("SELECT SUM(amount) as total FROM sales_commissions WHERE staff_id = $1::int AND status = 'Pending'", [staff.id]);
            const autoCommissions = parseFloat(commRes.rows[0].total || 0);

            // 4. Fetch Advance Due
            const advRes = await pool.query(`
                SELECT SUM(LEAST(deduction_per_month, remaining_balance)) as due_amount 
                FROM staff_advances 
                WHERE staff_id = $1::int AND remaining_balance > 0 AND status = 'Approved'
            `, [staff.id]);
            const advanceDeduction = parseFloat(advRes.rows[0].due_amount || 0);

            summary.push({
                staff_id: staff.id,
                name: staff.name,
                job_title: staff.job_title,
                department: staff.department,
                basic_salary: parseFloat(staff.salary || 0),
                suggested_deduction: suggestedDeduction,
                auto_commissions: autoCommissions,
                advance_deduction: advanceDeduction,
                net_salary: parseFloat(staff.salary || 0) + autoCommissions - (suggestedDeduction + advanceDeduction)
            });
        }

        res.json(summary);
    } catch (error) {
        console.error("Error fetching payroll summary:", error);
        res.status(500).json({ error: "حدث خطأ أثناء جلب مسير الرواتب." });
    }
};

module.exports = {
    grantAdvance,
    processPayroll,
    getPayrollSummary
};
