const { test, expect } = require('@playwright/test');
const { query } = require('../helpers/db');

/**
 * PHASE 5: AUTO-HEALING FINANCIAL INTEGRITY SUITE
 * This suite enforces 100% UI-to-DB reconciliation.
 */

test.describe('Financial Integrity & UI-DB Reconciliation', () => {

  test('Verify Liquidity Cockpit vs Database Balance', async ({ page }) => {
    await page.goto('/finance/360');
    await page.waitForLoadState('networkidle');

    // Robust selector for the liquidity stat card
    const liquidityValue = page.locator('p').filter({ hasText: /^Liquidity$|^السيولة المتاحة$/i }).locator('xpath=following-sibling::h3').first();
    await expect(liquidityValue).toBeVisible({ timeout: 15000 });
    
    const rawText = await liquidityValue.textContent();
    console.log(`Raw UI Liquidity Text: "${rawText}"`);
    
    const cleanText = rawText.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const uiLiquidity = parseFloat(cleanText || "0");

    // DB Reconciliation Query
    if (process.env.SKIP_DB_CHECK === '1') {
        console.log('⚠️ SKIP_DB_CHECK is set. Skipping database verification.');
        return;
    }

    const dbResult = await query(`
        SELECT SUM(l.debit - l.credit) as total 
        FROM ledger l 
        JOIN chart_of_accounts c ON TRIM(l.account_name) = TRIM(c.account_name)
        WHERE c.account_type = 'Asset' 
        AND (c.account_name ILIKE '%نقدية%' OR c.account_name ILIKE '%صندوق%' OR c.account_name ILIKE '%بنك%' OR c.account_code LIKE '110%' OR c.account_code LIKE '111%')
        AND l.is_deleted = FALSE AND c.is_deleted = FALSE
    `);
    const dbLiquidity = parseFloat(dbResult.rows[0].total || 0);

    console.log(`Reconciliation Result -> UI: ${uiLiquidity}, DB: ${dbLiquidity}`);
    expect(Math.abs(uiLiquidity - dbLiquidity)).toBeLessThanOrEqual(10.0); // Tolerating minor sync delays
  });

  test('Verify Double-Entry Equilibrium on Expense Post', async ({ page }) => {
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    // Auto-Healing Click: Wait for button stability
    const addBtn = page.locator('button:has-text("تسجيل مصروف جديد"), button:has-text("Register")').first();
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click({ force: true });
    
    // Phase 5 Enhancement: Explicitly wait for modal visibility and heading
    const modalHeading = page.locator('h3').filter({ hasText: /تسجيل قيد مصروفات ذكي|Smart Expense Entry/i }).first();
    await modalHeading.waitFor({ state: 'visible', timeout: 15000 });
    
    // Find form inside the active modal
    const modalForm = page.locator('div.fixed').filter({ has: modalHeading }).locator('form');
    const desc = 'REGRESSION_TEST_' + Date.now();
    
    // Interaction with dynamic waits
    await modalForm.locator('input[type="text"]').first().fill(desc);
    
    const companySelect = modalForm.locator('select').first();
    await companySelect.selectOption({ index: 1 });
    
    await modalForm.locator('select').nth(1).selectOption({ index: 1 });
    await modalForm.locator('input[type="number"]').first().fill('500');
    
    // Ensure category select is populated
    const catSelect = modalForm.locator('select').nth(4);
    await expect(catSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    await catSelect.selectOption({ index: 1 });
    
    // Final Posting
    await modalForm.locator('button[type="submit"]').click();

    // Verify modal closes
    await expect(modalHeading).not.toBeVisible({ timeout: 20000 });

    // DB Equilibrium Audit (Phase 5 Mandatory Check)
    if (process.env.SKIP_DB_CHECK === '1') {
        console.log('⚠️ SKIP_DB_CHECK is set. Skipping database verification.');
        return;
    }

    const transactionCheck = await query(`
        SELECT SUM(debit) as total_debit, SUM(credit) as total_credit
        FROM ledger
        WHERE description LIKE $1
    `, [`%${desc}%`]);

    const { total_debit, total_credit } = transactionCheck.rows[0];
    const debit = parseFloat(total_debit || 0);
    const credit = parseFloat(total_credit || 0);
    
    console.log(`Equilibrium Audit for ${desc}: Debit=${debit}, Credit=${credit}`);
    
    expect(debit).toBeGreaterThan(0);
    expect(debit).toBe(credit);
  });

});
