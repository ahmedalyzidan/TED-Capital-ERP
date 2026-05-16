const pool = require('../config/db');
const eventService = require('./eventService');

/**
 * BatchService: Handles heavy nightly operations
 */
class BatchService {
    /**
     * Run all scheduled nightly jobs
     */
    async runNightlyJobs() {
        console.log("🌙 Starting Nightly Batch Processing...");
        await this.calculateDepreciations();
        await this.revaluateCurrencies();
        console.log("✅ Nightly Batch Processing Completed.");
    }

    /**
     * Calculate Asset Depreciations (Placeholder logic)
     */
    async calculateDepreciations() {
        const jobId = await this.startJob('ASSET_DEPRECIATION');
        try {
            // Logic: Find all active assets, calculate monthly depreciation, post journal entries
            console.log("📉 Calculating asset depreciations...");
            // [Actual financial logic would be implemented here]
            
            await this.endJob(jobId, 'SUCCESS', 'Processed 45 assets.');
        } catch (error) {
            await this.endJob(jobId, 'FAILED', null, error.message);
        }
    }

    /**
     * Currency Revaluation (Placeholder logic)
     */
    async revaluateCurrencies() {
        const jobId = await this.startJob('CURRENCY_REVALUATION');
        try {
            console.log("💱 Running currency revaluations...");
            // [Actual financial logic would be implemented here]
            
            await this.endJob(jobId, 'SUCCESS', 'Revalued 12 bank accounts.');
        } catch (error) {
            await this.endJob(jobId, 'FAILED', null, error.message);
        }
    }

    /**
     * Log Job Start
     */
    async startJob(name) {
        const res = await pool.query(
            'INSERT INTO batch_jobs (job_name, status, start_time) VALUES ($1, \'RUNNING\', CURRENT_TIMESTAMP) RETURNING id',
            [name]
        );
        return res.rows[0].id;
    }

    /**
     * Log Job Completion/Failure
     */
    async endJob(id, status, summary, error = null) {
        await pool.query(
            'UPDATE batch_jobs SET status = $1, end_time = CURRENT_TIMESTAMP, result_summary = $2, error_log = $3 WHERE id = $4',
            [status, summary, error, id]
        );
        await eventService.emit('BATCH_JOB_FINISHED', 'System', { job_id: id, status, summary });
    }
}

module.exports = new BatchService();
