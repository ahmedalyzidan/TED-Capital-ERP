const { test: setup, expect } = require('@playwright/test');
const path = require('path');

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  console.log('🚀 Starting Authentication Setup...');
  await page.goto('/login');
  
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  console.log('⏳ Waiting for company scope step...');
  await page.waitForTimeout(2000);

  // Click submit again to confirm company scope and complete login
  const enterBtn = page.locator('button[type="submit"]');
  if (await enterBtn.count() > 0) {
      console.log('🏢 Confirming company scope...');
      await enterBtn.click();
  }

  console.log('⏳ Waiting for final page redirection...');
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);
  
  await page.screenshot({ path: path.join(__dirname, '../debug-login.png') });
  console.log('📸 Screenshot saved to debug-login.png');

  // If we are not on login, assume success and save
  if (!currentUrl.includes('/login')) {
      console.log('✅ Not on login page. Saving storage state...');
      await page.context().storageState({ path: authFile });
      console.log('💾 Storage state saved successfully.');
  } else {
      console.log('❌ Still on login page. Authentication failed?');
      const body = await page.textContent('body');
      console.log(`📄 Page Text Snippet: ${body.substring(0, 200)}`);
  }
});
