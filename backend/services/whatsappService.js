const axios = require('axios');
const pool = require('../config/db');
const selfHostedWhatsapp = require('./selfHostedWhatsapp');

/**
 * Sends a WhatsApp message using either the self-hosted Baileys gateway or a third-party gateway (Ultramsg).
 * If no gateway is configured, it simulates the send in the console/logs.
 * 
 * @param {string} to - Recipient phone number (e.g. 01118764486)
 * @param {string} message - Message body content
 * @returns {Promise<{success: boolean, error?: string, messageId?: string, simulated?: boolean}>}
 */
async function sendWhatsAppMessage(to, message) {
    try {
        if (!to) {
            throw new Error("Phone number is required");
        }

        // Clean phone number: remove non-digits
        let cleanPhone = String(to).replace(/\D/g, '');
        // Egyptian number formatting
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
            cleanPhone = '20' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
            cleanPhone = '970' + cleanPhone;
        } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
            cleanPhone = '970' + cleanPhone.substring(1);
        }

        if (!cleanPhone) {
            throw new Error("Invalid phone number format");
        }

        // 1. Fetch settings from PostgreSQL database
        const settingsRes = await pool.query("SELECT whatsapp_enabled, metadata FROM settings LIMIT 1");
        if (settingsRes.rows.length === 0) {
            console.log("⚠️ [WhatsApp Service] No settings table row found.");
            return { success: false, error: "Settings not configured" };
        }

        const settings = settingsRes.rows[0];
        const metadata = settings.metadata || {};

        // 2. Check if WhatsApp alerts are enabled
        if (!settings.whatsapp_enabled) {
            console.log("⚠️ [WhatsApp Service] WhatsApp is disabled globally in Settings.");
            return { success: false, error: "WhatsApp disabled in settings" };
        }

        // 3. Delegate to self-hosted gateway if selected
        const whatsappType = metadata.whatsapp_type || 'ultramsg';
        if (whatsappType === 'self-hosted') {
            try {
                const res = await selfHostedWhatsapp.sendMessage(cleanPhone, message);
                return res;
            } catch (err) {
                console.error("❌ [WhatsApp Service] Self-hosted gateway send failed:", err.message);
                return { success: false, error: err.message };
            }
        }

        // 4. Extract credentials for Ultramsg
        const instanceId = metadata.whatsapp_instance_id || process.env.WHATSAPP_INSTANCE_ID;
        const token = metadata.whatsapp_token || process.env.WHATSAPP_TOKEN;

        if (!instanceId || !token) {
            console.log(`ℹ️ [WhatsApp Service Simulated] To: ${cleanPhone} | Message: ${message}`);
            return { success: true, simulated: true };
        }

        // 5. Fire the actual HTTP request to Ultramsg
        console.log(`📡 [WhatsApp Service] Sending auto-message to ${cleanPhone} via instance ${instanceId}...`);
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const response = await axios.post(url, {
            token: token,
            to: cleanPhone,
            body: message
        }, { timeout: 15000 });

        if (response.data && (response.data.sent === 'true' || response.data.sent === true || response.data.success)) {
            console.log(`✅ [WhatsApp Service] Sent successfully to ${cleanPhone}. Message ID: ${response.data.id || response.data.message_id}`);
            return { success: true, messageId: response.data.id || response.data.message_id };
        } else {
            throw new Error(JSON.stringify(response.data || "Unknown API error"));
        }

    } catch (err) {
        console.error("❌ [WhatsApp Service Error]:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendWhatsAppMessage };
