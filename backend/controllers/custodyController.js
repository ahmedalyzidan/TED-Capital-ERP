const pool = require('../config/db');
const AccountingService = require('../services/accountingService');
const { logAdvancedAudit } = require('../utils/helpers');

class CustodyController {
    // 1. إنشاء عهدة جديدة مع إثباتها دفترياً
    async createCustody(req, res) {
        const { custodian_name, assigned_amount, notes } = req.body;
        const amountNum = parseFloat(assigned_amount);
        
        if (!custodian_name || isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({ error: "اسم مستلم العهدة وقيمة العهدة مطلوبة وصحيحة." });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // إدراج سجل العهدة
            const custodyRes = await client.query(
                `INSERT INTO custodies (custodian_name, assigned_amount, remaining_amount, notes, created_by)
                 VALUES ($1, $2, $2, $3, $4) RETURNING *`,
                [custodian_name, amountNum, notes || null, req.user?.username || 'System']
            );
            const custody = custodyRes.rows[0];

            // إثبات صرف العهدة محاسبياً في اليومية العامة
            // مدين: عهد الموظفين والعهدة النقدية (1150)
            // دائن: صندوق نقدية - تيد كابيتال (1101)
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: 'عهد الموظفين والعهدة النقدية',
                creditAccount: 'صندوق نقدية - تيد كابيتال',
                amount: amountNum,
                costCenter: 'General',
                description: `صرف وتسليم عهدة نقدية مؤقتة للمحاسب/الموظف: ${custodian_name}`,
                username: req.user?.username || 'System',
                referenceNo: `CUST-${custody.id}`,
                sourceModule: 'FinanceCustody'
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
            const result = await pool.query(`SELECT * FROM custodies ORDER BY id DESC`);
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
                `SELECT * FROM custody_expenses WHERE custody_id = $1 ORDER BY id DESC`,
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
        const { expense_category, amount, expense_date, recipient_name, notes, receipt_attachment } = req.body;
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
                `INSERT INTO custody_expenses (custody_id, expense_category, amount, expense_date, recipient_name, notes, receipt_attachment, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending') RETURNING *`,
                [id, expense_category, amountNum, expense_date, recipient_name || null, notes || null, receipt_attachment || null]
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
                `SELECT ce.*, c.custodian_name, c.company_id
                 FROM custody_expenses ce
                 JOIN custodies c ON ce.custody_id = c.id
                 WHERE ce.id = $1 FOR UPDATE`,
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

            // تحديد الحساب المدين المحمل بالمصروف
            // إذا لم يتم تمرير حساب معين، نستخدم حساب المصروفات الافتراضي المتوفر بالدليل
            const resolvedDebitAccount = debit_account || 'مصاريف تشغيل الصيدلية والرواتب - بريميميد فارما';

            // ترحيل قيد التسوية المحاسبية للمصروف
            // مدين: حساب المصاريف المعني (Resolved Account)
            // دائن: عهد الموظفين والعهدة النقدية (1150)
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: resolvedDebitAccount,
                creditAccount: 'عهد الموظفين والعهدة النقدية',
                amount: parseFloat(expense.amount),
                costCenter: 'General',
                description: `اعتماد مصروف عهدة (${expense.custodian_name}) | بند: ${expense.expense_category} | المستلم: ${expense.recipient_name || 'N/A'}`,
                username: req.user?.username || 'System',
                referenceNo: `EXP-${expense.id}`,
                sourceModule: 'FinanceCustody',
                companyId: expense.company_id
            });

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

            // إذا كان هناك رصيد متبقي لم يُصرف، نقوم بإرجاعه للصندوق الرئيسي وإثباته محاسبياً
            if (remaining > 0) {
                // مدين: صندوق نقدية - تيد كابيتال (1101)
                // دائن: عهد الموظفين والعهدة النقدية (1150)
                await AccountingService.recordDoubleEntry(client, {
                    debitAccount: 'صندوق نقدية - تيد كابيتال',
                    creditAccount: 'عهد الموظفين والعهدة النقدية',
                    amount: remaining,
                    costCenter: 'General',
                    description: `تصفية وإقفال العهدة الخاصة بـ (${custody.custodian_name}) | إرجاع الرصيد المتبقي للصندوق`,
                    username: req.user?.username || 'System',
                    referenceNo: `CUST-SETTLE-${custody.id}`,
                    sourceModule: 'FinanceCustody',
                    companyId: custody.company_id
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
