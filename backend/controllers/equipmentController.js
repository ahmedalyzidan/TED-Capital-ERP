const pool = require('../config/db');
const { autoLedgerEntry, logAdvancedAudit } = require('../utils/helpers');

const logOperation = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { asset_id, date, hourmeter_reading, odometer_reading, fuel_liters, fuel_cost, operator_name, project_name, notes } = req.body;

        if (!asset_id || !date) {
            throw new Error("بيانات غير مكتملة: كود الأصل والتاريخ مطلوبان.");
        }

        const result = await client.query(
            `INSERT INTO equipment_operations (asset_id, date, hourmeter_reading, odometer_reading, fuel_liters, fuel_cost, operator_name, project_name, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [asset_id, date, hourmeter_reading || 0, odometer_reading || 0, fuel_liters || 0, fuel_cost || 0, operator_name, project_name, notes]
        );

        const newLog = result.rows[0];
        await logAdvancedAudit(client, req.user.username, 'equipment_operations', newLog.id, 'CREATE', 'Logged machinery daily operations log', null, newLog);

        await client.query('COMMIT');
        res.json({ success: true, log: newLog });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const scheduleMaintenance = async (req, res) => {
    try {
        const { asset_id, service_date, service_type, description, service_cost, parts_used } = req.body;
        const result = await pool.query(
            `INSERT INTO equipment_maintenance (asset_id, service_date, service_type, description, service_cost, parts_used, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled') RETURNING *`,
            [asset_id, service_date, service_type, description, service_cost || 0, parts_used]
        );
        res.json({ success: true, maintenance: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const completeMaintenance = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { completed_date, actual_cost, payment_method } = req.body;

        const mainRes = await client.query("SELECT m.*, a.name as asset_name, a.project_id FROM equipment_maintenance m JOIN fixed_assets a ON m.asset_id = a.id WHERE m.id = $1", [id]);
        if (mainRes.rows.length === 0) throw new Error("سجل الصيانة غير موجود.");
        const main = mainRes.rows[0];

        const cost = parseFloat(actual_cost) || parseFloat(main.service_cost) || 0;

        // 1. Update status
        await client.query(
            `UPDATE equipment_maintenance 
             SET status = 'Completed', completed_date = $1, service_cost = $2 
             WHERE id = $3`,
            [completed_date || new Date(), cost, id]
        );

        // 2. Fetch project name
        let prName = 'General';
        if (main.project_id) {
            const prRes = await client.query("SELECT name FROM projects WHERE id = $1", [main.project_id]);
            if (prRes.rows.length > 0) prName = prRes.rows[0].name;
        }

        // 3. Post Double-Entry Ledger
        if (cost > 0) {
            const creditAcc = payment_method === 'Bank' ? '1111' : '1101'; // Bank (1111) or Cash (1101)
            await autoLedgerEntry(
                client,
                '5200', // Maintenance Expense account
                creditAcc,
                cost,
                main.project_id || 0,
                `مصاريف صيانة معدة: ${main.asset_name} - ${main.description}`,
                req.user.username
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "تم إكمال الصيانة وتسجيل القيود المحاسبية للمصروف بنجاح!" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = { logOperation, scheduleMaintenance, completeMaintenance };
