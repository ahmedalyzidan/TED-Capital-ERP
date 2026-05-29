require('dotenv').config();
const { Pool } = require('pg');

const tenantDbs = [
    { db: 'erp_ted_capital', company: 'TED Capital' },
    { db: 'erp_design_concept', company: 'Design Concept' },
    { db: 'erp_primemed_pharma', company: 'PRIMEMED PHARMA' },
    { db: 'erp_master_builder', company: 'Master Builder' }
];

async function syncSchemas() {
    const pgConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
        port: process.env.DB_PORT || 5432
    };

    const centralDbName = process.env.DB_DATABASE || 'erp_db';
    console.log(`📡 Connecting to Reference Database: "${centralDbName}"...`);
    const referencePool = new Pool({ ...pgConfig, database: centralDbName });
    let refClient;

    try {
        refClient = await referencePool.connect();
        console.log(`✅ Connected to Reference Database: "${centralDbName}".`);
    } catch (err) {
        console.error(`❌ Failed to connect to Reference Database: ${err.message}`);
        process.exit(1);
    }

    // 1. Fetch tables structure from Reference Database
    console.log("🔍 Fetching table structures...");
    const refTablesRes = await refClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const refTables = refTablesRes.rows.map(r => r.table_name);
    console.log(`📊 Reference DB has ${refTables.length} tables.`);

    // 2. Fetch column definitions for all tables
    const refColsRes = await refClient.query(`
        SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
    `);
    const refColumns = refColsRes.rows;

    // 3. Fetch Indexes from pg_indexes
    const refIndexesRes = await refClient.query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
    `);
    const refIndexes = refIndexesRes.rows;

    // 4. Fetch Custom Functions & Triggers
    const refFunctionsRes = await refClient.query(`
        SELECT routine_name, routine_definition, data_type
        FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    `);
    const refFunctions = refFunctionsRes.rows;

    const refTriggersRes = await refClient.query(`
        SELECT trigger_name, event_object_table, action_statement, action_timing, event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    `);
    const refTriggers = refTriggersRes.rows;

    // Run synchronization for each tenant database
    for (const tenant of tenantDbs) {
        console.log(`\n========================================`);
        console.log(`🔄 Syncing Database: "${tenant.db}" (Company: ${tenant.company})`);
        console.log(`========================================`);

        const tenantPool = new Pool({ ...pgConfig, database: tenant.db });
        let tenantClient;
        try {
            tenantClient = await tenantPool.connect();
        } catch (err) {
            console.error(`❌ Failed to connect to "${tenant.db}":`, err.message);
            await tenantPool.end();
            continue;
        }

        try {
            await tenantClient.query('SET search_path TO public;');

            // A. Replicate Custom Functions
            console.log(`⚙️ Syncing Custom Functions...`);
            for (const fn of refFunctions) {
                // If it's a system function, skip
                if (fn.routine_name.startsWith('pg_') || fn.routine_name.startsWith('uuid_')) continue;
                try {
                    // Try to extract full definition or build a CREATE FUNCTION statement
                    // Usually we need pg_get_functiondef, let's query it
                    const fnDefRes = await refClient.query(`
                        SELECT pg_get_functiondef(p.oid) as def
                        FROM pg_proc p
                        JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public' AND proname = $1
                    `, [fn.routine_name]);
                    
                    if (fnDefRes.rows.length > 0) {
                        const createFnSql = fnDefRes.rows[0].def;
                        await tenantClient.query(createFnSql);
                    }
                } catch (e) {
                    console.warn(`   ⚠️ Warning: Could not sync function ${fn.routine_name}: ${e.message}`);
                }
            }

            // B. Replicate Tables & Columns
            const tenantTablesRes = await tenantClient.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            const tenantTables = tenantTablesRes.rows.map(r => r.table_name);

            for (const tableName of refTables) {
                if (!tenantTables.includes(tableName)) {
                    console.log(`➕ Table "${tableName}" is missing. Creating...`);
                    // Retrieve CREATE TABLE DDL dynamically or copy column definitions
                    const tableCols = refColumns.filter(c => c.table_name === tableName);
                    const colDefs = tableCols.map(c => {
                        let def = `"${c.column_name}" ${c.data_type}`;
                        if (c.character_maximum_length) {
                            def += `(${c.character_maximum_length})`;
                        }
                        if (c.column_default) {
                            // Don't copy sequence defaults directly as nextval, let's keep it simple or default
                            if (!c.column_default.includes('nextval')) {
                                def += ` DEFAULT ${c.column_default}`;
                            } else {
                                def += ` DEFAULT nextval('${tableName}_id_seq'::regclass)`;
                            }
                        }
                        if (c.is_nullable === 'NO') {
                            def += ' NOT NULL';
                        }
                        return def;
                    });

                    // Ensure ID sequence is handled
                    const hasId = tableCols.some(c => c.column_name === 'id');
                    if (hasId) {
                        await tenantClient.query(`CREATE SEQUENCE IF NOT EXISTS "${tableName}_id_seq"`);
                    }

                    const createTableSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs.join(', ')}${hasId ? `, PRIMARY KEY (id)` : ''})`;
                    await tenantClient.query(createTableSql);
                    console.log(`   ✅ Created table "${tableName}".`);
                } else {
                    // Table exists, check for missing columns
                    const tenantColsRes = await tenantClient.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = $1 AND table_schema = 'public'
                    `, [tableName]);
                    const tenantCols = tenantColsRes.rows.map(c => c.column_name);

                    const refTableCols = refColumns.filter(c => c.table_name === tableName);
                    for (const col of refTableCols) {
                        if (!tenantCols.includes(col.column_name)) {
                            console.log(`🔧 Column "${col.column_name}" is missing in table "${tableName}". Adding...`);
                            
                            // Dynamically create sequence if the column default relies on nextval
                            if (col.column_default && col.column_default.includes('nextval')) {
                                const seqMatch = col.column_default.match(/nextval\('"?([^'"]+)"?'::regclass\)/);
                                if (seqMatch) {
                                    const seqName = seqMatch[1];
                                    await tenantClient.query(`CREATE SEQUENCE IF NOT EXISTS "${seqName}"`);
                                }
                            }

                            let alterSql = `ALTER TABLE "${tableName}" ADD COLUMN "${col.column_name}" ${col.data_type}`;
                            if (col.character_maximum_length) {
                                alterSql += `(${col.character_maximum_length})`;
                            }
                            if (col.column_default) {
                                alterSql += ` DEFAULT ${col.column_default}`;
                            }
                            await tenantClient.query(alterSql);
                            console.log(`   ✅ Added column.`);
                        }
                    }
                }
            }

            // C. Sync Indexes
            console.log(`⚡ Syncing Indexes...`);
            const tenantIndexesRes = await tenantClient.query(`
                SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
            `);
            const tenantIndexes = tenantIndexesRes.rows.map(i => i.indexname);

            for (const idx of refIndexes) {
                if (!tenantIndexes.includes(idx.indexname)) {
                    console.log(`➕ Index "${idx.indexname}" is missing. Creating...`);
                    try {
                        await tenantClient.query(idx.indexdef);
                        console.log(`   ✅ Created index.`);
                    } catch (e) {
                        console.warn(`   ⚠️ Warning: Could not create index ${idx.indexname}: ${e.message}`);
                    }
                }
            }

            // D. Sync Triggers
            console.log(`⚡ Syncing Triggers...`);
            const tenantTriggersRes = await tenantClient.query(`
                SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'
            `);
            const tenantTriggers = tenantTriggersRes.rows.map(t => t.trigger_name);

            for (const trg of refTriggers) {
                if (!tenantTriggers.includes(trg.trigger_name)) {
                    console.log(`➕ Trigger "${trg.trigger_name}" is missing on "${trg.event_object_table}". Replicating...`);
                    try {
                        // Extract trigger DDL from reference DB
                        const trgDefRes = await refClient.query(`
                            SELECT pg_get_triggerdef(t.oid) as def
                            FROM pg_trigger t
                            JOIN pg_class c ON t.tgrelid = c.oid
                            JOIN pg_namespace n ON c.relnamespace = n.oid
                            WHERE n.nspname = 'public' AND tgname = $1
                        `, [trg.trigger_name]);
                        
                        if (trgDefRes.rows.length > 0) {
                            await tenantClient.query(trgDefRes.rows[0].def);
                            console.log(`   ✅ Replicated trigger.`);
                        }
                    } catch (e) {
                        console.warn(`   ⚠️ Warning: Could not replicate trigger ${trg.trigger_name}: ${e.message}`);
                    }
                }
            }

            // Seed default admin
            const defaultPasswordHash = '$2a$10$tZ2zVqZ.k45zK14wG50F7.Kqg21G8.761.k1q5gY7g6b701234567'; // bcrypt dummy hash
            await tenantClient.query(`
                INSERT INTO users (username, email, password_hash, role, status, permissions, is_superadmin)
                VALUES ('admin', 'admin@tedcapital.com', $1, 'Super Admin', 'Active', '{"screens":["ALL"],"tables":{"ALL":["read","create","update","delete","approve","export","import","print","audit"]}}', TRUE)
                ON CONFLICT (username) DO NOTHING
            `, [defaultPasswordHash]);

            console.log(`🎉 Sync completed successfully for "${tenant.db}"!`);
        } catch (e) {
            console.error(`❌ Error during sync for "${tenant.db}":`, e.message);
        } finally {
            tenantClient.release();
            await tenantPool.end();
        }
    }

    refClient.release();
    await referencePool.end();
    console.log("\n🎊 Schema comparison and synchronization fully completed across all databases!");
}

syncSchemas().catch(console.error);
