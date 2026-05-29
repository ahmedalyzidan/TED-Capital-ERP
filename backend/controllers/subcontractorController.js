const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAdvancedAudit } = require('../utils/helpers');

class SubcontractorController {
    /**
     * Strategic Subcontractor 360 Intelligence
     */
    async getSubcontractorIntelligence(req, res) {
        const { id } = req.params;
        try {
            // 1. Get base subcontractor profile
            const subRes = await pool.query("SELECT * FROM subcontractors WHERE id = $1", [id]);
            if (subRes.rows.length === 0) return res.status(404).json({ error: "Subcontractor not found" });
            const profile = subRes.rows[0];

            // 2. Get subcontractor contracts (with project and customer details)
            const contractsRes = await pool.query(`
                SELECT sc.*, p.name as project_name, p.company as company_name,
                       c.name as client_name
                FROM subcontractor_contracts sc
                LEFT JOIN projects p ON sc.project_id = p.id
                LEFT JOIN customers c ON p.company_id = c.id
                WHERE sc.subcontractor_id = $1 AND (sc.is_deleted IS NULL OR sc.is_deleted = false)
            `, [id]);

            // 3. Get subcontractor invoices (progress claims)
            const invoicesRes = await pool.query(`
                SELECT si.*, p.name as project_name, b.item_name as boq_item_name
                FROM subcontractor_invoices si
                LEFT JOIN projects p ON si.project_id = p.id
                LEFT JOIN boq b ON si.sub_item_id = b.id
                WHERE si.subcontractor_id = $1 AND (si.is_deleted IS NULL OR si.is_deleted = false)
                ORDER BY si.date DESC, si.id DESC
            `, [id]);

            // 4. Get subcontractor bank performance bonds
            const bondsRes = await pool.query(`
                SELECT sb.*, sc.contract_number
                FROM subcontractor_bonds sb
                LEFT JOIN subcontractor_contracts sc ON sb.contract_id = sc.id
                WHERE sb.subcontractor_id = $1 AND (sb.is_deleted IS NULL OR sb.is_deleted = false)
                ORDER BY sb.expiry_date ASC
            `, [id]);

            // 5. Get retention releases
            const releasesRes = await pool.query(`
                SELECT rr.*, sc.contract_number
                FROM retention_releases rr
                LEFT JOIN subcontractor_contracts sc ON rr.contract_id = sc.id
                WHERE rr.subcontractor_id = $1 AND (rr.is_deleted IS NULL OR rr.is_deleted = false)
                ORDER BY rr.release_date DESC
            `, [id]);

            // 6. Get assigned BOQ items
            const boqRes = await pool.query(`
                SELECT si.id as assignment_id, si.assigned_qty, si.unit_price as sub_unit_price, si.total_price as sub_total_price,
                       b.id as boq_id, b.item_name, b.uom, b.est_qty, b.est_material_cost, b.est_labor_cost, b.est_subcontractor_cost,
                       b.actual_material_qty, b.actual_material_cost, b.actual_labor_cost, b.actual_subcontractor_cost, b.status, b.project_name
                FROM subcontractor_items si
                JOIN boq b ON si.boq_id = b.id
                WHERE si.subcontractor_id = $1 AND (si.is_deleted IS NULL OR si.is_deleted = false)
            `, [id]);

            // 7. Get material requisitions/issuances from warehouses (direct link)
            const materialsRes = await pool.query(`
                SELECT mu.*, b.item_name as boq_item_name, wh.name as warehouse_name, ii.item_description
                FROM material_usage mu
                JOIN boq b ON mu.boq_id = b.id
                JOIN subcontractor_items si ON si.boq_id = b.id
                LEFT JOIN inventory_items ii ON mu.inventory_id = ii.id
                LEFT JOIN warehouses wh ON ii.warehouse = wh.name
                WHERE si.subcontractor_id = $1 AND (mu.is_deleted IS NULL OR mu.is_deleted = false)
                ORDER BY mu.created_at DESC
            `, [id]);

            // 8. Get General Ledger Account Statement (كشف الحساب المحاسبي من قيود اليومية)
            const ledgerRes = await pool.query(`
                SELECT l.id, l.account_name, l.debit, l.credit, l.description, l.cost_center, l.created_at, l.company
                FROM ledger l
                WHERE l.is_deleted = false 
                  AND (
                    l.description ILIKE '%' || $2 || '%'
                    OR l.description ILIKE '%' || (SELECT name FROM subcontractors WHERE id = $1) || '%'
                    OR (l.cost_center IN (SELECT DISTINCT p.name FROM projects p JOIN subcontractor_contracts sc ON sc.project_id = p.id WHERE sc.subcontractor_id = $1)
                        AND (l.account_name ILIKE '%مقاول%' OR l.account_name ILIKE '%باطن%'))
                  )
                ORDER BY l.created_at DESC, l.id DESC
                LIMIT 150
            `, [id, profile.name]);

            // 9. Calculate Financial Summary Stats
            const statsRes = await pool.query(`
                SELECT 
                    COALESCE(SUM(total_value), 0) as total_contracted,
                    (SELECT COALESCE(SUM(net_amount), 0) FROM subcontractor_invoices WHERE subcontractor_id = $1 AND status = 'Paid' AND (is_deleted IS NULL OR is_deleted = false)) as total_paid,
                    (SELECT COALESCE(SUM(retention_deduction), 0) FROM subcontractor_invoices WHERE subcontractor_id = $1 AND (is_deleted IS NULL OR is_deleted = false)) - 
                    (SELECT COALESCE(SUM(amount), 0) FROM retention_releases WHERE subcontractor_id = $1 AND (is_deleted IS NULL OR is_deleted = false)) as net_retention,
                    (SELECT COALESCE(SUM(bond_amount), 0) FROM subcontractor_bonds WHERE subcontractor_id = $1 AND status = 'Active' AND (is_deleted IS NULL OR is_deleted = false)) as total_bonds,
                    (SELECT COALESCE(SUM(dp_recovery), 0) FROM subcontractor_invoices WHERE subcontractor_id = $1 AND (is_deleted IS NULL OR is_deleted = false)) as recovered_advance
                FROM subcontractor_contracts 
                WHERE subcontractor_id = $1 AND (is_deleted IS NULL OR is_deleted = false)
            `, [id]);

            const stats = statsRes.rows[0] || { total_contracted: 0, total_paid: 0, net_retention: 0, total_bonds: 0, recovered_advance: 0 };
            
            // Calculate total advance payment across contracts
            let totalAdvanceValue = 0;
            contractsRes.rows.forEach(c => {
                const totalVal = parseFloat(c.total_value) || 0;
                const advPct = parseFloat(c.advance_percent) || 0;
                totalAdvanceValue += totalVal * (advPct / 100);
            });
            stats.total_advance = totalAdvanceValue;
            stats.remaining_advance = Math.max(0, totalAdvanceValue - (parseFloat(stats.recovered_advance) || 0));

            res.json({
                success: true,
                profile,
                contracts: contractsRes.rows,
                invoices: invoicesRes.rows,
                bonds: bondsRes.rows,
                releases: releasesRes.rows,
                boqs: boqRes.rows,
                materials: materialsRes.rows,
                ledger: ledgerRes.rows,
                stats
            });
        } catch (error) {
            console.error("🔥 Subcontractor Intelligence Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async createContract(req, res) {
        const { subcontractor_id, project_id, contract_number, total_value, retention_percent, advance_percent, start_date, end_date, scope_of_work } = req.body;
        try {
            const result = await pool.query(`
                INSERT INTO subcontractor_contracts (subcontractor_id, project_id, contract_number, total_value, retention_percent, advance_percent, start_date, end_date, scope_of_work, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active') RETURNING *
            `, [subcontractor_id, project_id, contract_number, total_value, retention_percent, advance_percent, start_date, end_date, scope_of_work]);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'subcontractor_contracts', result.rows[0].id, 'CREATE', `Created subcontractor contract #${contract_number}`, null, result.rows[0]);
            res.json({ success: true, contract: result.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async submitProgressClaim(req, res) {
        const { contract_id, sub_item_id, progress_percent, description, date } = req.body;
        try {
            const contractRes = await pool.query(`SELECT c.*, s.name as sub_name FROM subcontractor_contracts c JOIN subcontractors s ON c.subcontractor_id = s.id WHERE c.id = $1`, [contract_id]);
            if (contractRes.rows.length === 0) throw new Error("Contract not found");
            const contract = contractRes.rows[0];

            const totalValue = Number(contract.total_value);
            const grossAmount = (Number(progress_percent) / 100) * totalValue;
            const prevClaims = await pool.query("SELECT COALESCE(SUM(gross_amount), 0) as total_prev FROM subcontractor_invoices WHERE contract_id = $1", [contract_id]);
            const currentGross = grossAmount - Number(prevClaims.rows[0].total_prev);
            
            if (currentGross <= 0) throw new Error("No new progress detected");

            const retention = currentGross * (Number(contract.retention_percent) / 100);
            const advance = currentGross * (Number(contract.advance_percent) / 100);
            const net = currentGross - retention - advance;

            const result = await pool.query(`
                INSERT INTO subcontractor_invoices (subcontractor_id, subcontractor_name, amount, progress_percent, description, date, gross_amount, retention_deduction, dp_recovery, net_amount, status, company_id, project_id, contract_id, sub_item_id, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', 1, $11, $12, $13, $14) RETURNING *
            `, [contract.subcontractor_id, contract.sub_name, net, progress_percent, description, date || new Date(), currentGross, retention, advance, net, contract.project_id, contract.id, sub_item_id || null, JSON.stringify({ contract_id: contract.id })]);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'subcontractor_invoices', result.rows[0].id, 'CREATE', `Submitted progress claim for contract #${contract.contract_number} at ${progress_percent}%`, null, result.rows[0]);

            res.json({ success: true, invoice: result.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async registerBond(req, res) {
        const { subcontractor_id, contract_id, bond_type, bank_name, bond_amount, expiry_date, reference_number } = req.body;
        try {
            const result = await pool.query(`
                INSERT INTO subcontractor_bonds (subcontractor_id, contract_id, bond_type, bank_name, bond_amount, expiry_date, reference_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
            `, [subcontractor_id, contract_id, bond_type, bank_name, bond_amount, expiry_date, reference_number]);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'subcontractor_bonds', result.rows[0].id, 'CREATE', `Registered ${bond_type} bond #${reference_number} for amount ${bond_amount}`, null, result.rows[0]);
            res.json({ success: true, bond: result.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async releaseRetention(req, res) {
        const { subcontractor_id, contract_id, amount, description } = req.body;
        try {
            const result = await pool.query(`
                INSERT INTO retention_releases (subcontractor_id, contract_id, amount, description, status)
                VALUES ($1, $2, $3, $4, 'Approved') RETURNING *
            `, [subcontractor_id, contract_id, amount, description]);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'retention_releases', result.rows[0].id, 'CREATE', `Released retention amount ${amount} for contract #${contract_id}`, null, result.rows[0]);
            res.json({ success: true, release: result.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async updatePerformance(req, res) {
        const { id } = req.params;
        const { quality, timeliness, safety, cooperation } = req.body;
        try {
            const oldSub = await pool.query("SELECT * FROM subcontractors WHERE id = $1", [id]);
            const overallRating = (Number(quality) + Number(timeliness) + Number(safety) + Number(cooperation)) / 4;
            const result = await pool.query(`
                UPDATE subcontractors 
                SET rating = $1, 
                    metadata = metadata || $2::jsonb 
                WHERE id = $3 
                RETURNING *
            `, [overallRating, JSON.stringify({ performance_metrics: { quality, timeliness, safety, cooperation, last_updated: new Date() } }), id]);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'subcontractors', id, 'UPDATE', `Updated performance rating for subcontractor #${id} to ${overallRating}`, oldSub.rows[0], result.rows[0]);
            
            res.json({ success: true, profile: result.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async getGlobalStats(req, res) {
        try {
            const stats = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM subcontractors) as total_subs,
                    (SELECT COALESCE(SUM(total_value), 0) FROM subcontractor_contracts) as total_contract_value,
                    (SELECT COUNT(*) FROM subcontractor_invoices WHERE status = 'Pending') as pending_claims,
                    (SELECT COUNT(*) FROM subcontractors WHERE insurance_expiry <= CURRENT_DATE) as expired_compliance
            `);
            res.json({ success: true, stats: stats.rows[0] });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async getSubcontractorAnalytics(req, res) {
        try {
            const retention = await pool.query(`
                SELECT 
                    s.name as subcontractor_name,
                    COALESCE(SUM(i.retention_deduction), 0) as total_withheld,
                    COALESCE((SELECT SUM(amount) FROM retention_releases WHERE subcontractor_id = s.id AND status = 'Approved'), 0) as total_released
                FROM subcontractors s
                LEFT JOIN subcontractor_invoices i ON s.id = i.subcontractor_id
                GROUP BY s.id, s.name
                HAVING COALESCE(SUM(i.retention_deduction), 0) > 0
            `);

            const advances = await pool.query(`
                SELECT 
                    c.contract_number,
                    s.name as subcontractor_name,
                    c.total_value * (c.advance_percent / 100) as initial_advance,
                    COALESCE(SUM(i.dp_recovery), 0) as recovered_so_far,
                    (c.total_value * (c.advance_percent / 100)) - COALESCE(SUM(i.dp_recovery), 0) as remaining_advance
                FROM subcontractor_contracts c
                JOIN subcontractors s ON c.subcontractor_id = s.id
                LEFT JOIN subcontractor_invoices i ON c.id = i.contract_id
                WHERE c.advance_percent > 0
                GROUP BY c.id, c.contract_number, s.name, c.total_value, c.advance_percent
            `);

            const expiringBonds = await pool.query(`
                SELECT 
                    b.*, 
                    s.name as subcontractor_name 
                FROM subcontractor_bonds b
                JOIN subcontractors s ON b.subcontractor_id = s.id
                WHERE b.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
                AND b.status = 'Active'
            `);

            res.json({ 
                success: true, 
                analytics: {
                    retention: retention.rows,
                    advances: advances.rows,
                    expiringBonds: expiringBonds.rows
                }
            });
        } catch (error) { 
            console.error("🔥 Analytics Error:", error);
            res.status(500).json({ error: error.message }); 
        }
    }

    async updatePortalCredentials(req, res) {
        const { id } = req.params;
        const { username, password, active } = req.body;
        try {
            const oldSub = await pool.query("SELECT * FROM subcontractors WHERE id = $1", [id]);
            let query = `UPDATE subcontractors SET username = $1, portal_access_active = $2`;
            let params = [username, active];

            if (password) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                query += `, password_hash = $3 WHERE id = $4`;
                params.push(hash, id);
            } else {
                query += ` WHERE id = $3`;
                params.push(id);
            }

            await pool.query(query, params);
            await logAdvancedAudit(pool, req.user?.username || 'System', 'subcontractors', id, 'UPDATE', `Updated portal credentials/access for subcontractor #${id}`, oldSub.rows[0], { ...oldSub.rows[0], username, portal_access_active: active });
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    async portalLogin(req, res) {
        const { username, password } = req.body;
        const trimmedUsername = username ? username.trim() : '';
        try {
            const userRes = await pool.query("SELECT * FROM subcontractors WHERE LOWER(username) = LOWER($1) AND portal_access_active = true", [trimmedUsername]);
            if (userRes.rows.length === 0) return res.status(401).json({ error: "Invalid credentials or access disabled" });

            const sub = userRes.rows[0];
            const valid = await bcrypt.compare(password, sub.password_hash);
            if (!valid) return res.status(401).json({ error: "Invalid credentials" });

            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: sub.id, role: 'Subcontractor', name: sub.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
            
            res.json({ success: true, token, subcontractor: { id: sub.id, name: sub.name } });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }
}

module.exports = new SubcontractorController();
