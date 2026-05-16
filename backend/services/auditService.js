const pool = require('../config/db');

/**
 * AuditService: The Global Tracker
 * Records every INSERT, UPDATE, DELETE action with before/after state.
 */
class AuditService {
    /**
     * Log a database change
     * @param {string} table - Table name
     * @param {number} recordId - Affected record ID
     * @param {string} action - 'INSERT', 'UPDATE', or 'DELETE'
     * @param {object} oldData - State before change (for UPDATE/DELETE)
     * @param {object} newData - State after change (for INSERT/UPDATE)
     * @param {number} userId - ID of the user performing the action
     */
    async log(table, recordId, action, oldData, newData, userId) {
        try {
            await pool.query(
                `INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [table, recordId, action, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null, userId]
            );
        } catch (error) {
            console.error("🔥 Audit Logging FAILED:", error);
        }
    }

    /**
     * Get history for a specific record
     */
    async getHistory(table, recordId) {
        const result = await pool.query(
            'SELECT * FROM audit_logs WHERE table_name = $1 AND record_id = $2 ORDER BY created_at DESC',
            [table, recordId]
        );
        return result.rows;
    }
}

module.exports = new AuditService();
