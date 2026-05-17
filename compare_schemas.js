const { Pool } = require('pg');
const { execSync } = require('child_process');
const pool = require('./backend/config/db');

async function compare() {
  console.log('🔍 Fetching local database schema...');
  const localRes = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, column_name
  `);
  const localColumns = localRes.rows;

  console.log('🔍 Fetching remote production database schema via SSH...');
  const remoteQuery = `
    SELECT json_agg(t) FROM (
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, column_name
    ) t;
  `;
  
  let remoteColumns = [];
  try {
    const remoteOutput = execSync(
      `ssh -o StrictHostKeyChecking=no root@46.224.144.166 "docker exec -i erp-db psql -U postgres -d erp_db -A -t"`,
      { input: remoteQuery }
    ).toString().trim();
    remoteColumns = JSON.parse(remoteOutput) || [];
  } catch (err) {
    console.error('❌ Failed to fetch remote schema:', err.message);
    process.exit(1);
  }

  // Group by table
  const localTables = {};
  localColumns.forEach(c => {
    if (!localTables[c.table_name]) localTables[c.table_name] = {};
    localTables[c.table_name][c.column_name] = c.data_type;
  });

  const remoteTables = {};
  remoteColumns.forEach(c => {
    if (!remoteTables[c.table_name]) remoteTables[c.table_name] = {};
    remoteTables[c.table_name][c.column_name] = c.data_type;
  });

  const differences = {
    missingTablesInRemote: [],
    missingTablesInLocal: [],
    missingColumnsInRemote: [],
    missingColumnsInLocal: [],
    typeMismatches: []
  };

  // Compare local to remote
  for (const table in localTables) {
    if (!remoteTables[table]) {
      differences.missingTablesInRemote.push(table);
      continue;
    }
    for (const col in localTables[table]) {
      if (!remoteTables[table][col]) {
        differences.missingColumnsInRemote.push(`${table}.${col} (${localTables[table][col]})`);
      } else if (localTables[table][col] !== remoteTables[table][col]) {
        differences.typeMismatches.push(`${table}.${col}: Local is ${localTables[table][col]}, Remote is ${remoteTables[table][col]}`);
      }
    }
  }

  // Compare remote to local
  for (const table in remoteTables) {
    if (!localTables[table]) {
      differences.missingTablesInLocal.push(table);
      continue;
    }
    for (const col in remoteTables[table]) {
      if (!localTables[table][col]) {
        differences.missingColumnsInLocal.push(`${table}.${col} (${remoteTables[table][col]})`);
      }
    }
  }

  // Row counts comparison for key operational tables
  const keyTables = [
    'users',
    'inventory_items',
    'purchase_orders',
    'ledger',
    'real_estate_projects',
    'expenses',
    'companies',
    'projects'
  ];

  const localRowCounts = {};
  const remoteRowCounts = {};

  console.log('📊 Counting table rows on Local and Production databases...');
  for (const table of keyTables) {
    // Local count
    try {
      const res = await pool.query(`SELECT COUNT(*)::integer FROM ${table}`);
      localRowCounts[table] = res.rows[0].count;
    } catch {
      localRowCounts[table] = 'N/A';
    }

    // Remote count
    try {
      const remoteCountQuery = `SELECT COUNT(*)::integer FROM ${table};`;
      const remoteRes = execSync(
        `ssh -o StrictHostKeyChecking=no root@46.224.144.166 "docker exec -i erp-db psql -U postgres -d erp_db -A -t"`,
        { input: remoteCountQuery }
      ).toString().trim();
      remoteRowCounts[table] = parseInt(remoteRes, 10);
    } catch {
      remoteRowCounts[table] = 'N/A';
    }
  }

  console.log('\n======================================');
  console.log('📢 DATABASE SCHEMA INTEGRITY REPORT');
  console.log('======================================');

  let hasDiff = false;

  if (differences.missingTablesInRemote.length > 0) {
    hasDiff = true;
    console.log('\n❌ Missing Tables in Remote (exist in Local only):');
    differences.missingTablesInRemote.forEach(t => console.log(`  - ${t}`));
  }

  if (differences.missingTablesInLocal.length > 0) {
    hasDiff = true;
    console.log('\n❌ Missing Tables in Local (exist in Remote only):');
    differences.missingTablesInLocal.forEach(t => console.log(`  - ${t}`));
  }

  if (differences.missingColumnsInRemote.length > 0) {
    hasDiff = true;
    console.log('\n❌ Missing Columns in Remote (exist in Local only):');
    differences.missingColumnsInRemote.forEach(c => console.log(`  - ${c}`));
  }

  if (differences.missingColumnsInLocal.length > 0) {
    hasDiff = true;
    console.log('\n❌ Missing Columns in Local (exist in Remote only):');
    differences.missingColumnsInLocal.forEach(c => console.log(`  - ${c}`));
  }

  if (differences.typeMismatches.length > 0) {
    hasDiff = true;
    console.log('\n⚠️ Column Type Mismatches:');
    differences.typeMismatches.forEach(m => console.log(`  - ${m}`));
  }

  if (!hasDiff) {
    console.log('\n✅ PERFECT MATCH! The schemas of the Local and Production databases are 100% IDENTICAL!');
  } else {
    console.log('\n⚠️ Differences detected between Local and Production databases.');
  }

  console.log('\n======================================');
  console.log('📊 KEY TABLES ROW COUNT COMPARISON');
  console.log('======================================');
  console.log(String('Table Name').padEnd(25) + ' | ' + String('Local Count').padEnd(12) + ' | ' + String('Production Count').padEnd(16));
  console.log('-'.repeat(60));
  keyTables.forEach(table => {
    console.log(table.padEnd(25) + ' | ' + String(localRowCounts[table]).padEnd(12) + ' | ' + String(remoteRowCounts[table]).padEnd(16));
  });
  console.log('======================================');
  
  pool.end();
}

compare();
