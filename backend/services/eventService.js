const pool = require('../config/db');
const notificationService = require('./notificationService');

/**
 * EventService: The Central Nervous System of the ERP
 * Listens for system events and triggers downstream actions (notifications, logs, triggers).
 */
class EventService {
    /**
     * Emit a new system event
     * @param {string} type - Event Type (e.g., 'STOCK_LOW')
     * @param {string} source - Source Module (e.g., 'Inventory')
     * @param {object} payload - Event Data
     */
    async emit(type, source, payload) {
        try {
            // 1. Log Event to Database
            const result = await pool.query(
                'INSERT INTO system_events (event_type, source_module, payload) VALUES ($1, $2, $3) RETURNING id',
                [type, source, JSON.stringify(payload)]
            );
            const eventId = result.rows[0].id;

            // 2. Process Event (Find Subscribers & Send Notifications)
            await this.processEvent(eventId, type, payload);

            // 3. Update Status
            await pool.query('UPDATE system_events SET status = \'PROCESSED\' WHERE id = $1', [eventId]);
            console.log(`📡 Event [${type}] from [${source}] processed successfully.`);
        } catch (error) {
            console.error(`🔥 Failed to emit event [${type}]:`, error);
        }
    }

    /**
     * Process an event by checking subscriptions and triggering notifications
     */
    async processEvent(eventId, type, payload) {
        try {
            // Find users subscribed to this event type
            const subscribers = await pool.query(
                'SELECT user_id, channels FROM notification_subscriptions WHERE event_type = $1',
                [type]
            );

            // Fetch custom templates if they exist
            const templateRes = await pool.query(
                'SELECT * FROM crm_templates WHERE name = $1',
                [type]
            );
            const templates = templateRes.rows;

            // Resolve the active company name based on the current tenant database
            let activeDb = 'erp_ted_capital';
            try {
                const dbRes = await pool.query('SELECT current_database() AS db');
                activeDb = dbRes.rows[0]?.db || 'erp_ted_capital';
            } catch (dbErr) {
                console.error("Error getting current database:", dbErr.message);
            }

            let resolvedCompanyName = 'TED Capital';
            try {
                const { centralPool } = require('../config/db');
                const compRes = await centralPool.query('SELECT name FROM companies WHERE db_name = $1 LIMIT 1', [activeDb]);
                if (compRes.rows.length > 0) {
                    resolvedCompanyName = compRes.rows[0].name;
                } else {
                    const mapping = {
                        'erp_ted_capital': 'TED Capital',
                        'erp_design_concept': 'Design Concept',
                        'erp_primemed_pharma': 'PrimeMed Pharma',
                        'erp_master_builder': 'Master Builder'
                    };
                    resolvedCompanyName = mapping[activeDb] || 'TED Capital';
                }
            } catch (compErr) {
                const mapping = {
                    'erp_ted_capital': 'TED Capital',
                    'erp_design_concept': 'Design Concept',
                    'erp_primemed_pharma': 'PrimeMed Pharma',
                    'erp_master_builder': 'Master Builder'
                };
                resolvedCompanyName = mapping[activeDb] || 'TED Capital';
            }

            const templatesToProcess = templates.length > 0 ? templates : [null];

            for (const template of templatesToProcess) {
                let title = `تنبيه النظام: ${type}`;
                let message = `حدث جديد في النظام: ${type}`;

                if (template) {
                    title = template.subject || title;
                    message = template.body;
                } else {
                    // Hardcoded defaults if template not found
                    if (type === 'STOCK_LOW') {
                        title = '🚨 انخفاض مستوى المخزون';
                        message = `المنتج [${payload.item_name || 'غير معروف'}] وصل للحد الأدنى (${payload.current_qty || 0}). يرجى إعادة الطلب.`;
                    } else if (type === 'INVOICE_OVERDUE') {
                        title = '⏳ فاتورة متأخرة السداد';
                        message = `الفاتورة رقم [${payload.invoice_no || ''}] للعميل [${payload.client_name || ''}] تجاوزت موعد الاستحقاق.`;
                    }
                }

                // Replace all placeholders dynamically in both subject (title) and body (message)
                const eventPayload = payload || {};
                if (!eventPayload.company_name) {
                    eventPayload.company_name = resolvedCompanyName;
                }

                // Ensure {{company_name}} replacement is always done even if it was overridden or if payload is empty
                for (const key in eventPayload) {
                    const regexDouble = new RegExp(`{{${key}}}`, 'g');
                    const regexSingle = new RegExp(`{${key}}`, 'g');
                    const val = eventPayload[key] !== null && eventPayload[key] !== undefined ? eventPayload[key] : '';
                    message = message.replace(regexDouble, val);
                    message = message.replace(regexSingle, val);
                    title = title.replace(regexDouble, val);
                    title = title.replace(regexSingle, val);
                }

                // Extra insurance for company_name replacement in title/message if not covered by eventPayload keys
                const compDouble = new RegExp('{{company_name}}', 'g');
                const compSingle = new RegExp('{company_name}', 'g');
                message = message.replace(compDouble, eventPayload.company_name);
                message = message.replace(compSingle, eventPayload.company_name);
                title = title.replace(compDouble, eventPayload.company_name);
                title = title.replace(compSingle, eventPayload.company_name);

                // Determine recipient type and target users
                const recType = template ? (template.recipient_type || 'Both') : 'Both';
                const recUsers = template ? (typeof template.recipient_users === 'string' ? JSON.parse(template.recipient_users) : (template.recipient_users || { roles: [], userIds: [] })) : { roles: [], userIds: [] };

                let targetUserIds = [];
                if (recType === 'User' || recType === 'Both') {
                    if (recUsers.userIds && recUsers.userIds.length > 0) {
                        targetUserIds.push(...recUsers.userIds.map(id => parseInt(id)));
                    }
                    if (recUsers.roles && recUsers.roles.length > 0) {
                        try {
                            const roleParams = recUsers.roles.map(r => `%${r}%`);
                            const rolesRes = await pool.query("SELECT id FROM users WHERE role ILIKE ANY($1::varchar[])", [roleParams]);
                            rolesRes.rows.forEach(r => targetUserIds.push(r.id));
                        } catch (roleErr) {
                            console.error("Error resolving roles:", roleErr.message);
                        }
                    }
                    
                    // Remove duplicates
                    targetUserIds = [...new Set(targetUserIds)];

                    // If no specific users/roles resolved, check subscribers
                    if (targetUserIds.length === 0) {
                        subscribers.rows.forEach(sub => targetUserIds.push(sub.user_id));
                    }

                    // If still empty, default to Admin
                    if (targetUserIds.length === 0) {
                        const adminsRes = await pool.query("SELECT id FROM users WHERE role ILIKE '%Admin%'");
                        adminsRes.rows.forEach(r => targetUserIds.push(r.id));
                    }
                }

                // Channel to send
                const templateChannel = template ? (template.type || 'WhatsApp') : 'WhatsApp';

                // Send to Users/Staff
                if (recType === 'User' || recType === 'Both') {
                    for (const uId of targetUserIds) {
                        const subChanRes = await pool.query("SELECT channels FROM notification_subscriptions WHERE user_id = $1 AND event_type = $2", [uId, type]);
                        let channels = subChanRes.rows[0]?.channels;
                        if (!channels) {
                            const subRow = subscribers.rows.find(s => s.user_id === uId);
                            channels = subRow ? subRow.channels : [templateChannel];
                        }
                        const activeChannels = Array.isArray(channels) ? channels : (typeof channels === 'string' ? JSON.parse(channels) : [templateChannel]);
                        for (const channel of activeChannels) {
                            await notificationService.send(uId, title, message, channel, { event_id: eventId, ...payload });
                        }
                    }
                }

                // Send to Customer/Client
                if (recType === 'Customer' || recType === 'Both') {
                    const customerPhone = payload.phone || payload.customer_phone || payload.client_phone || payload.phone_number;
                    const customerEmail = payload.email || payload.customer_email || payload.client_email || payload.email_address;
                    
                    if (templateChannel.toLowerCase() === 'whatsapp' && customerPhone) {
                        await notificationService.sendWhatsApp(customerPhone, message);
                    } else if (templateChannel.toLowerCase() === 'email' && customerEmail) {
                        const { sendEmailNotification } = require('../config/mailer');
                        await sendEmailNotification(customerEmail, title, message, true);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error processing event logic:`, error);
        }
    }
}

module.exports = new EventService();
