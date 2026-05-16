const pool = require('../config/db');
const eventService = require('./eventService');
const notificationService = require('./notificationService');

/**
 * WorkflowService: Managing multi-step approvals
 */
class WorkflowService {
    /**
     * Start a workflow for a record if a definition exists
     */
    async initiate(module, event, recordId, payload) {
        try {
            // Find active workflow definition for this module/event
            const defRes = await pool.query(
                'SELECT * FROM workflow_definitions WHERE module_name = $1 AND event_trigger = $2 AND is_active = TRUE',
                [module, event]
            );

            if (defRes.rows.length === 0) return null;

            const definition = defRes.rows[0];

            // Check conditions (e.g., amount > X)
            if (definition.conditions) {
                const { min_amount } = definition.conditions;
                if (min_amount && payload.amount < min_amount) return null;
            }

            // Create Instance
            const instRes = await pool.query(
                'INSERT INTO workflow_instances (definition_id, record_id) VALUES ($1, $2) RETURNING id',
                [definition.id, recordId]
            );
            const instanceId = instRes.rows[0].id;

            // Notify first approver
            await this.notifyApprover(instanceId, 1);

            console.log(`⛓️ Workflow [${definition.module_name}] initiated for record [${recordId}]`);
            return instanceId;
        } catch (error) {
            console.error("🔥 Workflow initiation FAILED:", error);
        }
    }

    /**
     * Submit an approval/rejection for a step
     */
    async processApproval(instanceId, stepNumber, userId, action, comment) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Log to history
            await client.query(
                'INSERT INTO approval_history (instance_id, step_number, approver_id, action, comment) VALUES ($1, $2, $3, $4, $5)',
                [instanceId, stepNumber, userId, action, comment]
            );

            if (action === 'REJECTED') {
                await client.query('UPDATE workflow_instances SET status = \'REJECTED\' WHERE id = $1', [instanceId]);
                await client.query('COMMIT');
                return { status: 'REJECTED' };
            }

            // 2. Check if there are more steps
            const instRes = await client.query(
                'SELECT wi.*, wd.steps FROM workflow_instances wi JOIN workflow_definitions wd ON wi.definition_id = wd.id WHERE wi.id = $1',
                [instanceId]
            );
            const instance = instRes.rows[0];
            const nextStep = stepNumber + 1;

            if (nextStep > instance.steps.length) {
                // All steps approved!
                await client.query('UPDATE workflow_instances SET status = \'APPROVED\', current_step = $1 WHERE id = $2', [stepNumber, instanceId]);
                await client.query('COMMIT');
                return { status: 'APPROVED' };
            } else {
                // Move to next step
                await client.query('UPDATE workflow_instances SET current_step = $1 WHERE id = $2', [nextStep, instanceId]);
                await client.query('COMMIT');
                await this.notifyApprover(instanceId, nextStep);
                return { status: 'IN_PROGRESS', nextStep };
            }
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Notify the approver assigned to a specific step
     */
    async notifyApprover(instanceId, stepNumber) {
        const res = await pool.query(
            'SELECT wi.*, wd.steps FROM workflow_instances wi JOIN workflow_definitions wd ON wi.definition_id = wd.id WHERE wi.id = $1',
            [instanceId]
        );
        const instance = res.rows[0];
        const step = instance.steps.find(s => s.order === stepNumber);

        if (step) {
            // Find users with the required role
            const usersRes = await pool.query('SELECT id FROM users WHERE role = $1 AND status = \'Active\'', [step.role]);
            for (const user of usersRes.rows) {
                await notificationService.send(
                    user.id, 
                    '✍️ طلب اعتماد جديد', 
                    `بانتظار موافقتك على طلب [${instance.id}] في خطوة رقم [${stepNumber}].`,
                    'in-app',
                    { instance_id: instanceId, step: stepNumber }
                );
            }
        }
    }
}

module.exports = new WorkflowService();
