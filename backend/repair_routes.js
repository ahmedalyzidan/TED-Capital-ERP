const fs = require('fs');
const path = 'routes/apiRoutes.js';
let content = fs.readFileSync(path, 'utf8');

const target = `// =========================================================================
        const leaves = await pool.query("SELECT * FROM leave_requests WHERE staff_id = $1 ORDER BY created_at DESC", [staff.rows[0].id]);`;

const replacement = `// =========================================================================
router.get('/hcm/profile', authenticateToken, async (req, res) => {
    try {
        const staff = await pool.query("SELECT * FROM staff WHERE user_id = $1", [req.user.id]);
        if (staff.rows.length === 0) return res.status(404).json({ error: "Profile not linked" });

        const leaves = await pool.query("SELECT * FROM leave_requests WHERE staff_id = $1 ORDER BY created_at DESC", [staff.rows[0].id]);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully repaired apiRoutes.js');
} else {
    console.error('Target not found in apiRoutes.js');
    process.exit(1);
}
