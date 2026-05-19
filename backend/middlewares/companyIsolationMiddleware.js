const pool = require('../config/db');

function getTableAndIdFromPath(path) {
    const parts = path.replace(/^\/|\/$/g, '').split('/');
    
    // 1. Dynamic routes: /dynamic/update/:type/:id or /dynamic/delete/:type/:id
    if (parts[0] === 'dynamic' && (parts[1] === 'update' || parts[1] === 'delete') && parts[2] && parts[3]) {
        return { table: parts[2], id: parts[3] };
    }
    
    // 2. Upload route: /upload/:table/:id
    if (parts[0] === 'upload' && parts[1] && parts[2]) {
        return { table: parts[1], id: parts[2] };
    }
    
    // 3. Delete attachment route: /delete_attachment/:id
    if (parts[0] === 'delete_attachment' && parts[1]) {
        return { table: 'attachments', id: parts[1] };
    }
    
    // 4. Subcontractor invoice actions: /subcontractors/approve_invoice/:id or /subcontractors/delete_invoice/:id
    if (parts[0] === 'subcontractors' && (parts[1] === 'approve_invoice' || parts[1] === 'delete_invoice') && parts[2]) {
        return { table: 'subcontractor_invoices', id: parts[2] };
    }
    
    // 5. Project actions: /projects/distribute-profit/:id or /projects/sync/:id
    if (parts[0] === 'projects' && (parts[1] === 'distribute-profit' || parts[1] === 'sync') && parts[2]) {
        return { table: 'projects', id: parts[2] };
    }
    
    return null;
}

async function fetchRecord(tableName, recordId) {
    try {
        const res = await pool.query(`SELECT * FROM "${tableName}" WHERE id = $1`, [recordId]);
        if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
        try {
            const res = await pool.query(`SELECT * FROM "${tableName}" WHERE emp_id = $1`, [recordId]);
            if (res.rows.length > 0) return res.rows[0];
        } catch (e2) {}
    }
    return null;
}

async function checkCompanyAccess(record, allowedCompanies, allowedCompanyIds) {
    if (!record) return true;

    // Check direct company fields
    const companyVal = record.company || record.company_name || record.company_entity;
    if (companyVal) {
        const matched = allowedCompanies.some(c => companyVal.toLowerCase().includes(c.toLowerCase()));
        if (!matched) return false;
    }

    // Check company_id field
    const companyIdVal = parseInt(record.company_id || record.companyId);
    if (companyIdVal) {
        if (!allowedCompanyIds.includes(companyIdVal)) return false;
    }

    // Check project_name or cost_center
    const projVal = record.project_name || record.project_id || record.cost_center;
    if (projVal) {
        let projName = projVal;
        if (typeof projVal === 'number' || (typeof projVal === 'string' && /^\d+$/.test(projVal))) {
            const projRes = await pool.query("SELECT name, company FROM projects WHERE id = $1", [parseInt(projVal)]);
            if (projRes.rows.length > 0) {
                const projCompany = projRes.rows[0].company || '';
                const matched = allowedCompanies.some(c => projCompany.toLowerCase().includes(c.toLowerCase()));
                if (!matched) return false;
            }
        } else {
            const projRes = await pool.query("SELECT company FROM projects WHERE name = $1", [projVal]);
            if (projRes.rows.length > 0) {
                const projCompany = projRes.rows[0].company || '';
                const matched = allowedCompanies.some(c => projCompany.toLowerCase().includes(c.toLowerCase()));
                if (!matched) return false;
            }
        }
    }

    // Check other relations (e.g. inventory_id)
    if (record.inventory_id) {
        const invRes = await pool.query("SELECT project_name, company_id FROM inventory_items WHERE id = $1", [record.inventory_id]);
        if (invRes.rows.length > 0) {
            const inv = invRes.rows[0];
            if (inv.company_id && !allowedCompanyIds.includes(parseInt(inv.company_id))) {
                return false;
            }
            if (inv.project_name) {
                const projRes = await pool.query("SELECT company FROM projects WHERE name = $1", [inv.project_name]);
                if (projRes.rows.length > 0) {
                    const projCompany = projRes.rows[0].company || '';
                    const matched = allowedCompanies.some(c => projCompany.toLowerCase().includes(c.toLowerCase()));
                    if (!matched) return false;
                }
            }
        }
    }

    return true;
}

const enforceCompanyIsolation = async (req, res, next) => {
    // Skip if not authenticated or no user object
    if (!req.user) return next();

    const isMtayem = (req.user.username || '').toUpperCase() === 'MTAYEM';
    const isMsobhi = (req.user.username || '').toUpperCase() === 'MSOBHI';

    // MTAYEM and MSOBHI isolation check
    if (!isMtayem && !isMsobhi) return next();

    const allowedCompanies = isMtayem
        ? ['TED Capital', 'PRIMEMED PHARMA', 'TED CAPITAL', 'Primemed Pharma', 'TED Capital ERP']
        : ['Design Concept', 'DESIGN CONCEPT', 'ديزاين كونسبت', 'ديزاين كونسيبت'];

    const allowedCompanyIds = isMtayem ? [1, 4] : [2];

    // --- GET request filter normalization ---
    if (req.method === 'GET') {
        if (req.headers['x-selected-company']) {
            const comp = req.headers['x-selected-company'];
            const isAllowed = allowedCompanies.some(ac => comp.toLowerCase().includes(ac.toLowerCase()));
            if (!isAllowed) {
                delete req.headers['x-selected-company'];
            }
        }
        if (req.query.company) {
            const comp = req.query.company;
            const isAllowed = allowedCompanies.some(ac => comp.toLowerCase().includes(ac.toLowerCase()));
            if (!isAllowed) {
                delete req.query.company;
            }
        }
        return next();
    }

    // --- WRITE requests (POST, PUT, DELETE) validation ---
    try {
        // 1. Check existing record if updating or deleting
        const pathInfo = getTableAndIdFromPath(req.path);
        if (pathInfo) {
            let targetRecord = await fetchRecord(pathInfo.table, pathInfo.id);
            
            // If deleting an attachment, fetch the parent record
            if (pathInfo.table === 'attachments' && targetRecord) {
                targetRecord = await fetchRecord(targetRecord.table_name, targetRecord.record_id);
            }

            if (targetRecord) {
                const hasAccess = await checkCompanyAccess(targetRecord, allowedCompanies, allowedCompanyIds);
                if (!hasAccess) {
                    return res.status(403).json({ error: "Access Denied: You do not have permission to modify this record." });
                }
            }
        }

        // 2. Check req.body content for new values being submitted
        if (req.body && Object.keys(req.body).length > 0) {
            const hasAccess = await checkCompanyAccess(req.body, allowedCompanies, allowedCompanyIds);
            if (!hasAccess) {
                return res.status(403).json({ error: "Access Denied: The requested data is outside of your permitted companies." });
            }
        }

        next();
    } catch (err) {
        console.error("🔥 [enforceCompanyIsolation] Error:", err);
        res.status(500).json({ error: "Internal Server Error during security checks" });
    }
};

module.exports = { enforceCompanyIsolation };
