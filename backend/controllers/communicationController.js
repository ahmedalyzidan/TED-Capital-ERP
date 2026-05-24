const pool = require('../config/db');
const { logAdvancedAudit } = require('../utils/helpers');
const { sendWhatsAppMessage } = require('../services/whatsappService');

class CommunicationController {
    // 1. إدارة القوالب
    async createTemplate(req, res) {
        const { name, type, subject, body } = req.body;
        try {
            const result = await pool.query(
                `INSERT INTO crm_templates (name, type, subject, body) VALUES ($1, $2, $3, $4) RETURNING *`,
                [name, type, subject || null, body]
            );
            res.json({ success: true, template: result.rows[0] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTemplates(req, res) {
        try {
            const result = await pool.query(`SELECT * FROM crm_templates ORDER BY id DESC`);
            res.json({ success: true, templates: result.rows[0] ? result.rows : [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 2. إدارة الحملات
    async createCampaign(req, res) {
        const { title, channel, template_id, target_segment } = req.body;
        try {
            const result = await pool.query(
                `INSERT INTO crm_campaigns (title, channel, template_id, target_segment, status, created_by) 
                 VALUES ($1, $2, $3, $4, 'Draft', $5) RETURNING *`,
                [title, channel, template_id, target_segment, req.user?.username || 'System']
            );
            res.json({ success: true, campaign: result.rows[0] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCampaigns(req, res) {
        try {
            const result = await pool.query(`
                SELECT c.*, t.name as template_name 
                FROM crm_campaigns c
                LEFT JOIN crm_templates t ON c.template_id = t.id
                ORDER BY c.id DESC
            `);
            res.json({ success: true, campaigns: result.rows[0] ? result.rows : [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 3. إطلاق الحملة وإرسال الرسائل (مع محاكاة الإرسال)
    async launchCampaign(req, res) {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // جلب تفاصيل الحملة والقالب المربوط بها
            const campaignRes = await client.query(`
                SELECT c.*, t.body, t.subject 
                FROM crm_campaigns c
                JOIN crm_templates t ON c.template_id = t.id
                WHERE c.id = $1
            `, [id]);

            if (campaignRes.rows.length === 0) {
                return res.status(404).json({ error: "Campaign or template not found" });
            }

            const campaign = campaignRes.rows[0];
            if (campaign.status === 'Completed') {
                return res.status(400).json({ error: "Campaign is already completed" });
            }

            // تحديث حالة الحملة إلى قيد الإرسال
            await client.query(`UPDATE crm_campaigns SET status = 'Sending' WHERE id = $1`, [id]);

            // جلب المستهدفين بناءً على شريحة العملاء المستهدفة
            // سنبحث في العملاء (customers) و في العملاء المحتملين (crm_leads)
            let recipients = [];
            
            if (campaign.target_segment === 'All' || campaign.target_segment === 'Customers') {
                const custRes = await client.query(`SELECT id, name, phone, email FROM customers WHERE status = 'Active'`);
                custRes.rows.forEach(r => {
                    recipients.push({ id: r.id, name: r.name, phone: r.phone, email: r.email, type: 'Customer' });
                });
            }

            if (campaign.target_segment === 'All' || campaign.target_segment === 'Leads') {
                const leadRes = await client.query(`SELECT id, contact_person as name, phone, email FROM crm_leads`);
                leadRes.rows.forEach(r => {
                    recipients.push({ id: r.id, name: r.name, phone: r.phone, email: r.email, type: 'Lead' });
                });
            }

            // إرسال الرسائل بشكل محاكى وتسجيلها في السجلات
            for (const recipient of recipients) {
                // استبدال المتغيرات في نص القالب
                let customizedBody = campaign.body
                    .replace(/{customer_name}/g, recipient.name)
                    .replace(/{company_name}/g, recipient.name);

                // الإرسال الفعلي أو المحاكى وتحديد الحالة
                let status = 'Sent';
                let errMsg = null;

                if (campaign.channel === 'WhatsApp') {
                    if (!recipient.phone) {
                        status = 'Failed';
                        errMsg = 'Missing phone number';
                    } else {
                        // إرسال واتساب تلقائي
                        const wsRes = await sendWhatsAppMessage(recipient.phone, customizedBody);
                        if (!wsRes.success) {
                            if (wsRes.error !== "WhatsApp disabled in settings") {
                                status = 'Failed';
                                errMsg = wsRes.error || 'Failed to send';
                            }
                        }
                    }
                } else if (campaign.channel === 'Email' && !recipient.email) {
                    status = 'Failed';
                    errMsg = 'Missing email address';
                }

                // إدراج السجل في قاعدة البيانات
                await client.query(`
                    INSERT INTO communication_logs (campaign_id, recipient_type, recipient_id, recipient_phone, recipient_email, channel, message_content, status, error_message)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [campaign.id, recipient.type, recipient.id, recipient.phone, recipient.email, campaign.channel, customizedBody, status, errMsg]);
            }

            // تحديث حالة الحملة إلى مكتملة
            await client.query(`UPDATE crm_campaigns SET status = 'Completed' WHERE id = $1`, [id]);

            await logAdvancedAudit(client, req.user?.username || 'System', 'crm_campaigns', campaign.id, 'UPDATE', `Launched campaign: ${campaign.title}. Sent to ${recipients.length} recipients.`, campaign, { ...campaign, status: 'Completed' });

            await client.query('COMMIT');
            res.json({ success: true, message: `Campaign launched successfully. Processed ${recipients.length} messages.` });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    // 4. عرض السجلات والتتبع
    async getLogs(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    l.*, 
                    c.title as campaign_title,
                    COALESCE(cust.name, lead.contact_person, 'System Recipient') as recipient_name
                FROM communication_logs l
                LEFT JOIN crm_campaigns c ON l.campaign_id = c.id
                LEFT JOIN customers cust ON l.recipient_type = 'Customer' AND l.recipient_id = cust.id
                LEFT JOIN crm_leads lead ON l.recipient_type = 'Lead' AND l.recipient_id = lead.id
                ORDER BY l.id DESC
                LIMIT 200
            `);
            res.json({ success: true, logs: result.rows[0] ? result.rows : [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 5. ترويج صنف من المخازن تلقائياً
    async promoteInventoryItem(req, res) {
        const { inventory_id } = req.params;
        try {
            // 1. جلب تفاصيل الصنف من المخازن (مع دعم الأصناف التجريبية >= 9000)
            let item;
            const mockId = parseInt(inventory_id);
            if (mockId >= 9000) {
                const mockItems = {
                    9001: { item_name: 'بانادول إكسترا 500 مجم (Panadol Extra)', remaining_qty: 1420, min_stock_level: 100, expiry_date: new Date('2028-05-20') },
                    9002: { item_name: 'أوجمينتين 1 جم (Augmentin 1g)', remaining_qty: 510, min_stock_level: 50, expiry_date: new Date('2027-11-15') },
                    9003: { item_name: 'مورفين فيال 10 مجم (Morphine Vials)', remaining_qty: 45, min_stock_level: 10, expiry_date: new Date('2027-02-01') },
                    9004: { item_name: 'أنسولين لانتوس فيال (Lantus Insulin)', remaining_qty: 185, min_stock_level: 30, expiry_date: new Date('2026-12-10') },
                    9005: { item_name: 'محلول ملح 0.9% (Normal Saline 500ml)', remaining_qty: 2900, min_stock_level: 200, expiry_date: new Date('2027-12-31') }
                };
                item = mockItems[mockId] || { item_name: 'دواء تجريبي (Mock Drug)', remaining_qty: 50, min_stock_level: 10, expiry_date: new Date('2028-01-01') };
            } else {
                const itemRes = await pool.query(`SELECT * FROM inventory_items WHERE id = $1`, [inventory_id]);
                if (itemRes.rows.length === 0) {
                    return res.status(404).json({ error: "Item not found in inventory" });
                }
                item = itemRes.rows[0];
            }

            // 2. تقييم تاريخ الصلاحية وحجم المخزون الفعلي ومقارنته بالحد الأدنى
            let promoType = 'General';
            let messageContent = '';
            
            const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
            const today = new Date();
            const daysToExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
            
            const remainingQty = parseFloat(item.remaining_qty || item.quantity || 0);
            const minStock = parseFloat(item.min_stock_level || 10);
            const expiryString = expiryDate ? expiryDate.toISOString().split('T')[0] : '';

            if (daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 180) {
                promoType = 'Near Expiry';
                messageContent = `🚨 عرض تصفية استثنائي: دواء ${item.item_name} (صلاحية: ${expiryString}) متوفر الآن بخصم خاص لصيدلية {customer_name}! الكمية المتاحة: ${remainingQty} علبة فقط. بادر بالطلب الآن.`;
            } else if (remainingQty <= minStock) {
                promoType = 'Low Stock';
                messageContent = `⚡ تنبيه عاجل: أوشك مخزون صنف ${item.item_name} على النفاد! الكمية المتبقية لصيدلية {customer_name} في مستودعاتنا: ${remainingQty} علبة فقط. بادر بالطلب الفوري.`;
            } else {
                promoType = 'General Promotion';
                messageContent = `✨ عرض جديد: يتوفر لدينا الآن شحنة جديدة ممتازة من دواء ${item.item_name}! صيدلية {customer_name} اطلبوا الآن من البوابة الخاصة بكم.`;
            }

            // 3. إنشاء قالب للحملة
            const templateName = `Auto-Promo: ${item.item_name} (${promoType})`;
            const templateResult = await pool.query(
                `INSERT INTO crm_templates (name, type, subject, body) VALUES ($1, 'WhatsApp', $2, $3) RETURNING *`,
                [templateName, `Special Offer: ${item.item_name}`, messageContent]
            );
            const template = templateResult.rows[0];

            // 4. إنشاء الحملة
            const campaignTitle = `Auto-Promo Campaign: ${item.item_name} (${promoType})`;
            const campaignResult = await pool.query(
                `INSERT INTO crm_campaigns (title, channel, template_id, target_segment, status, created_by) 
                 VALUES ($1, 'WhatsApp', $2, 'Customers', 'Draft', $3) RETURNING *`,
                [campaignTitle, template.id, req.user?.username || 'System-AutoPromo']
            );
            const campaign = campaignResult.rows[0];

            // 5. إطلاق الحملة مباشرة للعملاء النشطين
            const campaignId = campaign.id;
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(`UPDATE crm_campaigns SET status = 'Sending' WHERE id = $1`, [campaignId]);

                const custRes = await client.query(`SELECT id, name, phone, email FROM customers WHERE status = 'Active'`);
                const recipients = custRes.rows.map(r => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, type: 'Customer' }));

                for (const recipient of recipients) {
                    let customizedBody = messageContent.replace(/{customer_name}/g, recipient.name);
                    let status = 'Sent';
                    let errMsg = null;

                    if (!recipient.phone) {
                        status = 'Failed';
                        errMsg = 'Missing phone number';
                    } else {
                        // إرسال واتساب تلقائي
                        const wsRes = await sendWhatsAppMessage(recipient.phone, customizedBody);
                        if (!wsRes.success) {
                            if (wsRes.error !== "WhatsApp disabled in settings") {
                                status = 'Failed';
                                errMsg = wsRes.error || 'Failed to send';
                            }
                        }
                    }

                    await client.query(`
                        INSERT INTO communication_logs (campaign_id, recipient_type, recipient_id, recipient_phone, recipient_email, channel, message_content, status, error_message)
                        VALUES ($1, $2, $3, $4, $5, 'WhatsApp', $6, $7, $8)
                    `, [campaignId, recipient.type, recipient.id, recipient.phone, recipient.email, customizedBody, status, errMsg]);
                }

                await client.query(`UPDATE crm_campaigns SET status = 'Completed' WHERE id = $1`, [campaignId]);
                await client.query('COMMIT');
                
                res.json({
                    success: true,
                    message: `Successfully promoted item ${item.item_name} (${promoType}). Sent to ${recipients.length} customers.`,
                    campaign_id: campaignId,
                    promo_type: promoType,
                    message_sent: messageContent
                });
            } catch (innerErr) {
                await client.query('ROLLBACK');
                throw innerErr;
            } finally {
                client.release();
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CommunicationController();
