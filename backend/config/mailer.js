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
async function sendEmailNotification(userIdOrEmail, title, message, isEmailDirect = false, attachments = null) {
    let userEmail = isEmailDirect ? userIdOrEmail : '';
    try {
        if (!isEmailDirect) {
            const userRes = await pool.query("SELECT email FROM users WHERE id = $1 AND email IS NOT NULL AND email != ''", [userIdOrEmail]);
            if (userRes.rows.length > 0) {
                userEmail = userRes.rows[0].email;
            }
        }

        // Fetch Admin email from central database dynamically
        let adminEmail = 'ahmedzidan2013@gmail.com';
        try {
            const { centralPool } = require('./db');
            const adminRes = await centralPool.query("SELECT email FROM users WHERE username = 'admin' LIMIT 1");
            if (adminRes.rows.length > 0 && adminRes.rows[0].email) {
                adminEmail = adminRes.rows[0].email;
            }
        } catch (adminErr) {
            console.error("Failed to fetch admin email for copy:", adminErr.message);
        }

        // Fetch Company email from central database dynamically based on active DB
        let companyEmail = process.env.EMAIL_USER || 'tedcapital.org@GMAIL.COM';
        try {
            const dbRes = await pool.query('SELECT current_database() AS db');
            const activeDb = dbRes.rows[0]?.db || 'erp_ted_capital';
            
            const { centralPool } = require('./db');
            const compRes = await centralPool.query("SELECT email FROM companies WHERE db_name = $1 LIMIT 1", [activeDb]);
            if (compRes.rows.length > 0 && compRes.rows[0].email) {
                companyEmail = compRes.rows[0].email;
            }
        } catch (compErr) {
            console.error("Failed to fetch company email:", compErr.message);
        }

        // Build unique recipient list (sending to primary recipient and admin copy)
        const recipients = [];
        if (userEmail && userEmail.trim() !== '') {
            recipients.push(userEmail.trim().toLowerCase());
        }
        if (adminEmail && adminEmail.trim() !== '' && !recipients.includes(adminEmail.trim().toLowerCase())) {
            recipients.push(adminEmail.trim().toLowerCase());
        }

        for (const recipient of recipients) {
            try {
                const mailOptions = {
                    from: companyEmail,
                    to: recipient,
                    subject: title,
                    text: message
                };
                if (attachments && Array.isArray(attachments)) {
                    mailOptions.attachments = attachments;
                }
                await transporter.sendMail(mailOptions);
                await pool.query("INSERT INTO email_logs (recipient, subject, body, sent_by, status) VALUES ($1, $2, $3, $4, $5)", [recipient, title, message, 'System Auto', 'Sent']);
                console.log(`📧 Email sent from ${companyEmail} to ${recipient} regarding: ${title} (Attachments: ${attachments ? attachments.length : 0})`);
            } catch (sendErr) {
                console.error(`🔥 Email send failed for recipient ${recipient}:`, sendErr.message);
                await pool.query("INSERT INTO email_logs (recipient, subject, body, sent_by, status) VALUES ($1, $2, $3, $4, $5)", [recipient, title, message, 'System Auto', 'Failed: ' + sendErr.message]);
            }
        }
    } catch(e) {
        console.error("🔥 Email notification process failed:", e.message);
    }
}

// دالة فحص المخزون وإرسال التنبيه تم تجميعها هنا لتجنب التكرار
const checkAndSendLowStockEmail = async (inventoryId) => {
    try {
        const invRes = await pool.query("SELECT item_name, project_name, quantity, remaining_qty FROM inventory_items WHERE id = $1", [inventoryId]);
        if (invRes.rows.length > 0) {
            const item = invRes.rows[0];
            const totalQty = parseFloat(item?.quantity || 0);
            const remainingQty = parseFloat(item?.remaining_qty || 0);
            
            if (totalQty > 0 && remainingQty <= (0.20 * totalQty)) {
                await sendEmailNotification(
                    process.env.ADMIN_EMAIL || 'admin@example.com', 
                    `⚠️ تحذير: نقص حاد في المخزون - ${item.item_name}`, 
                    `تنبيه من النظام: المخزون الخاص بـ "${item.item_name}" في مشروع "${item.project_name || 'Main Store'}" انخفض إلى 20% أو أقل.\n\nالكمية الأصلية: ${totalQty}\nالكمية المتبقية حالياً: ${remainingQty}`,
                    true
                );
            }
        }
    } catch (e) {
        console.error("[EMAIL ERROR] Failed to send low stock alert:", e);
    }
};

module.exports = { transporter, sendEmailNotification, checkAndSendLowStockEmail };