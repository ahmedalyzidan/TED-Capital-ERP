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

            for (const sub of subscribers.rows) {
                const { user_id, channels } = sub;
                
                // Construct Notification Message based on type
                let title = `System Alert: ${type}`;
                let message = `New event triggered in ${type}. Check system logs for details.`;

                // Custom Logic for specific types (Expandable)
                if (type === 'STOCK_LOW') {
                    title = '🚨 انخفاض مستوى المخزون';
                    message = `المنتج [${payload.item_name}] وصل للحد الأدنى (${payload.current_qty} ${payload.unit}). يرجى إعادة الطلب.`;
                } else if (type === 'INVOICE_OVERDUE') {
                    title = '⏳ فاتورة متأخرة السداد';
                    message = `الفاتورة رقم [${payload.invoice_no}] للعميل [${payload.client_name}] تجاوزت موعد الاستحقاق.`;
                }

                // Send through each subscribed channel
                for (const channel of channels) {
                    await notificationService.send(user_id, title, message, channel, { event_id: eventId, ...payload });
                }
            }
        } catch (error) {
            console.error(`❌ Error processing event logic:`, error);
        }
    }
}

module.exports = new EventService();
