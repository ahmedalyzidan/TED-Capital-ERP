const pool = require('../config/db');
const notificationService = require('./notificationService');

/**
 * محرك مسارات العمل المتقدم (Elite Workflow Engine)
 * يدعم مبدأ "صانع القرار والمراجع" (Maker-Checker) وحدود الصلاحيات المالية
 */
const processApprovalWorkflow = async (moduleName, recordId, action, username, userRole, amount = 0) => {
    try {
        // 1. جلب تعريف مسار العمل للموديول
        const defRes = await pool.query(
            "SELECT * FROM workflow_definitions WHERE module_name = $1 AND is_active = TRUE",
            [moduleName]
        );

        if (defRes.rows.length === 0) {
            // لا يوجد مسار عمل محدد، الموافقة تعتمد على صلاحيات الـ RBAC العادية
            return { newStatus: 'Approved', isFinalApproval: true };
        }

        const definition = defRes.rows[0];

        // 2. التحقق من مبدأ Maker-Checker والحدود المالية
        if (definition.require_maker_checker && amount >= (parseFloat(definition.min_amount) || 0)) {
            
            if (action === 'Submit') {
                // الموديول يتطلب مراجعة، نضعه في حالة "قيد المراجعة"
                const instRes = await pool.query(
                    "INSERT INTO workflow_instances (definition_id, record_id, current_step, status, maker_username) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                    [definition.id, recordId, 1, 'Pending Authorization', username]
                );

                // 🚀 TRIGGER OMNICHANNEL ALERT (Backgrounded to prevent timeouts)
                notificationService.notifyPendingAuthorization(moduleName, recordId, amount, username);

                return { newStatus: 'Pending Authorization', isFinalApproval: false, instanceId: instRes.rows[0].id };
            }

            if (action === 'Approve') {
                // التحقق من صلاحية المراجع (Checker) من مصفوفة الأمان
                const permRes = await pool.query(
                    `SELECT is_allowed, financial_limit FROM elite_security_matrix 
                     WHERE role_id = (SELECT id FROM roles WHERE name = $1) 
                     AND module_name = $2 AND action_name = 'Authorize'`,
                    [userRole, moduleName]
                );

                if (permRes.rows.length === 0 || !permRes.rows[0].is_allowed) {
                    throw new Error("ليس لديك صلاحية اعتماد (Authorizer) لهذا الموديول.");
                }

                if (amount > parseFloat(permRes.rows[0].financial_limit)) {
                    throw new Error(`المبلغ (${amount}) يتجاوز حد الاعتماد المسموح لك (${permRes.rows[0].financial_limit}).`);
                }

                // تحديث حالة المسار
                await pool.query(
                    "UPDATE workflow_instances SET status = 'Authorized', updated_at = CURRENT_TIMESTAMP WHERE definition_id = $1 AND record_id = $2",
                    [definition.id, recordId]
                );

                await pool.query(
                    "INSERT INTO workflow_history (workflow_id, record_id, status, action_by, comments) VALUES ($1, $2, $3, $4, $5)",
                    [definition.id, recordId, 'Authorized', username, 'تم الاعتماد من قبل المراجع']
                );

                return { newStatus: 'Approved', isFinalApproval: true };
            }
        }

        // مسار عمل بسيط (تبسيط للنسخة السابقة)
        if (action === 'Approve') return { newStatus: 'Approved', isFinalApproval: true };
        if (action === 'Reject') return { newStatus: 'Rejected', isFinalApproval: false };

        return { newStatus: 'Pending', isFinalApproval: false };
    } catch (err) {
        console.error("Elite Workflow Engine Error:", err);
        throw err;
    }
};

module.exports = { processApprovalWorkflow };