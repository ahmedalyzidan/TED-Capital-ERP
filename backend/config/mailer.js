const nodemailer = require('nodemailer');
const pool = require('./db');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'tedcapital.org@GMAIL.COM',
        pass: process.env.EMAIL_PASS || 'gyge vljc sgpn qvuw'
    }
});

// تم إضافة isEmailDirect لتدعم الإرسال المباشر للإيميل دون البحث برقم المستخدم
async function sendEmailNotification(userIdOrEmail, title, message, isEmailDirect = false) {
    let userEmail = isEmailDirect ? userIdOrEmail : '';
    try {
        if (!isEmailDirect) {
            const userRes = await pool.query("SELECT email FROM users WHERE id = $1 AND email IS NOT NULL AND email != ''", [userIdOrEmail]);
            if (userRes.rows.length > 0) {
                userEmail = userRes.rows[0].email;
            }
        }

        if (userEmail) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || 'tedcapital.org@GMAIL.COM',
                to: userEmail,
                subject: `TED ERP System Alert: ${title}`,
                text: message
            });
            await pool.query("INSERT INTO email_logs (recipient, subject, body, sent_by, status) VALUES ($1, $2, $3, $4, $5)", [userEmail, `TED ERP System Alert: ${title}`, message, 'System Auto', 'Sent']);
            console.log(`📧 Email sent to ${userEmail} regarding: ${title}`);
        }
    } catch(e) {
        console.error("🔥 Email send failed:", e.message);
        if(userEmail) {
            await pool.query("INSERT INTO email_logs (recipient, subject, body, sent_by, status) VALUES ($1, $2, $3, $4, $5)", [userEmail, `TED ERP System Alert: ${title}`, message, 'System Auto', 'Failed: ' + e.message]);
        }
    }
}

// دالة فحص المخزون وإرسال التنبيه تم تجميعها هنا لتجنب التكرار
const checkAndSendLowStockEmail = async (inventoryId) => {
    try {
        const invRes = await pool.query("SELECT name, project_name, qty, remaining_qty FROM inventory WHERE id = $1", [inventoryId]);
        if (invRes.rows.length > 0) {
            const item = invRes.rows[0];
            const totalQty = parseFloat(item?.qty || 0);
            const remainingQty = parseFloat(item?.remaining_qty || 0);
            
            if (totalQty > 0 && remainingQty <= (0.20 * totalQty)) {
                await sendEmailNotification(
                    process.env.ADMIN_EMAIL || 'admin@example.com', 
                    `⚠️ تحذير: نقص حاد في المخزون - ${item.name}`, 
                    `تنبيه من النظام: المخزون الخاص بـ "${item.name}" في مشروع "${item.project_name || 'Main Store'}" انخفض إلى 20% أو أقل.\n\nالكمية الأصلية: ${totalQty}\nالكمية المتبقية حالياً: ${remainingQty}`,
                    true
                );
            }
        }
    } catch (e) {
        console.error("[EMAIL ERROR] Failed to send low stock alert:", e);
    }
};

module.exports = { transporter, sendEmailNotification, checkAndSendLowStockEmail };