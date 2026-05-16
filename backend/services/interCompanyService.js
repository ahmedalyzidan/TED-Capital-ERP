const pool = require('../config/db');

/**
 * Strategic Inter-Company Reconciliation Service (ICRS)
 * Handles automated AP/AR generation for multi-entity transactions.
 */
class InterCompanyService {
    
    /**
     * Reconciles a transaction between two internal companies.
     * @param {number} payerId - Company ID paying/buying
     * @param {number} receiverId - Company ID receiving/selling
     * @param {number} amount - Transaction amount
     * @param {string} description - Transaction details
     * @param {number} projectId - Associated Project ID in the Payer's system
     */
    async reconcileTransaction(payerId, receiverId, amount, description, projectId = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Company Names for Logging
            const companies = await client.query("SELECT id, name FROM companies WHERE id IN ($1, $2)", [payerId, receiverId]);
            const payer = companies.rows.find(c => c.id === payerId);
            const receiver = companies.rows.find(c => c.id === receiverId);

            if (!payer || !receiver) throw new Error("Invalid Inter-Company IDs");
            
            // 2. Record Transaction in Payer (Company A)
            // Debit: Expense/Asset | Credit: Inter-company Payable
            const AccountingService = require('./accountingService');
            const payerVoucher = `IC-PAY-${Date.now()}`;
            
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '5100', // Expense / Direct Cost
                creditAccount: '2500', // Inter-Company Payable (جاري الشركات الشقيقة)
                amount: amount,
                costCenter: projectId ? `Proj-${projectId}` : 'Inter-Company',
                description: `IC-Transfer To ${receiver.name}: ${description}`,
                username: 'System-ICR',
                referenceNo: payerVoucher,
                sourceModule: 'ICR',
                companyId: payerId,
                company: payer.name
            });

            // 3. Record Transaction in Receiver (Company B)
            // Debit: Inter-company Receivable | Credit: Revenue
            const receiverVoucher = `IC-REV-${Date.now()}`;
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '1120', // Accounts Receivable (or 2500 for Inter-company)
                creditAccount: '4100', // Inter-Company Revenue
                amount: amount,
                costCenter: 'Inter-Company',
                description: `IC-Revenue From ${payer.name}: ${description}`,
                username: 'System-ICR',
                referenceNo: receiverVoucher,
                sourceModule: 'ICR',
                companyId: receiverId,
                company: receiver.name
            });

            // 4. Log the Inter-Company Link for Audit
            await client.query(`
                INSERT INTO intercompany_transactions (source_company_id, target_company_id, amount, description, status, source_voucher, target_voucher)
                VALUES ($1, $2, $3, $4, 'Reconciled', $5, $6)
            `, [payerId, receiverId, amount, description, payerVoucher, receiverVoucher]);

            await client.query('COMMIT');
            return { success: true, payerVoucher, receiverVoucher };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("🔥 ICR Error:", err.message);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new InterCompanyService();
