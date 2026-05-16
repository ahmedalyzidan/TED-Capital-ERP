const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');

const addProject = async (req, res) => {
    const { name, type, location, total_units } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'create')) throw new Error("Access Denied.");
        const result = await pool.query(
            "INSERT INTO real_estate_projects (name, type, location, total_units) VALUES ($1, $2, $3, $4) RETURNING id",
            [name, type, location, total_units]
        );
        const username = req.user ? req.user.username : 'System';
        await logAudit(username, 'CREATE', 'real_estate_projects', result.rows[0].id, `Created project: ${name}`);
        res.json({ success: true, message: "تمت إضافة المشروع بنجاح", id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addUnit = async (req, res) => {
    const { project_id, unit_number, type, area, floor, price } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'create')) throw new Error("Access Denied.");
        
        const projRes = await pool.query("SELECT name FROM real_estate_projects WHERE id = $1", [project_id]);
        const projectName = projRes.rows[0]?.name || 'General';

        const result = await pool.query(
            "INSERT INTO real_estate_units (project_id, unit_number, type, area, floor, price, project_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [project_id, unit_number, type, area, floor, price, projectName]
        );
        const username = req.user ? req.user.username : 'System';
        await logAudit(username, 'CREATE', 'real_estate_units', result.rows[0].id, `Created unit: ${unit_number} in project ${projectName}`);
        res.json({ success: true, message: "تمت إضافة الوحدة بنجاح", id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createContract = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!hasAccess(req.user, 'real_estate', 'create')) throw new Error("Access Denied.");
        await client.query('BEGIN');
        
        const username = req.user ? req.user.username : 'System';
        const { 
            unit_id, customer_id, total_price, 
            down_payment, installment_years, frequency, contract_date
        } = req.body;

        // جلب بيانات الوحدة والمشروع المرتبط بها
        const unitRes = await client.query(`
            SELECT u.*, p.name as project_name 
            FROM real_estate_units u 
            JOIN real_estate_projects p ON u.project_id = p.id 
            WHERE u.id = $1 FOR UPDATE`, [unit_id]);
        if (unitRes.rows.length === 0) throw new Error("الوحدة غير موجودة");
        const unit = unitRes.rows[0];
        if (unit.status !== 'Available') throw new Error("الوحدة غير متاحة للبيع");

        // جلب اسم العميل من جدول العملاء المركزي
        const custRes = await client.query("SELECT name FROM customers WHERE id = $1", [customer_id]);
        if (custRes.rows.length === 0) throw new Error("العميل غير موجود في سجلات السيستم");
        const customerName = custRes.rows[0].name;

        await client.query("UPDATE real_estate_units SET status = 'Sold' WHERE id = $1", [unit_id]);

        const contractRes = await client.query(
            `INSERT INTO real_estate_contracts (unit_id, customer_id, customer_name, total_price, down_payment, installment_years, contract_date, project_name, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [unit_id, customer_id, customerName, total_price, down_payment, installment_years, contract_date || new Date().toISOString(), unit.project_name, username]
        );
        const contractId = contractRes.rows[0].id;

        // 🤖 توليد الأقساط تلقائياً
        let monthStep = frequency === 'Quarterly' ? 3 : (frequency === 'Semi-Annual' ? 6 : (frequency === 'Annual' ? 12 : 1));
        let numPayments = Math.floor((installment_years * 12) / monthStep);
        const remainingValue = parseFloat(total_price) - parseFloat(down_payment);
        const amountPer = (remainingValue / numPayments).toFixed(2);
        let currDate = new Date(contract_date || new Date());

        for (let i = 1; i <= numPayments; i++) {
            await client.query(
                "INSERT INTO real_estate_installments (contract_id, installment_no, due_date, amount, status) VALUES ($1, $2, $3, $4, 'Pending')",
                [contractId, i.toString(), currDate.toISOString(), amountPer]
            );
            currDate.setMonth(currDate.getMonth() + monthStep);
        }

        // 🌟 التأثير المالي المتكامل (Integrated Financial Posting)
        const revenueDesc = `إثبات مبيعات عقارية - عقد #${contractId} - وحدة ${unit.unit_number} - عميل: ${customerName}`;
        
        // 1. قيد المبيعات الكلي (إيراد vs عملاء)
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: 'عملاء (حسابات مدينة - AR)',
            creditAccount: 'إيرادات مبيعات عقارية',
            amount: parseFloat(total_price),
            costCenter: unit.project_name,
            description: revenueDesc,
            username: username
        });

        // 2. قيد الدفعة المقدمة (تحصيل نقدية وتخفيض مديونية العميل)
        if (parseFloat(down_payment) > 0) {
            const dpDesc = `تحصيل دفعة مقدمة - عقد #${contractId} - وحدة ${unit.unit_number} - عميل: ${customerName}`;
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: 'صندوق نقدية - تيد كابيتال',
                creditAccount: 'عملاء (حسابات مدينة - AR)',
                amount: parseFloat(down_payment),
                costCenter: unit.project_name,
                description: dpDesc,
                username: username
            });
        }

        await client.query('COMMIT');
        res.json({ success: true, id: contractId, message: `تم حفظ العقد وتوليد ${numPayments} قسط بنجاح` });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

const payInstallment = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { installment_id, paymentAmount, payment_method, reference_no } = req.body;
        const username = req.user ? req.user.username : 'System';
        const instId = Number(installment_id);
        if (isNaN(instId)) {
            console.error("DEBUG ERROR: Invalid installment_id received:", installment_id);
            throw new Error("رقم القسط غير صالح");
        }
        console.log("DEBUG: Processing payment for ID:", instId);
        
        const instRes = await client.query(`
            SELECT i.id, i.amount, i.status, c.project_name, cu.name as customer_name, u.unit_number
            FROM real_estate_installments i 
            LEFT JOIN real_estate_contracts c ON i.contract_id = c.id 
            LEFT JOIN customers cu ON c.customer_id = cu.id 
            LEFT JOIN real_estate_units u ON c.unit_id = u.id
            WHERE i.id = $1
        `, [instId]);
        
        console.log("DEBUG: Query rows count:", instRes.rows.length);
        
        if (instRes.rows.length === 0) {
            console.error("DEBUG ERROR: No row found for ID:", installment_id);
            throw new Error(`القسط رقم ${installment_id} غير موجود في سجلات النظام`);
        }
        const installment = instRes.rows[0];
        const projectName = installment.project_name || 'General';

        await client.query("UPDATE real_estate_installments SET status = 'Paid', paid_amount = $1 WHERE id = $2", [paymentAmount, instId]);
        
        // 🌟 القيد المحاسبي الموحد (Unified GL Posting)
        let desc = `سداد قسط عقاري [${payment_method}] - مرجع: ${reference_no || '---'} - عميل: ${installment.customer_name} - وحدة: ${installment.unit_number}`;
        
        let debitAccount = 'صندوق نقدية - تيد كابيتال';
        if (payment_method === 'Bank' || payment_method === 'Transfer') debitAccount = 'بنك CIB - تيد كابيتال';
        
        if (payment_method === 'Wallet') {
            const custRes = await client.query("SELECT id, credit_balance FROM customers WHERE name = $1 FOR UPDATE", [installment.customer_name]);
            if (custRes.rows.length === 0) throw new Error("بيانات العميل غير مكتملة لاستخدام المحفظة");
            const availableCredit = parseFloat(custRes.rows[0].credit_balance || 0);
            if (availableCredit < parseFloat(paymentAmount)) throw new Error(`رصيد المحفظة غير كافٍ. المتاح: ${availableCredit}`);
            
            await client.query("UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2", [paymentAmount, custRes.rows[0].id]);
            debitAccount = '2130'; // Customer Prepayments / Wallet
            desc = `خصم من محفظة العميل لسداد قسط - عميل: ${installment.customer_name} - وحدة: ${installment.unit_number}`;
        }

        await AccountingService.recordDoubleEntry(client, {
            debitAccount: debitAccount,
            creditAccount: 'عملاء (حسابات مدينة - AR)',
            amount: parseFloat(paymentAmount),
            costCenter: projectName,
            description: desc,
            username: username
        });

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

const createPreOrder = async (req, res) => {
    const { client_id, po_id, reserved_qty, unit_price, advance_payment } = req.body;
    const client = await pool.connect(); 
    try {
        await client.query('BEGIN');
        const poRes = await client.query("SELECT project_name FROM purchase_orders WHERE id = $1", [po_id]);
        const projectName = poRes.rows[0]?.project_name || 'General';

        const insertPreOrderQuery = `
            INSERT INTO client_preorders (client_id, po_id, reserved_qty, unit_price, advance_payment, status, metadata) 
            VALUES ($1, $2, $3, $4, $5, 'Pending', $6)
        `;
        const history = [{ date: new Date(), amount: advance_payment, type: 'Initial Booking' }];
        await client.query(insertPreOrderQuery, [client_id, po_id, reserved_qty, unit_price, advance_payment, JSON.stringify({ history })]);
        
        // 🌟 Integration with AccountingService for Audit-Ready double-entry
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: 'صندوق نقدية - تيد كابيتال',
            creditAccount: 'دفعات مقدمة من العملاء',
            amount: parseFloat(advance_payment),
            costCenter: projectName,
            description: `دفعة مقدمة حجز صنف - عميل ID: ${client_id}`,
            username: req.user.username,
            sourceModule: 'RealEstate'
        });

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const generateInstallments = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { contract_id, years, frequency, start_date } = req.body;
        
        const contractRes = await client.query("SELECT * FROM real_estate_contracts WHERE id = $1 FOR UPDATE", [contract_id]);
        if (contractRes.rows.length === 0) throw new Error("العقد غير موجود.");
        const contract = contractRes.rows[0];
        
        // مسح الأقساط القديمة إذا وجدت (في حالة إعادة الجدولة)
        await client.query("DELETE FROM real_estate_installments WHERE contract_id = $1 AND status != 'Paid'", [contract_id]);

        // تحديد القفزة الزمنية بناءً على التردد
        let monthStep = 1;
        if (frequency === 'Quarterly') monthStep = 3;
        else if (frequency === 'Semi-Annual') monthStep = 6;
        else if (frequency === 'Annual') monthStep = 12;

        let numPayments = Math.floor((years * 12) / monthStep);
        const remainingValue = parseFloat(contract.total_price) - parseFloat(contract.down_payment);
        const amountPer = (remainingValue / numPayments).toFixed(2);
        
        let currDate = new Date(start_date);

        for (let i = 1; i <= numPayments; i++) {
            await client.query(
                "INSERT INTO real_estate_installments (contract_id, installment_no, due_date, amount, status) VALUES ($1, $2, $3, $4, 'Pending')",
                [contract.id, i.toString(), currDate.toISOString(), amountPer]
            );
            currDate.setMonth(currDate.getMonth() + monthStep);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `تم توليد ${numPayments} قسط بنجاح.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const fulfillPreOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const preOrderId = req.params.id;
        const logEntry = { date: new Date(), type: 'Fulfillment' };
        const preOrderRes = await client.query(
            `UPDATE client_preorders 
             SET status = 'Fulfilled', 
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $1::jsonb) 
             WHERE id = $2 RETURNING *`, 
            [JSON.stringify(logEntry), preOrderId]
        );
        if (preOrderRes.rows.length === 0) throw new Error("الحجز غير موجود.");
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const updateProject = async (req, res) => {
    const { id } = req.params;
    const { name, type, location, total_units } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'edit')) throw new Error("Access Denied.");
        await pool.query(
            "UPDATE real_estate_projects SET name=$1, type=$2, location=$3, total_units=$4 WHERE id=$5",
            [name, type, location, total_units, id]
        );
        await logAudit(req.user.username, 'UPDATE', 'real_estate_projects', id, `Updated project: ${name}`);
        res.json({ success: true, message: "تم تحديث المشروع بنجاح" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        if (!hasAccess(req.user, 'real_estate', 'delete')) throw new Error("Access Denied.");
        const unitCheck = await pool.query("SELECT id FROM real_estate_units WHERE project_id = $1", [id]);
        if (unitCheck.rows.length > 0) throw new Error("لا يمكن حذف مشروع مرتبط بوحدات عقارية. احذف الوحدات أولاً.");
        const oldRes = await pool.query("SELECT * FROM real_estate_projects WHERE id = $1", [id]);
        const oldProject = oldRes.rows[0];
        await pool.query("DELETE FROM real_estate_projects WHERE id = $1", [id]);
        await logAdvancedAudit(pool, req.user.username, 'real_estate_projects', id, 'DELETE', `Deleted project ID: ${id}`, oldProject, null);
        res.json({ success: true, message: "تم حذف المشروع بنجاح مع تسجيل التدقيق الأمني." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteUnit = async (req, res) => {
    const { id } = req.params;
    try {
        if (!hasAccess(req.user, 'real_estate', 'delete')) throw new Error("Access Denied.");
        const contractCheck = await pool.query("SELECT id FROM real_estate_contracts WHERE unit_id = $1", [id]);
        if (contractCheck.rows.length > 0) throw new Error("لا يمكن حذف وحدة مرتبطة بعقد مبيعات.");
        const oldRes = await pool.query("SELECT * FROM real_estate_units WHERE id = $1", [id]);
        const oldUnit = oldRes.rows[0];
        await pool.query("DELETE FROM real_estate_units WHERE id = $1", [id]);
        await logAdvancedAudit(pool, req.user.username, 'real_estate_units', id, 'DELETE', `Deleted unit ID: ${id}`, oldUnit, null);
        res.json({ success: true, message: "تم حذف الوحدة بنجاح مع تسجيل التدقيق الأمني." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateContract = async (req, res) => {
    const { id } = req.params;
    const { total_price, down_payment, contract_date } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'edit')) throw new Error("Access Denied.");
        await pool.query(
            "UPDATE real_estate_contracts SET total_price=$1, down_payment=$2, contract_date=$3 WHERE id=$4",
            [total_price, down_payment, contract_date, id]
        );
        await logAudit(req.user.username, 'UPDATE', 'real_estate_contracts', id, `Updated contract ID: ${id}`);
        res.json({ success: true, message: "تم تحديث بيانات العقد" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteContract = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        if (!hasAccess(req.user, 'real_estate', 'delete')) throw new Error("Access Denied.");
        await client.query('BEGIN');
        const contRes = await client.query("SELECT * FROM real_estate_contracts WHERE id = $1", [id]);
        if (contRes.rows.length === 0) throw new Error("العقد غير موجود");
        const oldContract = contRes.rows[0];
        
        await client.query("UPDATE real_estate_units SET status = 'Available' WHERE id = $1", [oldContract.unit_id]);
        await client.query("DELETE FROM real_estate_installments WHERE contract_id = $1", [id]);
        await client.query("DELETE FROM real_estate_contracts WHERE id = $1", [id]);
        
        await logAdvancedAudit(client, req.user.username, 'real_estate_contracts', id, 'DELETE', `Deleted/Cancelled contract ID: ${id} and liberated unit #${oldContract.unit_id}`, oldContract, null);
        await client.query('COMMIT');
        res.json({ success: true, message: "تم فسخ العقد وتحرير الوحدة بنجاح مع تسجيل التدقيق الأمني." });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
};

const updateInstallment = async (req, res) => {
    const { id } = req.params;
    const { amount, due_date, status } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'edit')) throw new Error("Access Denied.");
        await pool.query(
            "UPDATE real_estate_installments SET amount=$1, due_date=$2, status=$3 WHERE id=$4",
            [amount, due_date, status, id]
        );
        await logAudit(req.user.username, 'UPDATE', 'real_estate_installments', id, `Updated installment ID: ${id}`);
        res.json({ success: true, message: "تم تحديث القسط" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteInstallment = async (req, res) => {
    const { id } = req.params;
    try {
        if (!hasAccess(req.user, 'real_estate', 'delete')) throw new Error("Access Denied.");
        const instRes = await pool.query("SELECT * FROM real_estate_installments WHERE id = $1", [id]);
        const oldInst = instRes.rows[0];
        if (oldInst?.status === 'Paid') throw new Error("لا يمكن حذف قسط تم تحصيله بالفعل.");
        await pool.query("DELETE FROM real_estate_installments WHERE id = $1", [id]);
        await logAdvancedAudit(pool, req.user.username, 'real_estate_installments', id, 'DELETE', `Deleted installment ID: ${id}`, oldInst, null);
        res.json({ success: true, message: "تم حذف القسط مع تسجيل التدقيق الأمني." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const refundPreOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { amount, refund_account } = req.body;
        const username = req.user ? req.user.username : 'System';

        const poRes = await client.query("SELECT * FROM client_preorders WHERE id = $1 FOR UPDATE", [id]);
        if (poRes.rows.length === 0) throw new Error("الحجز غير موجود");
        const preorder = poRes.rows[0];

        const refundAmt = parseFloat(amount || preorder.advance_payment);
        if (refundAmt <= 0) throw new Error("مبلغ الاسترداد غير صالح");
        if (refundAmt > parseFloat(preorder.advance_payment)) throw new Error("المبلغ المطلوب أكبر من العربون المتاح");

        // 1. Accounting: Debit Prepayments (Liability Decr), Credit Cash/Bank (Asset Decr)
        const revRes = await AccountingService.recordDoubleEntry(client, {
            debitAccount: 'دفعات مقدمة من العملاء',
            creditAccount: refund_account || 'صندوق نقدية - تيد كابيتال',
            amount: refundAmt,
            costCenter: 'RealEstate',
            description: `استرداد دفعة مقدمة حجز - عميل ID: ${preorder.client_id} - حجز #${id}`,
            username
        });

        // 2. Update status and metadata
        const logEntry = { date: new Date(), amount: refundAmt, type: 'Refund', account: refund_account };
        await client.query(
            `UPDATE client_preorders 
             SET status = CASE WHEN (advance_payment - $1) <= 0 THEN 'Refunded' ELSE status END, 
                 advance_payment = advance_payment - $1,
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $2::jsonb) 
             WHERE id = $3`,
            [refundAmt, JSON.stringify(logEntry), id]
        );

        await logAdvancedAudit(client, username, 'client_preorders', id, 'REFUND', `Refunded ${refundAmt} for preorder #${id}. Journal Entry #${revRes?.debitId || 'N/A'}`, preorder, null);
        await client.query('COMMIT');
        res.json({ success: true, message: "تم الاسترداد بنجاح مع تسجيل التدقيق الأمني." });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
};

const transferPreOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { target_client_id, amount } = req.body;
        const username = req.user ? req.user.username : 'System';

        const poRes = await client.query("SELECT * FROM client_preorders WHERE id = $1 FOR UPDATE", [id]);
        if (poRes.rows.length === 0) throw new Error("الحجز غير موجود");
        const preorder = poRes.rows[0];

        const transferAmt = parseFloat(amount || preorder.advance_payment);
        if (transferAmt <= 0) throw new Error("مبلغ التحويل غير صالح");
        if (transferAmt > parseFloat(preorder.advance_payment)) throw new Error("المبلغ المطلوب أكبر من العربون المتاح");

        // 1. Update metadata of source
        const logEntrySource = { date: new Date(), amount: transferAmt, type: 'TransferOut', target_client: target_client_id };
        await client.query(
            `UPDATE client_preorders 
             SET status = CASE WHEN (advance_payment - $1) <= 0 THEN 'Transferred' ELSE status END,
                 advance_payment = advance_payment - $1,
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $2::jsonb) 
             WHERE id = $3`,
            [transferAmt, JSON.stringify(logEntrySource), id]
        );

        // 2. Update target customer balance (Transfer to General Credit)
        await client.query("UPDATE customers SET credit_balance = COALESCE(credit_balance, 0) + $1 WHERE id = $2", [transferAmt, target_client_id]);

        await logAdvancedAudit(client, username, 'client_preorders', id, 'REFUND', `Transferred ${transferAmt} from preorder #${id} to client #${target_client_id}`, preorder, null);
        await client.query('COMMIT');
        res.json({ success: true, message: "تم التحويل بنجاح مع تسجيل التدقيق الأمني." });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
};

const updateUnit = async (req, res) => {
    const { id } = req.params;
    const { unit_number, type, area, floor, price, status } = req.body;
    try {
        if (!hasAccess(req.user, 'real_estate', 'edit')) throw new Error("Access Denied.");
        await pool.query(
            "UPDATE real_estate_units SET unit_number=$1, type=$2, area=$3, floor=$4, price=$5, status=$6 WHERE id=$7",
            [unit_number, type, area, floor, price, status || 'Available', id]
        );
        await logAudit(req.user.username, 'UPDATE', 'real_estate_units', id, `Updated unit: ${unit_number}`);
        res.json({ success: true, message: "تم تحديث الوحدة بنجاح" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
    addProject,
    addUnit,
    createContract,
    payInstallment,
    createPreOrder,
    generateInstallments,
    fulfillPreOrder,
    updateProject,
    updateUnit,
    updateContract,
    updateInstallment,
    deleteProject,
    deleteUnit,
    deleteContract,
    deleteInstallment,
    refundPreOrder,
    transferPreOrder
};
