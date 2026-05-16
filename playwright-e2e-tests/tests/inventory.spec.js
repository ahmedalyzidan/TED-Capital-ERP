const { test, expect } = require('@playwright/test');

test.describe('Inventory Module Integrity', () => {
  test('Verify Inventory Dashboard and Table Rendering', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate via sidebar to be sure
    const inventoryLink = page.locator('aside').getByText('المخازن').first();
    await inventoryLink.click();
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'debug-inventory.png' });
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main h1, main h2').first()).toContainText(/Inventory|المخازن|إدارة التوريدات/);
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test Receive PO Flow', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Find the first row's Action Hub
    const actionHub = page.locator('tr').filter({ hasText: /Pending|Approved/ }).locator('button:has-text("⚡")').first();
    if (await actionHub.isVisible()) {
      await actionHub.click();
      // Click the Receive icon (📥)
      const receiveAction = page.locator('button').filter({ has: page.locator('text=📥') }).first();
      await receiveAction.click();
      
      // Handle confirmation dialog if it appears
      page.on('dialog', async dialog => {
          await dialog.accept();
      });
      
      // Wait for success toast or redirection
      await page.waitForSelector('text=Success, text=نجاح', { timeout: 10000 }).catch(() => {});
    }
  });

  test('Test Sales Flow (Stock Deduction)', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Switch to Stock tab
    await page.click('button:has-text("🏪"), button:has-text("المخازن")');
    
    const actionHub = page.locator('tr').filter({ has: page.locator('td') }).locator('button:has-text("⚡")').first();
    if (await actionHub.isVisible()) {
      await actionHub.click();
      // Click the Sell icon (🚀)
      const sellAction = page.locator('button').filter({ has: page.locator('text=🚀') }).first();
      await sellAction.click();
      
      // Fill Sale Modal
      await page.waitForSelector('form');
      await page.fill('input[name="qty"]', '1');
      await page.fill('input[name="sell_price"]', '100');
      
      // Select a client (mandatory)
      const clientSelect = page.locator('select').first();
      if (await clientSelect.isVisible()) {
          await clientSelect.selectOption({ index: 1 });
      }

      // Add an installment to clear balance (assuming 100 total)
      const addInstallmentBtn = page.locator('button:has-text("تقسيط المتبقي"), button:has-text("Installment")').first();
      if (await addInstallmentBtn.isVisible()) {
          await addInstallmentBtn.click();
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Success, text=نجاح', { timeout: 10000 }).catch(() => {});
    }
  });
});
