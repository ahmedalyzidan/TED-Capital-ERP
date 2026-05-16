const EventEmitter = require('events');
const pool = require('../config/db');

class EventEngine extends EventEmitter {
    constructor() {
        super();
        this.on('system_event', this.logEvent);
    }

    /**
     * Dispatch an event across the system
     * @param {string} eventType - e.g., 'INVOICE_OVERDUE', 'LOW_STOCK'
     * @param {object} payload - Data associated with the event
     * @param {number} userId - Optional user associated with the event
     */
    async dispatch(eventType, payload, userId = null) {
        console.log(`📡 [EventEngine] Dispatching: ${eventType}`);
        
        // 1. Emit internal event for real-time listeners
        this.emit(eventType, { payload, userId, timestamp: new Date() });

        // 2. Persist to DB for audit and async processing
        try {
            await pool.query(
                "INSERT INTO system_events (event_type, payload, status) VALUES ($1, $2, 'Pending')",
                [eventType, JSON.stringify(payload)]
            );
        } catch (err) {
            console.error("❌ [EventEngine] Failed to log event to DB:", err.message);
        }
    }

    async logEvent({ eventType, payload }) {
        // Internal logging logic if needed
    }
}

// Singleton instance
const eventEngine = new EventEngine();

module.exports = eventEngine;
