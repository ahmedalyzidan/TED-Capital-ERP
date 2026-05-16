const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const pool = require('../config/db');
const eventService = require('./eventService');
const batchService = require('./batchService');
const { getPgExe, getDbUrl } = require('../utils/helpers');

let autoBackupTask = null;

/**
 * Setup Automated Database Backups
 */
async function setupAutoBackup() {
    if (autoBackupTask) autoBackupTask.stop();
    
    try {
        const res = await pool.query("SELECT category, value FROM system_parameters WHERE category IN ('BackupFrequency', 'BackupTime', 'BackupPath')");
        let freq = 'Daily', time = '02:00', bPath = path.join(__dirname, '../../uploads/backups');
        
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

        const backupService = require('./backupService');
        autoBackupTask = cron.schedule(cronStr, async () => {
            console.log("🔄 Starting Automated Database Backup...");
            try {
                const result = await backupService.createBackup('AUTO');
                console.log(`✅ Auto Backup Successful: ${result.fileName}`);
            } catch (err) {
                console.error(`🔥 Auto Backup Failed: ${err.message}`);
            }
        });
    } catch (e) {
        console.error("Failed to setup dynamic cron backup", e.message);
    }
}

const intelligenceEngine = require('./intelligenceEngine');

/**
 * Start All System Cron Jobs
 */
function startCronJobs() {
    setupAutoBackup();

    // 1. Low Stock Check (Hourly)
    cron.schedule('0 * * * *', async () => {
        try {
            const stockRes = await pool.query("SELECT item_name as name, remaining_qty, min_stock_level as min_qty FROM inventory_items WHERE remaining_qty <= min_stock_level AND is_deleted = false");
            for (const item of stockRes.rows) {
                await eventService.emit('STOCK_LOW', 'Inventory', { 
                    item_name: item.name, 
                    current_qty: item.remaining_qty,
                    min_qty: item.min_qty
                });
            }
        } catch (err) { console.error("Cron Error (Stock):", err.message); }
    });

    // 2. Nightly Batch Processing (1 AM)
    cron.schedule('0 1 * * *', async () => {
        try {
            await batchService.runNightlyJobs();
        } catch (err) { console.error("Cron Error (Batch):", err.message); }
    });

    // 3. Strategic Intelligence & Financial Reminders (Daily 9 AM)
    cron.schedule('0 9 * * *', async () => {
        try {
            // Run World-Class Intelligence Engine
            await intelligenceEngine.runDiagnostics();

            const dueInsts = await pool.query(`
                SELECT i.amount, i.due_date, c.name as client_name, i.id as inst_id 
                FROM installments i
                JOIN contracts ct ON i.contract_id = ct.id 
                JOIN customers c ON ct.customer_id = c.id 
                WHERE i.due_date < CURRENT_DATE AND i.status != 'Paid'
            `);
            for (let inst of dueInsts.rows) {
                await eventService.emit('INVOICE_OVERDUE', 'Finance', { 
                    invoice_no: `INST-${inst.inst_id}`, 
                    client_name: inst.client_name,
                    amount: inst.amount
                });
            }
        } catch (e) { console.error("[CRON JOB ERROR]:", e.message); }
    });
}

module.exports = { startCronJobs, setupAutoBackup };