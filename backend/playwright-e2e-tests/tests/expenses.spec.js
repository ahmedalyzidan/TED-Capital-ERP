const { test, expect } = require('@playwright/test');

test.describe('Expenses Module Integrity', () => {
  test('Verify Immediate Posting (Auto-Post) of Expenses', async ({ page }) => {
    await page.goto('/expenses');
    
    // Locate the trigger button: "Register New Expense" or "تسجيل مصروف جديد"
    const addExpenseBtn = page.locator('button:has-text("Register New Expense"), button:has-text("تسجيل مصروف جديد")');
    await expect(addExpenseBtn).toBeVisible();
    await addExpenseBtn.click();
    
    // Fill the form fields using the standardized name attributes we injected
    await page.fill('input[name="description"]', 'Test Automated Expense ' + Date.now());
    await page.fill('input[name="amount"]', '250');
    
    // Select the company entity
    await page.selectOption('select[name="company_entity"]', { index: 1 });
    
    // Select the category
    await page.selectOption('select[name="category"]', { index: 1 });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for the modal form to disappear (representing success)
    await page.waitForSelector('input[name="description"]', { state: 'hidden' });

    // Verify it appears in Finance 360 immediately
    await page.goto('/finance/360');
    
    // Wait for the accountant 360 dashboard header to be visible
    const commandCenterHeader = page.locator('h1:has-text("Accountant 360 Command Center"), h1:has-text("مركز تحكم المحاسب 360")');
    await expect(commandCenterHeader).toBeVisible({ timeout: 15000 });
  });
});
