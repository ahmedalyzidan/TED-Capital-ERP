const pool = require('../config/db');

const getPreferences = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const result = await pool.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);
        
        if (result.rows.length === 0) {
            // Return default settings if no preferences exist yet
            return res.json({
                language: 'en',
                theme_mode: 'light',
                timezone: 'Africa/Cairo',
                date_format: 'DD/MM/YYYY',
                sidebar_collapsed: false
            });
        }
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { language, theme_mode, timezone, date_format, dashboard_layout, table_configs, sidebar_collapsed } = req.body;
        
        await pool.query(`
            INSERT INTO user_preferences (user_id, language, theme_mode, timezone, date_format, dashboard_layout, table_configs, sidebar_collapsed, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                language = EXCLUDED.language,
                theme_mode = EXCLUDED.theme_mode,
                timezone = EXCLUDED.timezone,
                date_format = EXCLUDED.date_format,
                dashboard_layout = EXCLUDED.dashboard_layout,
                table_configs = EXCLUDED.table_configs,
                sidebar_collapsed = EXCLUDED.sidebar_collapsed,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, language, theme_mode, timezone, date_format, dashboard_layout, table_configs, sidebar_collapsed]);
        
        res.json({ success: true, message: "تم حفظ التفضيلات بنجاح" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getTenantSettings = async (req, res) => {
    try {
        // Multi-tenant identification (usually by domain or header)
        const domain = req.headers.host;
        const result = await pool.query("SELECT * FROM tenant_settings WHERE domain = $1 OR id = 1 LIMIT 1", [domain]);
        res.json(result.rows[0] || { tenant_name: 'Ted Capital ERP', brand_colors: { primary: '#4f46e5' } });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getPreferences, updatePreferences, getTenantSettings };
