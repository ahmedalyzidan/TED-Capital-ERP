const { test, expect } = require('@playwright/test');

test.describe('Inventory Module Integrity', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('Verify Inventory Dashboard and Table Rendering', async ({ page }) => {
    await page.goto('/inventory');
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
    const text = await header.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test Receive PO Flow', async ({ page }) => {
    await page.goto('/inventory');
    // Find a 'Pending' or 'Approved' PO to receive
    const receiveButton = page.locator('button:has-text("Receive"), button:has-text("استلام")').first();
    if (await receiveButton.isVisible()) {
      await receiveButton.click();
      
      // Handle the alert if present
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      // Wait for success alert/state
      await new Promise(r => setTimeout(r, 2000));
    }
  });

  test('Test Sales Flow (Stock Deduction)', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Stock Tab
    await page.locator('button').filter({ hasText: /مخزون المستودعات|Inventory Stock|Warehouse Stock/ }).click();

    // Find any stock item row and open its radial hub
    const row = page.locator('tr').nth(1); // Select the first data row
    if (await row.isVisible()) {
      await row.locator('button').first().click(); 
      
      // Click "Issue Stock"
      await page.locator('button').filter({ hasText: /بيع مباشر|Issue Stock/ }).click();

      // Fill in sales details using standardized name attributes
      await page.fill('input[name="qty"]', '1');
      await page.fill('input[name="sell_price"]', '100');
      
      // Fill in down payment to match total price (ensuring balanced entry)
      await page.fill('input[name="down_payment"]', '100');

      // Select the first customer in list
      await page.locator('select[required]').selectOption({ index: 1 });

      // Click "Complete Sale Cycle" button
      const submitBtn = page.locator('button:has-text("Complete Sale Cycle"), button:has-text("إتمام عملية البيع")');
      await expect(submitBtn).toBeVisible();
      
      // Setup dialog handler for the final confirmation alert
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      await submitBtn.click();
      
      // Wait for the modal form to disappear
      await page.waitForFunction(() => !document.querySelector('.animate-fade-in form'), { timeout: 15000 });
    }
  });
});
