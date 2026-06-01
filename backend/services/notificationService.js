const pool = require('../config/db');
const { sendEmailNotification } = require('../config/mailer');

class NotificationService {
    /**
     * Sends a unified notification through multiple channels
     * @param {number|string} userId - Target user ID or Role name
     * @param {string} title - Notification title
     * @param {string} message - Notification body
     * @param {object} options - { metadata, severity, category, actionLink, expiresAt }
     */
    async notify(userId, title, message, options = {}) {
        const {
            metadata = {},
            severity = 'info',
            category = 'general',
            actionLink = null,
            expiresAt = null
        } = options;

        try {
            let targetUsers = [];
            if (typeof userId === 'string' && isNaN(userId)) {
                const usersRes = await pool.query("SELECT id, email, phone FROM users WHERE role ILIKE $1 OR role ILIKE '%Admin%'", [userId]);
                targetUsers = usersRes.rows;
            } else {
                const userRes = await pool.query("SELECT id, email, phone FROM users WHERE id = $1", [userId]);
                targetUsers = userRes.rows;
            }

            for (const user of targetUsers) {
                // 1. Internal System Notification (DB)
                await pool.query(
                    `INSERT INTO notifications 
                    (user_id, title, message, metadata, severity, category, action_link, expires_at, is_read) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
                    [user.id, title, message, JSON.stringify(metadata), severity, category, actionLink, expiresAt]
                );

                // 2. Email Notification (Priority for Critical/Strategic)
                if (user.email && (severity === 'critical' || severity === 'strategic')) {
                    await sendEmailNotification(user.email, `[${severity.toUpperCase()}] ${title}`, message, true);
                }

                // 3. WhatsApp (Strategic/Critical Only)
                if (user.phone && (severity === 'critical' || severity === 'strategic')) {
                    const waIcon = severity === 'strategic' ? '🔴' : '🟠';
                    await this.sendWhatsApp(user.phone, `${waIcon} *TED ERP - ${severity.toUpperCase()} ALERT*\n\n*${title}*\n${message}\n\n🔗 _Open ERP for Action_`);
                }
            }

            console.log(`🚀 Omnichannel notifications [${severity}] processed for ${targetUsers.length} users.`);
        } catch (err) {
            console.error("🔥 Notification Service Error:", err.message);
        }
    }

    async send(userId, title, message, channel, options = {}) {
        const severity = options.severity || 'info';
        const category = options.category || 'general';
        const actionLink = options.actionLink || null;

        try {
            let targetUsers = [];
            if (typeof userId === 'string' && isNaN(userId)) {
                const usersRes = await pool.query("SELECT id, email, phone FROM users WHERE role ILIKE $1 OR role ILIKE '%Admin%'", [userId]);
                targetUsers = usersRes.rows;
            } else {
                const userRes = await pool.query("SELECT id, email, phone FROM users WHERE id = $1", [userId]);
                targetUsers = userRes.rows;
            }

            for (const user of targetUsers) {
                const channelLower = (channel || '').toLowerCase();
                if (channelLower === 'in-app' || channelLower === 'system' || channelLower === 'in_app') {
                    await pool.query(
                        `INSERT INTO notifications 
                        (user_id, title, message, metadata, severity, category, action_link, is_read) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
                        [user.id, title, message, JSON.stringify(options), severity, category, actionLink]
                    );
                } else if (channelLower === 'email') {
                    if (user.email) {
                        await sendEmailNotification(user.email, title, message, true);
                    }
                } else if (channelLower === 'whatsapp') {
                    if (user.phone) {
                        await this.sendWhatsApp(user.phone, message);
                    }
                }
            }
        } catch (err) {
            console.error("🔥 Notification Service send channel error:", err.message);
        }
    }

    async sendWhatsApp(phone, message) {
        console.log(`📱 [WHATSAPP] To: ${phone} | Message: ${message}`);
        try {
            const { sendWhatsAppMessage } = require('./whatsappService');
            const res = await sendWhatsAppMessage(phone, message);
            
            await pool.query(
                "INSERT INTO system_events (event_type, event_source, description, metadata) VALUES ($1, $2, $3, $4)",
                ['WHATSAPP_SENT', 'NotificationService', `WhatsApp message sent to ${phone} (Result: ${res.success ? 'Success' : 'Failed'})`, JSON.stringify({ message, result: res })]
            );
        } catch (e) {
            console.error("Failed to send/log WhatsApp:", e.message);
        }
    }

    /**
     * Strategic Alert: Liquidity Risk
     */
    async alertLiquidityRisk(amount, days) {
        const title = "⚠️ Liquidity Risk Warning";
        const message = `Financial analysis predicts a liquidity gap of ${amount.toLocaleString()} LCY within the next ${days} days. Immediate asset reallocation or credit review recommended.`;
        await this.notify('Admin', title, message, {
            severity: 'strategic',
            category: 'finance',
            actionLink: '/reports'
        });
    }

    /**
     * Operational Alert: Budget Threshold
     */
    async alertBudgetThreshold(projectName, percent, currentSpend) {
        const title = `📊 Budget Alert: ${projectName}`;
        const message = `Project has reached ${percent}% of its total allocation. Current spend: ${currentSpend.toLocaleString()} LCY.`;
        await this.notify('Admin', title, message, {
            severity: 'critical',
            category: 'projects',
            actionLink: '/projects'
        });
    }

    /**
     * Alerts authorizers about a new record awaiting their approval
     */
    async notifyPendingAuthorization(moduleName, recordId, amount, makerUsername) {
        const title = `⚡ Pending Authorization: ${moduleName}`;
        const message = `A new record (${recordId || 'Draft'}) in ${moduleName} for ${amount.toLocaleString()} LCY has been submitted by ${makerUsername} and is awaiting your authorization.`;
        await this.notify('Admin', title, message, {
            severity: 'critical',
            category: 'workflow',
            actionLink: '/approval-inbox'
        });
    }
}

module.exports = new NotificationService();
