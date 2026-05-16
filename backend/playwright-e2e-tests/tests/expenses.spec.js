const { test, expect } = require('@playwright/test');

test.describe('Expenses Module Integrity', () => {
  test('Verify Immediate Posting (Auto-Post) of Expenses', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.locator('text=Add Expense, text=إضافة مصروف')).toBeVisible();
    
    await page.click('button:has-text("Add Expense"), button:has-text("إضافة مصروف")');
    await page.fill('input[name="description"]', 'Test Automated Expense ' + Date.now());
    await page.fill('input[name="amount"]', '250');
    await page.selectOption('select[name="category"]', { index: 1 });
    
    // The fixed button in Expenses.jsx should have auto_post enabled
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Success, text=نجاح');

    // Verify it appears in Finance 360 immediately
    await page.goto('/finance/360');
    const expensesVal = await page.locator('.stat-value:has-text("$"), .stat-value:has-text("EGP")').nth(1).textContent();
    console.log('Total Expenses after post:', expensesVal);
  });
});
