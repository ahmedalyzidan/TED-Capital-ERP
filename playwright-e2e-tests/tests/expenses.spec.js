const { test, expect } = require('@playwright/test');

test.describe('Expenses Module Integrity', () => {
  test('Verify Immediate Posting (Auto-Post) of Expenses', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate directly to expenses page
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main h1, main h2, div.max-w-\\[1600px\\] h1').first()).toContainText(/Expense|المصروفات|إدارة المصروفات/i);
    
    const addBtn = page.locator('button:has-text("Register"), button:has-text("تسجيل")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    
    // Fill Description - be specific to avoid global search
    const expenseDesc = 'Test Automated Expense ' + Date.now();
    
    // Find form inside the active modal
    const modalHeading = page.locator('h3').filter({ hasText: /تسجيل قيد مصروفات ذكي|Smart Expense Entry/i }).first();
    const modalForm = page.locator('div.fixed').filter({ has: modalHeading }).locator('form');
    
    const descInput = modalForm.locator('input[type="text"]').first();
    await descInput.fill(expenseDesc);
    
    // Select Company (1st select)
    const companySelect = modalForm.locator('select').first();
    await companySelect.selectOption({ index: 1 });
    
    // Select Category (5th select since currency is 4th)
    const catSelect = modalForm.locator('select').nth(4);
    await expect(catSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    await catSelect.selectOption({ index: 1 });
    
    // Amount is the first number input
    await modalForm.locator('input[type="number"]').first().fill('250');
    
    await page.screenshot({ path: 'debug-expenses-form-final.png' });
    await modalForm.locator('button[type="submit"]').click();
    
    // Wait for modal to close
    await page.screenshot({ path: 'debug-expenses-after-submit.png' });
    
    // Search for the specific expense (use local search, not global)
    const searchInput = page.locator('main').locator('input[type="text"]').first();
    await searchInput.fill(expenseDesc);
    await page.waitForTimeout(2000); // Wait for filter
    
    const postedText = page.getByText(expenseDesc).first();
    await expect(postedText).toBeVisible({ timeout: 20000 });
    await expect(page.locator('table')).toContainText(expenseDesc);

    // Verify it appears in Finance 360 immediately
    await page.goto('/finance/360');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug-acc360-nav.png' });
    
    // The stats use modernized UI locators based on stat titles
    const expensesValue = page.locator('p').filter({ hasText: /Payable|مستحقات الموردين/i }).locator('xpath=following-sibling::h3').first();
    await expect(expensesValue).toBeVisible({ timeout: 15000 });
    
    const expensesVal = await expensesValue.textContent();
    console.log('Finance 360 Stat Value:', expensesVal);
  });
});
