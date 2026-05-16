const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');

const addPartner = async (req, res) => {
    const { name, type, investment_percentage, management_percentage } = req.body;
    try {
        if (!hasAccess(req.user, 'finance', 'create')) throw new Error("Access Denied.");
        const result = await pool.query(
            "INSERT INTO partners (name, type, investment_percentage, management_percentage) VALUES ($1, $2, $3, $4) RETURNING id",
            [name, type || 'Investment', investment_percentage || 0, management_percentage || 0]
        );
        const username = req.user ? req.user.username : 'System';
        await logAudit(username, 'CREATE', 'partners', result.rows[0].id, `Added partner: ${name}`);
        res.json({ success: true, message: "تم تسجيل الشريك بنجاح", id: result.rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const addTransaction = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!hasAccess(req.user, 'finance', 'create')) throw new Error("Access Denied.");
        await client.query('BEGIN');
        
        const username = req.user ? req.user.username : 'System';
        const { partner_id, type, amount, date, description } = req.body;
        const trxAmount = parseFloat(amount);

        // Fetch partner info
        const partnerRes = await client.query("SELECT * FROM partners WHERE id = $1 FOR UPDATE", [partner_id]);
        if (partnerRes.rows.length === 0) throw new Error("الشريك غير موجود");
        const partner = partnerRes.rows[0];

        // 1. Record Transaction
        const trxRes = await client.query(
            "INSERT INTO partner_transactions (partner_id, type, amount, date, description, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [partner_id, type, trxAmount, date || new Date().toISOString(), description, username]
        );
        const trxId = trxRes.rows[0].id;

        // 2. Update Partner Total Capital if it's an injection or withdrawal (Capital account)
        if (type === 'Capital Injection') {
            await client.query("UPDATE partners SET total_capital = total_capital + $1 WHERE id = $2", [trxAmount, partner_id]);
            // Accounting: Debit Cash, Credit Partner's Equity
            await AccountingService.recordDoubleEntry(
                client,
                '1101', // صندوق نقدية (Debit)
                '3100', // رأس المال (Credit)
                trxAmount,
                'General',
                `ضخ رأس مال من الشريك ${partner.name}: ${description}`,
                username
            );
        } else if (type === 'Withdrawal') {
            // Withdrawal can either reduce capital or be a drawing against profit. 
            // We assume it's a current account drawing (مسحوبات جاري الشركاء).
            await client.query("UPDATE partners SET total_capital = total_capital - $1 WHERE id = $2", [trxAmount, partner_id]);
            // Accounting: Debit Partner's Equity (or Drawings), Credit Cash
            await AccountingService.recordDoubleEntry(
                client,
                '3200', // جاري الشركاء (Debit)
                '1101', // صندوق نقدية (Credit)
                trxAmount,
                'General',
                `مسحوبات نقدية للشريك ${partner.name}: ${description}`,
                username
            );
        } else if (type === 'Profit Distribution') {
            // Profit distribution usually doesn't affect the base capital injected, but it's paid out or added to current account.
            // Let's assume it's directly paid out from Cash and deducted from Retained Earnings.
            // Or if it stays in the business, it increases Capital. Let's assume cash payout for now.
            await AccountingService.recordDoubleEntry(
                client,
                '3300', // الأرباح المبقاة (Debit)
                '1101', // صندوق نقدية (Credit)
                trxAmount,
                'General',
                `صرف أرباح للشريك ${partner.name}: ${description}`,
                username
            );
        }

        await logAudit(username, 'CREATE', 'partner_transactions', trxId, `Partner Trx: ${type} for ${partner.name}`);
        if (type === 'Withdrawal' || type === 'Profit Distribution') {
            await logAdvancedAudit(client, username, 'partners', partner_id, 'REVERSAL', `Partner ${type} of ${trxAmount} for ${partner.name}`, partner, { ...partner, total_capital: partner.total_capital - (type === 'Withdrawal' ? trxAmount : 0) });
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "تم تسجيل الحركة والقيود المحاسبية بنجاح", id: trxId });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] addTransaction:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

module.exports = {
    addPartner,
    addTransaction
};
