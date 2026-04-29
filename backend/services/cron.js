const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const pool = require('../config/db');
const { sendEmailNotification } = require('../config/mailer');
const { getPgExe, getDbUrl } = require('../utils/helpers');

let autoBackupTask = null;

async function setupAutoBackup() {
    if (autoBackupTask) autoBackupTask.stop();
    
    try {
        const res = await pool.query("SELECT category, value FROM system_parameters WHERE category IN ('BackupFrequency', 'BackupTime', 'BackupPath')");
        let freq = 'Daily', time = '02:00', bPath = path.join(__dirname, '../../uploads');
        
        res.rows.forEach(r => {
            if(r.category === 'BackupFrequency') freq = r.value;
            if(r.category === 'BackupTime') time = r.value;
            if(r.category === 'BackupPath' && r.value) bPath = r.value;
        });

        const [hr, min] = time.split(':');
        let cronStr = `${min} ${hr} * * *`; 
        if(freq === 'Weekly') cronStr = `${min} ${hr} * * 0`; 
        if(freq === 'Monthly') cronStr = `${min} ${hr} 1 * *`; 
        
        if (!fs.existsSync(bPath)) fs.mkdirSync(bPath, { recursive: true });

        console.log(`⏰ Auto Backup Scheduled: ${freq} at ${time} -> Saving to: ${bPath}`);
        
        autoBackupTask = cron.schedule(cronStr, async () => {
            console.log("🔄 Starting Automated Database Backup...");
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `ted_erp_backup_${dateStr}_${Date.now()}.backup`;
            const filePath = path.join(bPath, fileName);
            
            const cmd = `${getPgExe('pg_dump')} --dbname="${getDbUrl()}" -F c -f "${filePath}"`;
            
            exec(cmd, async (error, stdout, stderr) => {
                if (error) { console.error(`🔥 Auto Backup Failed: ${error.message}`); return; }
                console.log(`✅ Auto Backup Successful: ${fileName}`);
                try {
                    await pool.query("INSERT INTO backups_log (name, size, source) VALUES ($1, 'Unknown', 'Auto')", [fileName]);
                } catch(e) {}
            });
        });
    } catch (e) {
        console.error("Failed to setup dynamic cron backup", e.message);
    }
}

function startCronJobs() {
    setupAutoBackup();

    // مهمة فحص النواقص
    cron.schedule('0 * * * *', async () => {
        try {
            const usersRes = await pool.query("SELECT id, email, permissions FROM users WHERE status = 'Active'");
            const stockUsers = usersRes.rows.filter(u => u.permissions && u.permissions.notifications && u.permissions.notifications.includes('low_stock'));
            
            if (stockUsers.length > 0) {
                const stockRes = await pool.query("SELECT name, remaining_qty FROM inventory WHERE remaining_qty <= min_qty");
                for (const item of stockRes.rows) {
                    const msg = `Low Stock Alert: ${item.name} has dropped to ${item.remaining_qty}. Please restock.`;
                    for (const u of stockUsers) {
                        const notifRes = await pool.query(`INSERT INTO notifications (user_id, title, message) SELECT $1, 'Low Stock', $2 WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $1 AND message = $2 AND created_at >= CURRENT_DATE) RETURNING id`, [u.id, msg]);
                        if(notifRes.rows.length > 0 && u.email) await sendEmailNotification(u.id, 'Low Stock', msg);
                    }
                }
            }
        } catch(err) { console.error("Cron Error (Stock):", err.message); }
    });

    // مهام إيميلات العملاء (تم سحبها من apiRoutes وتعمل يومياً 9 صباحاً)
    cron.schedule('0 9 * * *', async () => { 
        try {
            const configRes = await pool.query("SELECT trigger_type, is_active FROM email_triggers_config");
            const configs = {};
            configRes.rows.forEach(r => configs[r.trigger_type] = r.is_active);

            // أقساط مستحقة
            if (configs['due_installment']) {
                const dueInsts = await pool.query(`SELECT installments.amount, installments.due_date, customers.email, customers.name FROM installments JOIN contracts ON installments.contract_id = contracts.id JOIN customers ON contracts.customer_id = customers.id WHERE installments.due_date < CURRENT_DATE AND installments.status != 'Paid' AND customers.email IS NOT NULL`);
                for (let inst of dueInsts.rows) {
                    await sendEmailNotification(inst.email, 'تذكير: قسط مستحق الدفع', `عزيزي ${inst.name}،\nنود تذكيركم بوجود قسط مستحق بقيمة ${inst.amount} بتاريخ ${new Date(inst.due_date).toLocaleDateString()}.\nيرجى السداد في أقرب وقت.`, true);
                }
            }

            // مديونيات متأخرة
            if (configs['due_amount']) {
                const dueDelays = await pool.query(`SELECT amount, due_date, customers.email, customers.name FROM client_delayed_payments JOIN customers ON client_delayed_payments.client_id = customers.id WHERE due_date < CURRENT_DATE AND client_delayed_payments.status != 'Paid' AND amount > 0 AND customers.email IS NOT NULL`);
                for (let debt of dueDelays.rows) {
                    await sendEmailNotification(debt.email, 'تذكير: مديونية مستحقة الدفع', `عزيزي ${debt.name}،\nنود تذكيركم بوجود مديونية مستحقة بقيمة ${debt.amount} بتاريخ ${new Date(debt.due_date).toLocaleDateString()}.\nيرجى السداد في أقرب وقت.`, true);
                }
            }
            
            // تذكير التسليم
            if (configs['handover_reminder']) {
                const handovers = await pool.query(`SELECT c.handover_date, cu.email, cu.name, pu.unit_number FROM contracts c JOIN customers cu ON c.customer_id = cu.id LEFT JOIN property_units pu ON c.unit_id = pu.id WHERE c.handover_date = CURRENT_DATE + INTERVAL '30 days' AND cu.email IS NOT NULL AND c.status = 'Active'`);
                for (let h of handovers.rows) {
                    await sendEmailNotification(h.email, 'تذكير: اقتراب موعد تسليم وحدتك', `عزيزي ${h.name}،\nيسعدنا إبلاغكم بأن موعد تسليم وحدتك رقم (${h.unit_number || 'غير محدد'}) قد اقترب، وسيكون بتاريخ ${new Date(h.handover_date).toLocaleDateString()}.\nيرجى التجهيز للاستلام.`, true);
                }
            }

        } catch (e) { console.error("[CRON JOB ERROR] Customer Emails:", e.message); }
    });
}

module.exports = { startCronJobs, setupAutoBackup };