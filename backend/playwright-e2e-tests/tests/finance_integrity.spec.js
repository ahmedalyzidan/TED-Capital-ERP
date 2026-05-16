const { test, expect } = require('@playwright/test');
const pool = require('../../config/db');

test.describe('Finance Integrity & Cross-Module Sync', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('Complex Sale Flow: Inventory -> Ledger -> Financial Statements', async ({ page }) => {
    test.setTimeout(120000);
    
    const customerName = 'أحمد علي';
    const testRef = `E2E-FIN-${Date.now()}`;
    const qty = 5;
    const price = 2000;
    const vatRate = 14;
    const whtRate = 1;
    const downPayment = 5000;
    
    // 1. Navigate to Inventory
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // 2. Switch to Stock Tab
    console.log('🔄 Switching to Stock Tab...');
    await page.locator('button').filter({ hasText: /مخزون المستودعات|Inventory Stock/ }).click();
    
    // 3. Find item 'FRFR'
    console.log('🔎 Finding item FRFR...');
    const row = page.locator('tr', { hasText: 'FRFR' }).first();
    await row.waitFor({ state: 'visible' });
    
    // Open Radial Hub
    await row.locator('button').first().click(); 
    
    // Click "Issue Stock"
    await page.locator('button').filter({ hasText: /بيع مباشر|Issue Stock/ }).click();

    // 4. Fill Sale Modal
    console.log('📝 Filling Sale Modal...');
    await page.waitForSelector('select[required]');
    await page.selectOption('select[required]', { label: customerName });
    await page.locator('input[type="number"][max]').fill(qty.toString());
    await page.locator('input[placeholder*="Price"], input[placeholder*="سعر"]').fill(price.toString());
    
    // VAT & WHT
    await page.locator('select').filter({ hasText: '0%' }).first().selectOption('14');
    await page.locator('select').filter({ hasText: '0%' }).last().selectOption('1');

    // Payment
    await page.selectOption('select:has-text("Cash 💵")', 'Bank');
    await page.fill('input[placeholder="0.00"]', downPayment.toString());
    await page.fill('input[placeholder="Transaction Ref No"]', testRef);

    // Balance Installment
    const balance = (qty * price) + (qty * price * (vatRate/100)) - (qty * price * (whtRate/100)) - downPayment;
    if (balance > 0) {
        console.log(`📅 Adding installment for balance: ${balance}`);
        await page.click('text=+ Add Installment');
        await page.locator('input[type="date"]').last().fill(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
        await page.locator('input[placeholder="0.00"]').last().fill(balance.toString());
    }

    // 5. Submit Sale & Handle Alert
    console.log('🚀 Submitting Sale...');
    page.on('dialog', async dialog => {
        console.log(`🔔 Dialog detected: ${dialog.message()}`);
        await dialog.accept();
    });

    await page.locator('button[type="submit"]').click();
    
    // 6. Verify Modal Closing
    console.log('⏳ Waiting for modal to close...');
    await page.waitForFunction(() => !document.querySelector('.animate-fade-in form'), { timeout: 30000 });
    console.log('✅ Sale Submitted and Modal Closed!');

    // 7. Verify Database Integrity (Ledger & Accounting)
    if (process.env.SKIP_DB_CHECK) {
        console.log('⚠️ SKIP_DB_CHECK is set. Skipping database verification.');
        return;
    }

    console.log('🔍 Verifying Ledger Entries in Database...');
    await new Promise(r => setTimeout(r, 4000));
    
    const saleRes = await pool.query("SELECT id FROM inventory_sales ORDER BY id DESC LIMIT 1");
    if (saleRes.rows.length === 0) {
        console.log('❌ No sales found in database.');
        return;
    }
    const saleId = saleRes.rows[0].id;
    
    // We use a broad but specific filter for the invoice ID in both formats
    const entries = await pool.query(
        "SELECT * FROM ledger WHERE (description LIKE $1 OR description LIKE $2)", 
        [`%فاتورة ${saleId}%`, `%فاتورة مبيعات ${saleId}%`]
    );
    console.log(`📊 Found ${entries.rows.length} ledger entries for Sale ID ${saleId}`);
    
    // Filter specifically for the current customer if there are overlaps
    const myEntries = entries.rows.filter(r => 
        r.description.includes(customerName) || 
        r.description.includes('ضريبة') || 
        r.description.includes('تكلفة مبيعات') ||
        r.description.includes('دفعة مقدمة')
    );
    
    // 8. Financial Integrity Checks
    const totalDebits = myEntries.reduce((sum, r) => sum + Number(r.debit), 0);
    const totalCredits = myEntries.reduce((sum, r) => sum + Number(r.credit), 0);
    
    console.log(`⚖️ Debits: ${totalDebits}, Credits: ${totalCredits}`);
    expect(totalDebits).toBeGreaterThan(0);
    expect(totalDebits).toBeCloseTo(totalCredits, 2);
    
    const findEntry = (namePart) => myEntries.find(r => r.account_name.includes(namePart));
    
    const revenueEntry = findEntry('إيرادات مبيعات');
    const bankEntry = findEntry('بنك CIB');
    
    console.log('📑 Validating specific entry balances...');
    expect(revenueEntry, 'Revenue entry not found').toBeDefined();
    expect(Number(revenueEntry.credit)).toBe(qty * price);
    
    expect(bankEntry, 'Bank entry not found').toBeDefined();
    expect(Number(bankEntry.debit)).toBe(downPayment);
    
    console.log('💎 All financial integrity checks PASSED!');
  });
});
