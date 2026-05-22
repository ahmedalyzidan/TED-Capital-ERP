const pool = require('./config/db');

async function inspect() {
  try {
    console.log("--- SUBCONTRACTORS ---");
    const subRes = await pool.query("SELECT id, name, paid_amount, project_name FROM subcontractors;");
    console.table(subRes.rows);

    console.log("--- SUBCONTRACTOR STATEMENTS ---");
    const statRes = await pool.query("SELECT * FROM subcontractor_statements;");
    console.log(JSON.stringify(statRes.rows, null, 2));

    console.log("--- SUBCONTRACTOR INVOICES ---");
    const invRes = await pool.query("SELECT id, subcontractor_id, subcontractor_name, project_id, net_amount, status, is_deleted FROM subcontractor_invoices;");
    console.table(invRes.rows);

  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await pool.end();
  }
}

inspect();
