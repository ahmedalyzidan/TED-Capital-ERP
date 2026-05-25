const pool = require('../config/db');
const AccountingService = require('../services/accountingService');
const { logAdvancedAudit } = require('../utils/helpers');

class CustodyController {
    constructor() {
        this.createCustody = this.createCustody.bind(this);
        this.getCustodies = this.getCustodies.bind(this);
        this.getCustodyDetails = this.getCustodyDetails.bind(this);
        this.addCustodyExpense = this.addCustodyExpense.bind(this);
        this.approveExpense = this.approveExpense.bind(this);
        this.rejectExpense = this.rejectExpense.bind(this);
        this.settleCustody = this.settleCustody.bind(this);
    }

    // مساعد لحل تفاصيل الشركة
    async resolveCompanyDetails(client, req) {
        let companyId = 1;
        let companyName = 'TED Capital';

        const selectedCompany = req.user?.selectedCompany || req.headers['x-selected-company'];
        if (selectedCompany && !['all', 'كل الشركات', 'all companies'].includes(selectedCompany.toLowerCase())) {
            const nameLower = selectedCompany.toLowerCase();
            if (nameLower.includes('design') || nameLower.includes('ديزاين')) {
                companyId = 2; companyName = 'Design Concept';
            } else if (nameLower.includes('master') || nameLower.includes('ماستر')) {
                companyId = 3; companyName = 'Master Builder';
            } else if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) {
                companyId = 4; companyName = 'PRIMEMED PHARMA';
            } else if (nameLower.includes('ted') || nameLower.includes('تيد')) {
                companyId = 1; companyName = 'TED Capital';
            } else {
                try {
                    const compRes = await client.query(
                        "SELECT id, name FROM companies WHERE UPPER(name) = UPPER($1) OR name ILIKE $2 LIMIT 1",
                        [selectedCompany, `%${selectedCompany}%`]
                    );
                    if (compRes.rows.length > 0) {
                        companyId = compRes.rows[0].id;
                        companyName = compRes.rows[0].name;
                    }
                } catch(e){}
            }
        } else if (req.user?.linkedCompany) {
            const nameLower = req.user.linkedCompany.toLowerCase();
            if (nameLower.includes('design') || nameLower.includes('ديزاين')) { companyId = 2; companyName = 'Design Concept'; }
            else if (nameLower.includes('master') || nameLower.includes('ماستر')) { companyId = 3; companyName = 'Master Builder'; }
            else if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) { companyId = 4; companyName = 'PRIMEMED PHARMA'; }
            else if (nameLower.includes('ted') || nameLower.includes('تيد')) { companyId = 1; companyName = 'TED Capital'; }
        }
        return { companyId, companyName };
    }

    // 1. إنشاء عهدة جديدة مع إثباتها دفترياً
    async createCustody(req, res) {
        const { custodian_name, assigned_amount, notes, company: bodyCompany } = req.body;
        const amountNum = parseFloat(assigned_amount);
        
        if (!custodian_name || isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({ error: "اسم مستلم العهدة وقيمة العهدة مطلوبة وصحيحة." });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // تحديد الشركة: نعطي الأولوية للشركة المحددة صراحةً من الواجهة (req.body.company)
            let { companyId, companyName } = await this.resolveCompanyDetails(client, req);

            if (bodyCompany && bodyCompany.trim()) {
                // إذا أرسل الـ frontend شركة محددة → نبحث عنها في قاعدة البيانات
                const compRes = await client.query(
                    "SELECT id, name FROM companies WHERE UPPER(name) = UPPER($1) OR name ILIKE $2 LIMIT 1",
                    [bodyCompany.trim(), `%${bodyCompany.trim()}%`]
                );
                if (compRes.rows.length > 0) {
                    companyId = compRes.rows[0].id;
                    companyName = compRes.rows[0].name;
                }
            }

            // إدراج سجل العهدة
            const custodyRes = await client.query(
                `INSERT INTO custodies (custodian_name, assigned_amount, remaining_amount, notes, created_by, company_id)
                 VALUES ($1, $2, $2, $3, $4, $5) RETURNING *`,
                [custodian_name, amountNum, notes || null, req.user?.username || 'System', companyId]
            );
            const custody = custodyRes.rows[0];

            // تحديد حساب الصندوق بناءً على الشركة المختارة
            let cashAccount = 'صندوق نقدية - تيد كابيتال';
            if (companyId === 2) cashAccount = 'صندوق نقدية - ديزاين كونسبت';
            else if (companyId === 3) cashAccount = 'صندوق نقدية - ماستر بيلدر';
            else if (companyId === 4) cashAccount = 'صندوق نقدية - بريميميد فارما';

            // إثبات صرف العهدة محاسبياً في اليومية العامة
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: 'عهد الموظفين والعهدة النقدية',
                creditAccount: cashAccount,
                amount: amountNum,
                costCenter: 'General',
                description: `صرف وتسليم عهدة نقدية مؤقتة للمحاسب/الموظف: ${custodian_name}`,
                username: req.user?.username || 'System',
                referenceNo: `CUST-${custody.id}`,
                sourceModule: 'FinanceCustody',
                companyId: companyId,
                company: companyName
            });

            await logAdvancedAudit(
                client,
                req.user?.username || 'System',
                'custodies',
                custody.id.toString(),
                'CREATE_CUSTODY',
                `Created custody #${custody.id} for '${custodian_name}' with amount ${amountNum}`,
                null,
                custody
            );

            await client.query('COMMIT');
            res.json({ success: true, custody });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ [CustodyController] createCustody Error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    // 2. جلب قائمة بكافة العهد
    async getCustodies(req, res) {
        try {
            const { resolveScope } = require('../utils/helpers');
            const scope = resolveScope(req.user);
            let query = `SELECT * FROM custodies`;
            let params = [];
            if (scope) {
                query += ` WHERE company_id = ANY($1)`;
                params.push(scope.ids);
            }
            query += ` ORDER BY id DESC`;
            const result = await pool.query(query, params);
            res.json({ success: true, custodies: result.rows });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 3. جلب تفاصيل عهدة معينة وكافة مصروفاتها
    async getCustodyDetails(req, res) {
        const { id } = req.params;
        try {
            const custodyRes = await pool.query(`SELECT * FROM custodies WHERE id = $1`, [id]);
            if (custodyRes.rows.length === 0) {
                return res.status(404).json({ error: "العهدة غير موجودة." });
            }

            const expensesRes = await pool.query(
                `SELECT ce.*, p.name as project_name 
                 FROM custody_expenses ce 
                 LEFT JOIN projects p ON ce.project_id = p.id 
                 WHERE ce.custody_id = $1 
                 ORDER BY ce.id DESC`,
                [id]
            );

            res.json({
                success: true,
                custody: custodyRes.rows[0],
                expenses: expensesRes.rows
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 4. تسجيل بند مصروف جديد من العهدة (Pending)
    async addCustodyExpense(req, res) {
        const { id } = req.params;
        const { expense_category, amount, expense_date, recipient_name, notes, receipt_attachment, project_id, boq_id, cost_type } = req.body;
        const amountNum = parseFloat(amount);

        if (!expense_category || isNaN(amountNum) || amountNum <= 0 || !expense_date) {
            return res.status(400).json({ error: "جميع تفاصيل المصروف وتاريخه والمبلغ مطلوبة بشكل صحيح." });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // التحقق من حالة العهدة ورصيدها المتبقي
            const custodyRes = await client.query(`SELECT * FROM custodies WHERE id = $1 FOR UPDATE`, [id]);
            if (custodyRes.rows.length === 0) {
                throw new Error("العهدة المستهدفة غير موجودة.");
            }

            const custody = custodyRes.rows[0];
            if (custody.status !== 'Active') {
                throw new Error("لا يمكن الصرف من عهدة مغلقة أو مسواة.");
            }

            if (parseFloat(custody.remaining_amount) < amountNum) {
                throw new Error(`رصيد العهدة غير كافٍ. الرصيد المتبقي: ${custody.remaining_amount} EGP`);
            }

            // إدراج بند المصروف
            const expenseRes = await client.query(
                `INSERT INTO custody_expenses (custody_id, expense_category, amount, expense_date, recipient_name, notes, receipt_attachment, status, project_id, boq_id, cost_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8, $9, $10) RETURNING *`,
                [id, expense_category, amountNum, expense_date, recipient_name || null, notes || null, receipt_attachment || null, project_id || null, boq_id || null, cost_type || null]
            );
            const expense = expenseRes.rows[0];

            // تخفيض رصيد العهدة مؤقتاً لحين الاعتماد أو الرفض
            await client.query(
                `UPDATE custodies SET remaining_amount = remaining_amount - $1 WHERE id = $2`,
                [amountNum, id]
            );

            await client.query('COMMIT');
            res.json({ success: true, expense });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ [CustodyController] addCustodyExpense Error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    // 5. اعتماد بند المصروف وترحيل القيد للدفتر العام
    async approveExpense(req, res) {
        const { expense_id } = req.params;
        const { debit_account } = req.body; // الحساب المدين الاختياري الممرر من شجرة الحسابات بالواجهة

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // جلب تفاصيل المصروف والعهدة المرتبطة به
            const expRes = await client.query(
                `SELECT ce.*, c.custodian_name, c.company_id, p.name as project_name
                 FROM custody_expenses ce
                 JOIN custodies c ON ce.custody_id = c.id
                 LEFT JOIN projects p ON ce.project_id = p.id
                 WHERE ce.id = $1 FOR UPDATE OF ce, c`,
                [expense_id]
            );

            if (expRes.rows.length === 0) {
                throw new Error("بند المصروف غير موجود.");
            }

            const expense = expRes.rows[0];
            if (expense.status !== 'Pending') {
                throw new Error("بند المصروف تم البت فيه مسبقاً.");
            }

            // تحديث حالة المصروف كمعتمد
            await client.query(
                `UPDATE custody_expenses SET status = 'Approved', approved_by = $1 WHERE id = $2`,
                [req.user?.username || 'System', expense_id]
            );

            // جلب اسم شركة العهدة أولاً لتحديد الحساب المدين الصحيح
            let custodyCompanyName = 'TED Capital';
            const compRes = await client.query("SELECT name FROM companies WHERE id = $1", [expense.company_id]);
            if (compRes.rows.length > 0) {
                custodyCompanyName = compRes.rows[0].name;
            }

            // تحديد الحساب المدين المحمل بالمصروف حسب شركة العهدة
            // يُستخدم الحساب المُمرَّر من الواجهة إن وُجد، وإلا يُختار الحساب المناسب للشركة
            let defaultDebitAccount = 'مصاريف عمومية وإدارية'; // حساب 6000 - شامل لكل الشركات
            if (custodyCompanyName.includes('PRIMEMED') || custodyCompanyName.includes('بريميميد')) {
                defaultDebitAccount = 'مصاريف تشغيل الصيدلية والرواتب - بريميميد فارما';
            }
            const resolvedDebitAccount = debit_account || defaultDebitAccount;

            // ترحيل قيد التسوية المحاسبية للمصروف
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: resolvedDebitAccount,
                creditAccount: 'عهد الموظفين والعهدة النقدية',
                amount: parseFloat(expense.amount),
                costCenter: expense.project_name || 'General',
                description: `اعتماد مصروف عهدة (${expense.custodian_name}) | بند: ${expense.expense_category} | المستلم: ${expense.recipient_name || 'N/A'}`,
                username: req.user?.username || 'System',
                referenceNo: `EXP-${expense.id}`,
                sourceModule: 'FinanceCustody',
                companyId: expense.company_id,
                company: custodyCompanyName
            });

            // إدراج سجل في جدول المصروفات (expenses) ليظهر في قائمة المصروفات الفعلية للمشروع
            if (expense.project_id) {
                let boqFormattedCategory = expense.expense_category;
                if (expense.boq_id) {
                    const boqRes = await client.query("SELECT item_name, material_category FROM boq WHERE id = $1", [expense.boq_id]);
                    if (boqRes.rows.length > 0) {
                        const boqItem = boqRes.rows[0];
                        boqFormattedCategory = `[${boqItem.material_category || 'عام'}] ${boqItem.item_name}`;
                    }
                }

                const expenseDescription = expense.notes || `صرف من العهدة (${expense.custodian_name}) | بند: ${expense.expense_category}`;
                
                const metaJson = JSON.stringify({
                    category: boqFormattedCategory,
                    unit: 'وحدة',
                    qty: 1,
                    rate: parseFloat(expense.amount),
                    allocationType: 'project',
                    beneficiary: expense.recipient_name || expense.custodian_name,
                    projectId: expense.project_id.toString(),
                    custody_expense_id: expense.id
                });

                await client.query(
                    `INSERT INTO expenses (description, amount, currency, category_id, project_id, expense_date, payment_method, supplier_name, receipt_url, status, company_entity, company_id, created_by, approved_by, metadata)
                     VALUES ($1, $2, 'EGP', 3, $3, $4, 'Custody', $5, $6, 'Approved', $7, $8, $9, $9, $10)`,
                    [
                        expenseDescription,
                        parseFloat(expense.amount),
                        expense.project_id,
                        expense.expense_date,
                        expense.recipient_name || expense.custodian_name,
                        expense.receipt_attachment || null,
                        custodyCompanyName,
                        expense.company_id,
                        req.user?.id || null,
                        metaJson
                    ]
                );
            }

            // تحديث تكلفة المقايسة (BOQ) ومزامنة أرباح المشروع
            if (expense.boq_id && expense.cost_type) {
                const amount = parseFloat(expense.amount);
                let updateCol = null;
                const ct = expense.cost_type.toLowerCase();
                if (ct.includes('material') || ct.includes('مواد') || ct.includes('خام')) {
                    updateCol = 'actual_material_cost';
                } else if (ct.includes('labor') || ct.includes('أجور') || ct.includes('عمال')) {
                    updateCol = 'actual_labor_cost';
                } else if (ct.includes('subcontractor') || ct.includes('مقاول')) {
                    updateCol = 'actual_subcontractor_cost';
                } else {
                    updateCol = 'actual_material_cost'; // Default fallback
                }

                await client.query(
                    `UPDATE boq 
                     SET ${updateCol} = COALESCE(${updateCol}, 0) + $1
                     WHERE id = $2`,
                    [amount, expense.boq_id]
                );

                // إعادة احتساب أرباح ومصاريف المشروع وتحديث لوحة تحكم المالية
                const { syncProjectFinancials } = require('../utils/helpers');
                if (expense.project_name) {
                    await syncProjectFinancials(expense.project_name, client);
                }
            }

            await logAdvancedAudit(
                client,
                req.user?.username || 'System',
                'custody_expenses',
                expense.id.toString(),
                'APPROVE_CUSTODY_EXPENSE',
                `Approved custody expense #${expense.id} of amount ${expense.amount} under custody #${expense.custody_id}`,
                expense,
                { ...expense, status: 'Approved', approved_by: req.user?.username }
            );

            await client.query('COMMIT');
            res.json({ success: true, message: "تم اعتماد بند المصروف وترحيل القيد بنجاح." });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ [CustodyController] approveExpense Error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    // 6. رفض بند مصروف وإعادة المبلغ للعهدة
    async rejectExpense(req, res) {
        const { expense_id } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const expRes = await client.query(
                `SELECT * FROM custody_expenses WHERE id = $1 FOR UPDATE`,
                [expense_id]
            );

            if (expRes.rows.length === 0) {
                throw new Error("بند المصروف غير موجود.");
            }

            const expense = expRes.rows[0];
            if (expense.status !== 'Pending') {
                throw new Error("بند المصروف تم البت فيه مسبقاً.");
            }

            // تحديث حالة المصروف كمرفوض
            await client.query(
                `UPDATE custody_expenses SET status = 'Rejected', approved_by = $1 WHERE id = $2`,
                [req.user?.username || 'System', expense_id]
            );

            // استرداد المبلغ مرة أخرى لرصيد العهدة المتبقي
            await client.query(
                `UPDATE custodies SET remaining_amount = remaining_amount + $1 WHERE id = $2`,
                [parseFloat(expense.amount), expense.custody_id]
            );

            await logAdvancedAudit(
                client,
                req.user?.username || 'System',
                'custody_expenses',
                expense.id.toString(),
                'REJECT_CUSTODY_EXPENSE',
                `Rejected custody expense #${expense.id} of amount ${expense.amount} under custody #${expense.custody_id}`,
                expense,
                { ...expense, status: 'Rejected', approved_by: req.user?.username }
            );

            await client.query('COMMIT');
            res.json({ success: true, message: "تم رفض بند المصروف واسترداد القيمة للرصيد المتبقي." });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ [CustodyController] rejectExpense Error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    // 7. تسوية وإقفال العهدة بالكامل وإرجاع الباقي للصندوق
    async settleCustody(req, res) {
        const { id } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const custodyRes = await client.query(`SELECT * FROM custodies WHERE id = $1 FOR UPDATE`, [id]);
            if (custodyRes.rows.length === 0) {
                throw new Error("العهدة غير موجودة.");
            }

            const custody = custodyRes.rows[0];
            if (custody.status !== 'Active') {
                throw new Error("العهدة مقفلة أو مسواة بالفعل.");
            }

            const remaining = parseFloat(custody.remaining_amount);

            let cashAccount = 'صندوق نقدية - تيد كابيتال';
            if (custody.company_id === 2) cashAccount = 'صندوق نقدية - ديزاين كونسبت';
            else if (custody.company_id === 3) cashAccount = 'صندوق نقدية - ماستر بيلدر';
            else if (custody.company_id === 4) cashAccount = 'صندوق نقدية - بريميميد فارما';

            let custodyCompanyName = 'TED Capital';
            const compRes = await client.query("SELECT name FROM companies WHERE id = $1", [custody.company_id]);
            if (compRes.rows.length > 0) {
                custodyCompanyName = compRes.rows[0].name;
            }

            // إذا كان هناك رصيد متبقي لم يُصرف، نقوم بإرجاعه للصندوق الرئيسي وإثباته محاسبياً
            if (remaining > 0) {
                // مدين: صندوق نقدية
                // دائن: عهد الموظفين والعهدة النقدية (1170)
                await AccountingService.recordDoubleEntry(client, {
                    debitAccount: cashAccount,
                    creditAccount: 'عهد الموظفين والعهدة النقدية',
                    amount: remaining,
                    costCenter: 'General',
                    description: `تصفية وإقفال العهدة الخاصة بـ (${custody.custodian_name}) | إرجاع الرصيد المتبقي للصندوق`,
                    username: req.user?.username || 'System',
                    referenceNo: `CUST-SETTLE-${custody.id}`,
                    sourceModule: 'FinanceCustody',
                    companyId: custody.company_id,
                    company: custodyCompanyName
                });
            }

            // تحديث حالة العهدة وتصفير الرصيد المتبقي ماليًا
            const updatedRes = await client.query(
                `UPDATE custodies SET status = 'Settled', remaining_amount = 0 WHERE id = $1 RETURNING *`,
                [id]
            );

            await logAdvancedAudit(
                client,
                req.user?.username || 'System',
                'custodies',
                custody.id.toString(),
                'SETTLE_CUSTODY',
                `Settled and closed custody #${custody.id} for '${custody.custodian_name}'. Refunded remaining balance: ${remaining}`,
                custody,
                updatedRes.rows[0]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: `تمت تسوية وإقفال العهدة بنجاح. المبلغ المرجع للصندوق: ${remaining} EGP` });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ [CustodyController] settleCustody Error:", error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }
}

module.exports = new CustodyController();
