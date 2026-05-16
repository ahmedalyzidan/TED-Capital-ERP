const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

class UserController {
    async getAllUsers(req, res) {
        try {
            const query = "SELECT id, username, email, role, status, permissions, created_at FROM users ORDER BY id ASC";
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getUsersTable(req, res) {
        try {
            const result = await pool.query("SELECT id, username, email, role, status, permissions, created_at FROM users ORDER BY id ASC");
            res.json({ data: result.rows, total: result.rows.length });
        } catch (err) {
            res.status(500).json({ error: err.message, total: 0 });
        }
    }

    async updateUser(req, res) {
        const { username, email, password, role, status, permissions } = req.body;
        try {
            const oldRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
            const oldUser = oldRes.rows[0];

            if (password) {
                const hash = await bcrypt.hash(password, 10);
                await pool.query("UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, status=$5, permissions=$6 WHERE id=$7", 
                    [username, email, hash, role, status, JSON.stringify(permissions || {}), req.params.id]);
            } else {
                await pool.query("UPDATE users SET username=$1, email=$2, role=$3, status=$4, permissions=$5 WHERE id=$6", 
                    [username, email, role, status, JSON.stringify(permissions || {}), req.params.id]);
            }
            const newRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
            const newUser = newRes.rows[0];

            await logAudit(req.user.username, 'UPDATE_USER', 'users', req.params.id, `Updated user ${username}`);
            await logAdvancedAudit(pool, req.user.username, 'users', req.params.id, 'UPDATE', `Updated user role/status/permissions for ${username}`, oldUser, newUser);
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    }

    async deleteUser(req, res) {
        try {
            const oldRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
            const oldUser = oldRes.rows[0];
            await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
            await logAudit(req.user.username, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`);
            await logAdvancedAudit(pool, req.user.username, 'users', req.params.id, 'DELETE', `Deleted user account ${oldUser?.username || req.params.id}`, oldUser, null);
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: e.message }); }
    }
}

module.exports = new UserController();
