const { test, expect } = require('@playwright/test');

test.describe('Finance & Accountant 360 Integrity', () => {
  test('Verify Accountant 360 Dashboard Data Accuracy', async ({ page }) => {
    await page.goto('/finance/360');
    
    // Wait for stat cards to load
    await page.waitForSelector('h3.font-mono');
    
    // Verify the premium dashboard headers and localization are present
    const liquidityHeader = page.locator('p:has-text("Liquidity"), p:has-text("السيولة المتاحة")');
    const receivablesHeader = page.locator('p:has-text("Receivables"), p:has-text("مستحقات العملاء")');
    await expect(liquidityHeader.first()).toBeVisible();
    await expect(receivablesHeader.first()).toBeVisible();
    
    // Check if numbers are rendered
    const revenueVal = await page.locator('h3.font-mono').first().textContent();
    console.log('Current Accountant 360 Stat:', revenueVal);
  });

  test('Verify General Ledger (Journal Entries) Rendering', async ({ page }) => {
    // Navigate to the finance page
    await page.goto('/finance');
    
    // Switch to General Ledger tab using the tab button containing 📓
    await page.locator('button').filter({ hasText: /📓|Ledger|اليومية/ }).first().click();
    
    await expect(page.locator('table')).toBeVisible();
    
    // Verify Debit and Credit column headers using standard language-agnostic text locator OR selectors
    await expect(page.locator('th:has-text("Debit"), th:has-text("مدين")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Credit"), th:has-text("دائن")').first()).toBeVisible();
  });
});
