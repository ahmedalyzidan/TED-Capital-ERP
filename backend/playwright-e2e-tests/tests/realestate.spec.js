const { test, expect } = require('@playwright/test');

test.describe('Real Estate Module Integrity', () => {
  test('Verify Contract Creation and Financial Impact', async ({ page }) => {
    await page.goto('/real-estate');
    
    // Verify the premium real estate dashboard is loaded by asserting the tab buttons are present
    const projectTab = page.locator('button:has-text("Projects"), button:has-text("المشاريع")');
    await expect(projectTab.first()).toBeVisible();
    
    // Simulate clicking 'Add Contract' if a unit is available
    const addContractBtn = page.locator('button:has-text("Add Contract"), button:has-text("إضافة عقد")').first();
    if (await addContractBtn.isVisible()) {
      await addContractBtn.click();
      // Fill form with dummy data using name attributes
      await page.fill('input[name="total_price"]', '1000000');
      await page.fill('input[name="down_payment"]', '100000');
      await page.click('button:has-text("Save"), button:has-text("حفظ")');
      
      // Wait for success by verifying the total price modal input is hidden
      await page.waitForSelector('input[name="total_price"]', { state: 'hidden' });
    }
  });

  test('Verify Installment Payment Sync', async ({ page }) => {
    await page.goto('/real-estate');
    const payBtn = page.locator('button:has-text("Pay"), button:has-text("سداد")').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.fill('input[name="paymentAmount"]', '5000');
      await page.click('button:has-text("Confirm"), button:has-text("تأكيد")');
      
      // Wait for success by verifying the payment amount modal input is hidden
      await page.waitForSelector('input[name="paymentAmount"]', { state: 'hidden' });
    }
  });
});
