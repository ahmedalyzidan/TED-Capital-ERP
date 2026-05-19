const pool = require('./config/db');
(async () => {
  try {
    const res = await pool.query("SELECT permissions FROM users WHERE username = 'MTAYEM'");
    if (res.rows.length > 0) {
      const perms = res.rows[0].permissions || {};
      perms.companies = ['PRIMEMED PHARMA', 'TED Capital'];
      await pool.query("UPDATE users SET permissions = $1 WHERE username = 'MTAYEM'", [perms]);
      console.log('✅ MTAYEM permissions updated successfully in DB');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
