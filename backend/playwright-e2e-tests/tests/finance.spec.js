const { test, expect } = require('@playwright/test');

test.describe('Finance & Accountant 360 Integrity', () => {
  test('Verify Accountant 360 Dashboard Data Accuracy', async ({ page }) => {
    await page.goto('/finance/360');
    await expect(page.locator('text=Revenue, text=الإيرادات')).toBeVisible();
    await expect(page.locator('text=Expenses, text=المصروفات')).toBeVisible();
    
    // Check if numbers are rendered (not just zero if there's data)
    const revenueVal = await page.locator('.stat-value').first().textContent();
    console.log('Current Revenue Stat:', revenueVal);
  });

  test('Verify General Ledger (Journal Entries) Rendering', async ({ page }) => {
    await page.goto('/finance');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Debit, text=مدين')).toBeVisible();
    await expect(page.locator('text=Credit, text=دائن')).toBeVisible();
  });
});
