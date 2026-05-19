const pool = require('../config/db');
const { logAudit } = require('../utils/helpers');
const InterCompanyService = require('../services/interCompanyService');

function resolveAllowedCompanies(req) {
    if (!req.user) return null;

    const username = (req.user.username || '').toUpperCase();
    const isMtayem = username === 'MTAYEM';
    const isMsobhi = username === 'MSOBHI';
    const selectedComp = req.user.selectedCompany;

    const mapComp = (c) => {
        if (!c) return null;
        const nameLower = c.toLowerCase();
        if (nameLower.includes('design') || nameLower.includes('ديزاين')) {
            return { id: 2, name: 'Design Concept' };
        }
        if (nameLower.includes('master') || nameLower.includes('ماستر')) {
            return { id: 3, name: 'Master Builder' };
        }
        if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) {
            return { id: 4, name: 'PRIMEMED PHARMA' };
        }
        if (nameLower.includes('ted') || nameLower.includes('تيد')) {
            return { id: 1, name: 'TED Capital' };
        }
        return null;
    };

    // If user has chosen a specific company (and it's not the "all" wildcard)
    if (selectedComp && !['all', 'كل الشركات', 'all companies'].includes(selectedComp.toLowerCase())) {
        const resolved = mapComp(selectedComp);
        if (resolved) {
            // Apply security constraints for MTAYEM & MSOBHI
            if (isMtayem && ![1, 4].includes(resolved.id)) {
                return { ids: [1, 4], names: ['TED Capital', 'PRIMEMED PHARMA'] };
            }
            if (isMsobhi && resolved.id !== 2) {
                return { ids: [2], names: ['Design Concept'] };
            }
            return { ids: [resolved.id], names: [resolved.name] };
        }
    }

    // Default allowed scopes when no specific company is selected
    if (isMtayem) {
        return { ids: [1, 4], names: ['TED Capital', 'PRIMEMED PHARMA'] };
    }
    if (isMsobhi) {
        return { ids: [2], names: ['Design Concept'] };
    }

    // If user has a linked company in their database profile
    if (req.user.linkedCompany) {
        const resolved = mapComp(req.user.linkedCompany);
        if (resolved) {
            return { ids: [resolved.id], names: [resolved.name] };
        }
    }

    return null; // Admin / Super Admin (unrestricted)
}

class FinanceController {
    /**
     * Strategic Inter-Company Reconciliation
     */
    async reconcileInterCompany(req, res) {
        try {
            const { source_company_id, target_company_id, amount, description, project_id } = req.body;
            if (!source_company_id || !target_company_id || !amount) {
                return res.status(400).json({ error: "Missing required reconciliation parameters" });
            }

            const result = await InterCompanyService.reconcileTransaction(
                source_company_id, 
                target_company_id, 
                amount, 
                description, 
                project_id
            );

            res.json({ success: true, data: result });
        } catch (error) {
            console.error("🔥 IC Reconciliation Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * جلب البيانات المالية المجمعة (الميزانية وقائمة الدخل)
     */
    async getFinancialStatements(req, res) {
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let ledgerFilter = "AND l.is_deleted = FALSE AND sub.is_deleted = FALSE";
            let coaFilter = "";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                ledgerFilter += ` AND l.company_id = $1`;
                
                let entityName = "";
                if (String(targetId) === '1') entityName = 'TED Capital';
                else if (String(targetId) === '2') entityName = 'Design Concept';
                else if (String(targetId) === '3') entityName = 'Master Builder';
                else if (String(targetId) === '4') entityName = 'PRIMEMED PHARMA';
                
                if (entityName) {
                    params.push(entityName);
                    coaFilter = ` AND (c.company_entity = 'All' OR c.company_entity = $2)`;
                }
            } else if (allowed) {
                ledgerFilter += ` AND l.company_id IN (${allowed.ids.join(',')})`;
                coaFilter = ` AND (c.company_entity = 'All' OR c.company_entity IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            }

            // 1. جلب شجرة الحسابات مع الأرصدة المحدثة
            const coaRes = await pool.query(`
                SELECT c.id, c.account_code, c.account_name, c.account_type, c.hierarchy_level,
                    COALESCE(
                        (SELECT SUM(
                            CASE 
                                WHEN sub.account_type IN ('Asset', 'Expense') THEN (l.debit - l.credit)
                                ELSE (l.credit - l.debit)
                            END
                        ) 
                        FROM ledger l 
                        JOIN chart_of_accounts sub ON l.account_name = sub.account_name
                        WHERE CAST(sub.account_code AS TEXT) LIKE (RTRIM(CAST(c.account_code AS TEXT), '0') || '%')
                        ${ledgerFilter}
                        ), 
                     0) AS balance 
                FROM chart_of_accounts c
                WHERE c.is_deleted = FALSE ${coaFilter}
                ORDER BY c.account_code
            `, params);

            const accounts = coaRes.rows;

            // 2. تصنيف الحسابات للميزانية وقائمة الدخل
            const statements = {
                balanceSheet: {
                    assets: accounts.filter(a => a.account_type === 'Asset' && a.hierarchy_level === 1),
                    liabilities: accounts.filter(a => a.account_type === 'Liability' && a.hierarchy_level === 1),
                    equity: accounts.filter(a => a.account_type === 'Equity' && a.hierarchy_level === 1),
                },
                profitAndLoss: {
                    revenue: accounts.filter(a => a.account_type === 'Revenue' && a.hierarchy_level === 1),
                    expense: accounts.filter(a => a.account_type === 'Expense' && a.hierarchy_level === 1),
                },
                trialBalance: accounts.filter(a => a.hierarchy_level === 3 || a.balance != 0)
            };

            const sum = (arr) => arr.reduce((total, acc) => total + parseFloat(acc.balance), 0);

            const summary = {
                totalAssets: sum(statements.balanceSheet.assets),
                totalLiabilities: sum(statements.balanceSheet.liabilities),
                totalEquity: sum(statements.balanceSheet.equity),
                totalRevenue: sum(statements.profitAndLoss.revenue),
                totalExpense: sum(statements.profitAndLoss.expense),
            };

            summary.netProfit = summary.totalRevenue - summary.totalExpense;

            // Inject Net Profit into Equity for perfect Balance Sheet equilibrium (IFRS Retained Earnings)
            summary.totalEquity += summary.netProfit;
            if (statements.balanceSheet.equity && statements.balanceSheet.equity.length > 0) {
                statements.balanceSheet.equity[0].balance = (parseFloat(statements.balanceSheet.equity[0].balance) + summary.netProfit).toString();
            }

            res.json({
                success: true,
                statements,
                summary
            });
        } catch (error) {
            console.error("🔥 Financial Statement Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * جلب تحليلات نقدية سريعة (Dashboard)
     */
    async getFinancialDashboard(req, res) {
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let lFilter = "AND l.is_deleted = FALSE AND c.is_deleted = FALSE";
            let customerFilter = "WHERE is_deleted = FALSE";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                lFilter += " AND l.company_id = $1";
                
                let entityName = "";
                if (String(targetId) === '1') entityName = 'TED Capital';
                else if (String(targetId) === '2') entityName = 'Design Concept';
                else if (String(targetId) === '3') entityName = 'Master Builder';
                else if (String(targetId) === '4') entityName = 'PRIMEMED PHARMA';
                if (entityName) {
                    customerFilter += ` AND company_name ILIKE '%${entityName}%'`;
                }
            } else if (allowed) {
                lFilter += ` AND l.company_id IN (${allowed.ids.join(',')})`;
                customerFilter += ` AND company_name IN (${allowed.names.map(n => `'${n}'`).join(',')})`;
            }

            const stats = await pool.query(`
                SELECT 
                    -- 1. AR (Receivables) from Ledger
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Asset' 
                        AND (c.account_name ILIKE '%عملاء%' OR c.account_code LIKE '112%')
                        ${lFilter}
                    ), 0) as accounts_receivable,

                    -- 2. AP (Payables) from Ledger
                    COALESCE((
                        SELECT SUM(l.credit - l.debit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Liability' 
                        AND (c.account_name ILIKE '%موردين%' OR c.account_code LIKE '211%')
                        ${lFilter}
                    ), 0) as accounts_payable,

                    -- 3. Cash from Ledger (Cash/Bank accounts)
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Asset' 
                        AND (c.account_name ILIKE '%نقدية%' OR c.account_name ILIKE '%صندوق%' OR c.account_name ILIKE '%بنك%' OR c.account_code LIKE '110%' OR c.account_code LIKE '111%')
                        ${lFilter}
                    ), 0) as cash_on_hand,

                    -- 4. Inventory Assets from Ledger (Inventory accounts)
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Asset' 
                        AND (c.account_name ILIKE '%مخزون%' OR c.account_code LIKE '113%')
                        ${lFilter}
                    ), 0) as inventory_value,

                    -- 5. Total Revenue from Ledger
                    COALESCE((
                        SELECT SUM(l.credit - l.debit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Revenue'
                        ${lFilter}
                    ), 0) as total_revenue,

                    -- 6. Total Expenses from Ledger
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE c.account_type = 'Expense'
                        ${lFilter}
                    ), 0) as total_expenses,

                    -- 7. Count
                    (SELECT COUNT(*) FROM customers ${customerFilter}) as customer_count
            `, params);

            const data = stats.rows[0];
            data.net_profit = parseFloat(data.total_revenue) - parseFloat(data.total_expenses);
            
            console.log("📊 Dashboard Data Calculated:", {
                AR: data.accounts_receivable,
                AP: data.accounts_payable,
                Cash: data.cash_on_hand,
                Inventory: data.inventory_value,
                Revenue: data.total_revenue
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error("🔥 Dashboard Stats Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAPBalances(req, res) {
        console.log("📥 [GET] /api/finance/ap-balances");
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let lFilter = "AND l.is_deleted = FALSE AND coa.is_deleted = FALSE";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                lFilter += " AND l.company_id = $1";
            } else if (allowed) {
                lFilter += ` AND l.company_id IN (${allowed.ids.join(',')})`;
            }

            const result = await pool.query(`
                SELECT 
                    coa.account_name, coa.account_code,
                    COALESCE(SUM(l.credit - l.debit), 0) as balance
                FROM chart_of_accounts coa
                JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name)
                WHERE coa.account_code LIKE '211%'
                ${lFilter}
                GROUP BY coa.account_name, coa.account_code
                HAVING SUM(l.credit - l.debit) != 0
                ORDER BY balance DESC
            `, params);
            console.log(`✅ Found ${result.rows.length} AP accounts`);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("🔥 AP Balances Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getInventoryValuation(req, res) {
        console.log("📥 [GET] /api/finance/inventory-valuation");
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let filter = "WHERE i.quantity != 0";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                filter += " AND (p.company_id = $1 OR i.company_id = $1)";
            } else if (allowed) {
                filter += ` AND (p.company_id IN (${allowed.ids.join(',')}) OR i.company_id IN (${allowed.ids.join(',')}) OR i.project_name IN (SELECT name FROM projects WHERE company_id IN (${allowed.ids.join(',')})))`;
            }

            const result = await pool.query(`
                SELECT 
                    i.item_name, i.project_name, i.quantity, i.uom, i.buy_price,
                    (i.quantity * i.buy_price) as valuation
                FROM inventory_items i
                LEFT JOIN projects p ON i.project_name = p.name
                ${filter}
                ORDER BY valuation DESC
            `, params);
            console.log(`✅ Found ${result.rows.length} inventory items`);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("🔥 Inventory Valuation Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getCashBalances(req, res) {
        console.log("📥 [GET] /api/finance/cash-balances");
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let lFilter = "AND l.is_deleted = FALSE AND coa.is_deleted = FALSE";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                lFilter += " AND l.company_id = $1";
            } else if (allowed) {
                lFilter += ` AND l.company_id IN (${allowed.ids.join(',')})`;
            }

            const result = await pool.query(`
                SELECT 
                    coa.account_name, coa.account_code,
                    COALESCE(SUM(l.debit - l.credit), 0) as balance
                FROM chart_of_accounts coa
                JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name)
                WHERE (coa.account_code LIKE '110%' OR coa.account_code LIKE '111%')
                ${lFilter}
                GROUP BY coa.account_name, coa.account_code
                HAVING SUM(l.debit - l.credit) != 0
                ORDER BY balance DESC
            `, params);
            console.log(`✅ Found ${result.rows.length} cash accounts`);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("🔥 Cash Balances Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * جلب أداء الإيرادات والمصروفات شهرياً لآخر 12 شهر
     */
    async getMonthlyPerformance(req, res) {
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let lFilter = "AND l.is_deleted = FALSE";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                lFilter += " AND l.company_id = $1";
            } else if (allowed) {
                lFilter += ` AND l.company_id IN (${allowed.ids.join(',')})`;
            }

            const result = await pool.query(`
                SELECT 
                    TO_CHAR(l.created_at, 'YYYY-MM') as month_year,
                    SUM(CASE WHEN c.account_type = 'Revenue' THEN (l.credit - l.debit) ELSE 0 END) as revenue,
                    SUM(CASE WHEN c.account_type = 'Expense' THEN (l.debit - l.credit) ELSE 0 END) as expenses
                FROM ledger l
                JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                WHERE l.created_at >= CURRENT_DATE - INTERVAL '12 months'
                ${lFilter}
                GROUP BY month_year
                ORDER BY month_year ASC
            `, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("🔥 Monthly Performance Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * جلب مقارنة الميزانية التقديرية والفعلية للمشاريع
     */
    async getBudgetComparison(req, res) {
        try {
            const companyId = req.query.company_id;
            const allowed = resolveAllowedCompanies(req);
            
            let filter = "WHERE p.is_deleted = FALSE";
            const params = [];
            
            if (companyId && companyId !== 'all') {
                let targetId = parseInt(companyId);
                if (allowed && !allowed.ids.includes(targetId)) {
                    targetId = allowed.ids[0];
                }
                params.push(targetId);
                filter += " AND p.company_id = $1";
            } else if (allowed) {
                filter += ` AND p.company_id IN (${allowed.ids.join(',')})`;
            }

            const result = await pool.query(`
                SELECT 
                    p.name as project_name,
                    'تكاليف مباشرة ومصروفات' as account_name,
                    COALESCE(p.budget, 0) as budget_amount,
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
                        WHERE (l.cost_center = p.name OR l.cost_center = p.id::text)
                        AND c.account_type = 'Expense'
                        AND l.is_deleted = FALSE
                    ), 0) as actual_amount,
                    p.company, p.company_id
                FROM projects p 
                ${filter}
                ORDER BY p.id DESC
            `, params);

            const budgets = result.rows.map(row => {
                const budgetAmt = parseFloat(row.budget_amount) || 0;
                const actualAmt = parseFloat(row.actual_amount) || 0;
                const consumptionPercent = budgetAmt > 0 ? (actualAmt / budgetAmt) * 100 : (actualAmt > 0 ? 100 : 0);
                const variance = budgetAmt - actualAmt;
                return {
                    ...row,
                    budget_amount: budgetAmt,
                    actual_amount: actualAmt,
                    consumption_percent: consumptionPercent,
                    variance: variance
                };
            });

            res.json({ success: true, data: budgets });
        } catch (error) {
            console.error("🔥 Budget Comparison Error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FinanceController();
