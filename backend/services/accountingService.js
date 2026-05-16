const pool = require('../config/db');
const { logAdvancedAudit } = require('../utils/helpers');

/**
 * محرك القيود المحاسبية الآلي (Automated Accounting Engine)
 * مسؤول عن تسجيل القيود المزدوجة (Double-Entry Bookkeeping) بشكل آمن وآلي.
 */
class AccountingService {

  
  /**
   * تسجيل قيد مفرد (مدين أو دائن)
   */
  static async logEntry(client, accountIdentifier, costCenter, debit, credit, description, username, referenceNo = null, clientId = null, sourceModule = null, reqContext = null, isContra = false, originalEntryId = null, companyId = null, company = null) {
    try {
        let accName = accountIdentifier;
        let origAcc = null;
        
        // التحقق مما إذا كان المُدخل رقم (ID) أم كود الحساب (Account Code) أم اسم الحساب
        if (accountIdentifier !== null && accountIdentifier !== '') {
            let queryStr = "SELECT id, account_code, account_name, account_type, company_entity, parent_account FROM chart_of_accounts WHERE account_name = $1";
            let queryParams = [accountIdentifier.toString()];
            if (!isNaN(Number(accountIdentifier))) {
                queryStr += " OR id = $2 OR account_code = $1";
                queryParams.push(parseInt(accountIdentifier, 10));
            }
            queryStr += " LIMIT 1";

            const accRes = await client.query(queryStr, queryParams);
            if (accRes.rows.length > 0) {
                origAcc = accRes.rows[0];
                accName = origAcc.account_name;
            } else if (!isNaN(Number(accountIdentifier))) {
                throw new Error(`الحساب رقم/كود ${accountIdentifier} غير موجود في شجرة الحسابات.`);
            }
        }

        // 🌟 تحديد الشركة التابع لها المشروع والتوجيه التلقائي للحسابات (Automated Company Routing)
        let resolvedCompany = company || 'TED Capital'; // Default fallback company
        let resolvedCompanyId = companyId || 1; // Default TED CAPITAL company_id

        if (companyId && !company) {
            try {
                const compRes = await client.query("SELECT name FROM companies WHERE id = $1", [companyId]);
                if (compRes.rows.length > 0) {
                    resolvedCompany = compRes.rows[0].name;
                    if (resolvedCompany === 'MASTER BUILDER') resolvedCompany = 'Master Builder';
                    else if (resolvedCompany === 'DESIGN CONCEPT') resolvedCompany = 'Design Concept';
                    else if (resolvedCompany === 'TED CAPITAL') resolvedCompany = 'TED Capital';
                }
            } catch(e){}
        } else if (costCenter && costCenter !== 'General' && !companyId && !company) {
            try {
                const projRes = await client.query(
                    "SELECT company, company_id FROM projects WHERE name = $1 OR id::text = $1 LIMIT 1",
                    [costCenter.toString()]
                );
                if (projRes.rows.length > 0) {
                    const pRow = projRes.rows[0];
                    if (pRow.company) {
                        resolvedCompany = pRow.company;
                    }
                    if (pRow.company_id) {
                        resolvedCompanyId = pRow.company_id;
                    } else if (resolvedCompany) {
                        // Match resolvedCompany string to companies table to find company_id
                        const compRes = await client.query(
                            "SELECT id, name FROM companies WHERE UPPER(name) = UPPER($1) OR name ILIKE $2 LIMIT 1",
                            [resolvedCompany, `%${resolvedCompany}%`]
                        );
                        if (compRes.rows.length > 0) {
                            resolvedCompanyId = compRes.rows[0].id;
                            // Normalize resolvedCompany to Title Case for chart of accounts matching
                            if (compRes.rows[0].name === 'MASTER BUILDER') resolvedCompany = 'Master Builder';
                            else if (compRes.rows[0].name === 'DESIGN CONCEPT') resolvedCompany = 'Design Concept';
                            else if (compRes.rows[0].name === 'TED CAPITAL') resolvedCompany = 'TED Capital';
                        }
                    }
                }

                // التوجيه التلقائي للحساب إذا كان الحساب الأصلي يخص شركة أخرى
                if (origAcc && origAcc.company_entity && origAcc.company_entity !== 'All' && origAcc.company_entity !== resolvedCompany) {
                    // البحث عن الحساب المرادف في الشركة الجديدة بنفس الحساب الرئيسي أو نفس النوع والكلمات المفتاحية
                    const isCash = origAcc.account_name.includes('صندوق') || origAcc.account_name.includes('نقدية');
                    const isBank = origAcc.account_name.includes('بنك');
                    
                    let matchQuery = `
                        SELECT account_name FROM chart_of_accounts 
                        WHERE company_entity = $1 
                        AND parent_account = $2 
                    `;
                    if (isCash) {
                        matchQuery += ` AND (account_name LIKE '%صندوق%' OR account_name LIKE '%نقدية%') `;
                    } else if (isBank) {
                        matchQuery += ` AND account_name LIKE '%بنك%' `;
                    }
                    matchQuery += ` LIMIT 1`;

                    const matchRes = await client.query(matchQuery, [
                        resolvedCompany, 
                        origAcc.parent_account || ''
                    ]);

                    if (matchRes.rows.length > 0) {
                        console.log(`🔀 [Auto-Routing] Switched account from '${accName}' (${origAcc.company_entity}) to '${matchRes.rows[0].account_name}' (${resolvedCompany}) for project '${costCenter}'`);
                        accName = matchRes.rows[0].account_name;
                    }
                }
            } catch (projErr) {
                console.warn(`⚠️ Could not resolve company/route account for project ${costCenter}:`, projErr.message);
            }
        } else if (origAcc && origAcc.company_entity && origAcc.company_entity !== 'All' && !companyId && !company) {
            resolvedCompany = origAcc.company_entity;
            try {
                const compRes = await client.query(
                    "SELECT id, name FROM companies WHERE UPPER(name) = UPPER($1) OR name ILIKE $2 LIMIT 1",
                    [resolvedCompany, `%${resolvedCompany}%`]
                );
                if (compRes.rows.length > 0) {
                    resolvedCompanyId = compRes.rows[0].id;
                }
            } catch(e){}
        }

        // 🌟 تطبيق Row-Level Security (RLS) للسياق الحالي
        if (reqContext?.primaryOrgUnitId) {
            await client.query(`SET LOCAL app.current_org_unit_id = $1`, [reqContext.primaryOrgUnitId]);
        }


        // إدراج القيد في دفتر الأستاذ العام (General Ledger)
        const query = `
          INSERT INTO ledger (account_name, cost_center, debit, credit, description, created_by, client_id, source_module, org_unit_id, is_contra, original_entry_id, company, company_id, created_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
          RETURNING id
        `;
        
        const res = await client.query(query, [
            accName, 
            costCenter || 'General', 
            parseFloat(debit) || 0, 
            parseFloat(credit) || 0, 
            description + (referenceNo ? ` | مرجع: ${referenceNo}` : ''), 
            username || 'System',
            clientId,
            sourceModule,
            reqContext?.primaryOrgUnitId || null,
            isContra,
            originalEntryId,
            resolvedCompany,
            resolvedCompanyId
        ]);
        
        const entryId = res.rows[0].id;

        // 🌟 تسجيل التدقيق المتقدم (Advanced Forensic Audit)
        try {
            await logAdvancedAudit(
                client,
                username || 'System',
                'ledger',
                entryId,
                'LEDGER_POST',
                `Posted ledger entry #${entryId} for account '${accName}' | Project: '${costCenter || 'General'}' | Company: '${resolvedCompany}' | Debit: ${debit} | Credit: ${credit}`,
                null,
                {
                    account_name: accName,
                    original_account_input: accountIdentifier,
                    cost_center: costCenter || 'General',
                    resolved_company: resolvedCompany,
                    debit: parseFloat(debit) || 0,
                    credit: parseFloat(credit) || 0,
                    description,
                    reference_no: referenceNo,
                    source_module: sourceModule
                }
            );
        } catch (auditErr) {
            console.warn("⚠️ Non-fatal audit log warning in AccountingService:", auditErr.message);
        }

        return entryId;
    } catch (err) {
        console.error("🔥 [Accounting Engine Error] Failed to log entry:", err.message);
        throw err; 
    }
  }

  /**
   * صمام أمان الفترات المالية (Fiscal Period Safety Lock)
   * يمنع التسجيل في أي شهر تم إقفاله مسبقاً
   */
  static async checkPeriod(client, date = new Date()) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const res = await client.query("SELECT status FROM fiscal_periods WHERE year = $1 AND month = $2", [year, month]);
    if (res.rows.length > 0 && res.rows[0].status === 'Closed') {
      throw new Error(`🛑 الفترة المالية ${month}-${year} مغلقة. لا يمكن إجراء حركات محاسبية.`);
    }
  }

  /**
   * تدقيق سلامة القيود (Audit Integrity Check)
   * تبحث عن أي قيد مزدوج غير متوازن أو أي مبالغ مفقودة
   */
  static async reconcileLedger(client) {
    const sql = `
        SELECT REPLACE(REPLACE(description, 'تسوية موازنة تاريخية لـ: ', ''), 'تسوية تلقائية للفروق: ', '') as clean_desc, SUM(debit) as total_debit, SUM(credit) as total_credit
        FROM ledger
        GROUP BY clean_desc
        HAVING SUM(debit) != SUM(credit)
    `;
    const res = await client.query(sql);
    return res.rows;
  }

  /**
   * تدقيق السجلات غير المخصصة لشركات (Check Unassigned Entities)
   */
  static async checkUnassignedEntities(client) {
      const sql = `
          SELECT id, account_name, cost_center, debit, credit, description, created_at
          FROM ledger
          WHERE company_id IS NULL OR company IS NULL OR company = ''
      `;
      const res = await client.query(sql);
      return res.rows;
  }

  /**
   * معالجة وتخصيص السجلات القديمة غير المخصصة (Auto-Assign Legacy Entries)
   */
  static async autoAssignLegacyEntries(client) {
      // 1. محاولة الربط من جدول المشاريع أولاً
      await client.query(`
          UPDATE ledger l
          SET company = p.company,
              company_id = p.company_id
          FROM projects p
          WHERE (l.cost_center = p.name OR l.cost_center = p.id::text)
          AND (l.company_id IS NULL OR l.company IS NULL OR l.company = '')
          AND p.company_id IS NOT NULL
      `);

      // 2. تعيين القيم الافتراضية (TED Capital) لما تبقى
      const res = await client.query(`
          UPDATE ledger
          SET company = 'TED Capital',
              company_id = 1
          WHERE company_id IS NULL OR company IS NULL OR company = ''
      `);
      return res.rowCount;
  }

  /**
   * موازنة الأرصدة التاريخية (Historical Suspense Balancer)
   * تقوم بجعل كافة القيود التاريخية متوازنة عبر الترحيل لحساب معلق
   */
  static async fixHistoricalImbalances(client, username) {
      const imbalances = await this.reconcileLedger(client);
      let fixedCount = 0;
      for (const imb of imbalances) {
          const diff = imb.total_debit - imb.total_credit;
          if (diff === 0) continue;

          // إذا كان المدين أكثر، نحتاج لقيد دائن بالحساب المعلق، والعكس بالعكس
          const isDebitFix = diff < 0; 
          const amount = Math.abs(diff);

          await this.logEntry(
              client, 
              'حساب معلق - تسويات نظام', 
              'General', 
              isDebitFix ? amount : 0, 
              isDebitFix ? 0 : amount, 
              `تسوية موازنة تاريخية لـ: ${imb.description}`, 
              username
          );
          fixedCount++;
      }
      return fixedCount;
  }

  /**
   * الإصلاح التلقائي لفروق الكسور (Auto-Fix Rounding)
   * يقوم بتسوية الفروقات البسيطة (أقل من 0.1) في حساب التسويات
   */
  static async autoFixRounding(client, username) {
      const imbalances = await this.reconcileLedger(client);
      let fixedCount = 0;
      for (const imb of imbalances) {
          const diff = Math.abs(imb.total_debit - imb.total_credit);
          if (diff > 0 && diff < 0.1) {
              const fixAmount = imb.total_debit > imb.total_credit ? (imb.total_debit - imb.total_credit) : (imb.total_credit - imb.total_debit);
              const isDebitFix = imb.total_debit < imb.total_credit;
              
              await this.logEntry(
                  client, 
                  'حساب تسويات الكسور', 
                  'General', 
                  isDebitFix ? fixAmount : 0, 
                  isDebitFix ? 0 : fixAmount, 
                  `تسوية تلقائية للفروق: ${imb.description}`, 
                  username
              );
              fixedCount++;
          }
      }
      return fixedCount;
  }

  /**
   * تسجيل قيد مزدوج متكامل (مدين ودائن)
   * يضمن التوازن المحاسبي قبل الحفظ
   */
  static async recordDoubleEntry(client, { debitAccount, creditAccount, amount, costCenter, description, username, referenceNo, clientId, sourceModule, date = new Date(), reqContext = null, companyId = null, company = null }) {
    if (amount <= 0) return null;

    try {
      // التحقق من الفترة المالية
      await this.checkPeriod(client, date);

      // تسجيل الطرف المدين (Debit)
      const debitId = await this.logEntry(client, debitAccount, costCenter, amount, 0, description, username, referenceNo, clientId, sourceModule, reqContext, false, null, companyId, company);
      
      // تسجيل الطرف الدائن (Credit)
      const creditId = await this.logEntry(client, creditAccount, costCenter, 0, amount, description, username, referenceNo, clientId, sourceModule, reqContext, false, null, companyId, company);

      return { debitId, creditId, success: true };
    } catch (err) {
      console.error("🔥 [Accounting Engine Error] Double entry failed:", err.message);
      throw err;
    }
  }

  /**
   * تسجيل قيد يومية متوازن متعدد الأسطر (Multi-line Balanced JV)
   */
  static async recordBalancedJV(pool, rows, username, reqContext = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
        const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error("الجلسة غير متوازنة محاسبياً.");
        }

        const referenceNo = `JV-${Date.now()}`;

        for (const row of rows) {
            await this.logEntry(
                client, 
                row.account_name, 
                row.cost_center, 
                row.debit, 
                row.credit, 
                row.description, 
                username, 
                referenceNo,
                null, // clientId
                'General', // sourceModule
                reqContext
            );
        }

        await client.query('COMMIT');
        return referenceNo;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
  }

  /**
   * توليد قيد عكسي (Contra Entry) لإلغاء معاملة سابقة
   * يتبع معايير IFRS في إلغاء القيود عبر قيد عكسي بدلاً من المسح
   */
  static async generateContraEntry(client, originalEntryIds, username, reason = "تصحيح محاسبي") {
    const results = [];
    for (const id of originalEntryIds) {
        const origRes = await client.query("SELECT * FROM ledger WHERE id = $1", [id]);
        if (origRes.rows.length === 0) continue;
        const orig = origRes.rows[0];

        if (orig.is_reversed || orig.is_contra) {
            console.warn(`⚠️ القيد #${id} معكوس بالفعل أو هو قيد عكسي.`);
            continue;
        }

        // إنشاء القيد العكسي (تبديل المدين والدائن)
        const contraId = await this.logEntry(
            client,
            orig.account_name,
            orig.cost_center,
            orig.credit, // المدين الجديد هو الدائن القديم
            orig.debit,  // الدائن الجديد هو المدين القديم
            `[CONTRA] ${reason} - إلغاء للقيد #${orig.id}: ${orig.description}`,
            username,
            orig.reference_no,
            orig.client_id,
            orig.source_module,
            null, // reqContext
            true, // isContra = true
            orig.id // originalEntryId
        );

        // تحديث القيد الأصلي لتعليم أنه تم عكسه
        await client.query("UPDATE ledger SET is_reversed = TRUE, reversal_id = $1 WHERE id = $2", [contraId, orig.id]);
        
        results.push({ originalId: orig.id, contraId });
    }
    return results;
  }

  /**
   * جلب توجيهات القيود المحاسبية من الإعدادات (GL Mappings) بناءً على نوع الحركة
   */
  static async getMapping(client, transactionType) {
    const res = await client.query(`SELECT debit_account, credit_account FROM gl_mappings WHERE transaction_type = $1`, [transactionType]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    return null; // إذا لم يوجد إعداد مسبق
  }
}

module.exports = AccountingService;
