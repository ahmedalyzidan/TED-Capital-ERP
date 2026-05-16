const { test, expect } = require('@playwright/test');

test.describe('Finance & Accountant 360 Integrity', () => {
  test('Verify Accountant 360 Dashboard Data Accuracy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Accountant 360 via sidebar
    const acc360Link = page.locator('aside').getByText('المحاسب 360').first();
    await acc360Link.click();
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug-acc360-nav.png' });
    await expect(page.locator('main h1, main h2').first()).toContainText(/Accountant 360|المحاسب 360/);
    
    // Check for Liquidity stat
    const statText = page.locator('main').getByText(/Liquidity|السيولة|السيولة المتاحة/);
    await expect(statText.first()).toBeVisible();
    
    const cashVal = await page.locator('h3.font-mono').first().textContent();
    console.log('Current Cash Stat:', cashVal);
  });

  test('Verify General Ledger (Journal Entries) Rendering', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Finance via sidebar
    const financeLink = page.locator('aside').getByText('المالية', { exact: true }).first();
    await financeLink.click();
    
    await page.waitForLoadState('networkidle');
    
    // Switch to Ledger tab
    await page.click('button:has-text("Journal"), button:has-text("اليومية")');
    
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Debit|مدين/ })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Credit|دائن/ })).toBeVisible();
  });
});
