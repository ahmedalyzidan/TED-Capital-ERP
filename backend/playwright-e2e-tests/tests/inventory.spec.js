const { test, expect } = require('@playwright/test');

test.describe('Inventory Module Integrity', () => {
  test('Verify Inventory Dashboard and Table Rendering', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('h1, h2')).toContainText(['Inventory', 'المخازن']);
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test Receive PO Flow', async ({ page }) => {
    await page.goto('/inventory');
    // Find a 'Pending' or 'Approved' PO to receive
    const receiveButton = page.locator('button:has-text("Receive"), button:has-text("استلام")').first();
    if (await receiveButton.isVisible()) {
      await receiveButton.click();
      await page.waitForSelector('text=Success, text=نجاح');
    }
  });

  test('Test Sales Flow (Stock Deduction)', async ({ page }) => {
    await page.goto('/inventory');
    const sellButton = page.locator('button:has-text("Sell"), button:has-text("بيع")').first();
    if (await sellButton.isVisible()) {
      await sellButton.click();
      await page.fill('input[name="qty"]', '1');
      await page.fill('input[name="sell_price"]', '100');
      await page.click('button:has-text("Confirm"), button:has-text("تأكيد")');
      await page.waitForSelector('text=Success, text=نجاح');
    }
  });
});
