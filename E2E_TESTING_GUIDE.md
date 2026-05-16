# TED ERP E2E Testing Guide

## Overview
This project includes comprehensive end-to-end (E2E) tests using Playwright to validate the entire ERP system, including:
- Authentication & user flows
- Financial transactions & ledger posting
- Inventory management & stock tracking
- Sales & purchase orders
- Real estate contracts
- Integration between modules

## Quick Start

### Local Testing

**Option 1: Using PowerShell (Recommended for Windows)**
```powershell
.\run-e2e.ps1
```

**Option 2: Using Batch Script (Windows)**
```cmd
run-e2e.bat
```

**Option 3: Manual Steps**
```bash
# Terminal 1: Start the backend server
npm start

# Terminal 2: Run tests
npm run e2e:local

# Or with custom base URL
$env:BASE_URL = "http://localhost:4000"
cd backend/playwright-e2e-tests
npx playwright test
```

### Environment Variables
- `BASE_URL` — Backend URL for tests (default: `http://127.0.0.1:4000`)
- `NODE_ENV` — Set to `test` for test environment
- Database credentials from `.env` file

## Test Structure

### Test Files Location
```
backend/playwright-e2e-tests/
├── tests/
│   ├── auth.setup.js           # Authentication setup
│   ├── expenses.spec.js         # Expenses module tests
│   ├── finance.spec.js          # Finance & Accountant 360 tests
│   ├── finance_integrity.spec.js # Complex financial flows
│   ├── inventory.spec.js        # Inventory management tests
│   └── realestate.spec.js       # Real estate contract tests
├── playwright.config.js         # Playwright configuration
└── package.json                 # Test dependencies
```

## Running Specific Tests

```bash
cd backend/playwright-e2e-tests

# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/finance.spec.js

# Run tests matching pattern
npx playwright test --grep "Inventory"

# Run in headed mode (see browser)
npx playwright test --headed

# Run with trace (for debugging)
npx playwright test --trace on

# Debug with inspector
npx playwright test --debug
```

## Viewing Test Reports

### HTML Report
```bash
npx playwright show-report
```

### Test Videos & Screenshots
- Located in `test-results/` directory
- Videos available for all test runs
- Screenshots captured on failures
- Traces available for detailed debugging

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Daily schedule (02:00 UTC)

Configuration: `.github/workflows/e2e-tests.yml`

### Local Integration with Orchestrator
The `orchestrator.py` script now includes E2E tests:
```bash
python orchestrator.py
```

This will:
1. Update AI context
2. Run pytest financial tests
3. Run pytest UI tests
4. Run Playwright E2E tests (if pytest passes)

## Troubleshooting

### Tests Failing
1. Check backend is running on configured `BASE_URL`
2. Verify database is accessible and populated
3. Check browser console for JavaScript errors
4. Review video artifacts in test-results/

### Backend Connection Issues
```bash
# Verify backend health
curl http://127.0.0.1:4000/api/health

# Check logs
npm start
```

### Authentication Issues
- Ensure `auth.setup.js` runs first (automatic in config)
- Check `playwright/.auth/user.json` for saved session
- Clear auth session: `rm -r playwright/.auth/`

### Element Not Found Errors
- Page structure may have changed
- Use `--headed` mode to see what's happening
- Update selectors in test files if UI changed
- Use `--trace on` to inspect element interactions

## Best Practices

1. **Keep tests independent** — Each test should be able to run in isolation
2. **Use explicit waits** — Don't rely on timeouts
3. **Capture evidence** — Tests auto-capture videos/screenshots on failure
4. **Test user journeys** — Focus on real workflows, not implementation details
5. **Maintain test data** — Ensure test data is consistent and reproducible

## Writing New Tests

Template:
```javascript
import { test, expect } from '@playwright/test';

test('Module Name › Test Description', async ({ page }) => {
  // Navigate to page
  await page.goto('/module-path');
  
  // Perform actions
  await page.fill('input[name="field"]', 'value');
  await page.click('button:has-text("Submit")');
  
  // Verify results
  await expect(page.locator('text=Success')).toBeVisible();
  
  // Check database (if needed)
  // const result = await database.query(...);
});
```

## Performance Targets

- Page load time: < 3 seconds
- Element interaction: < 2 seconds
- Modal confirmation: < 5 seconds
- Database transactions: < 10 seconds

## Contributing

When submitting code:
1. Run local E2E tests: `npm run e2e:local`
2. Fix failing tests before pushing
3. Add new tests for new features
4. Document test changes in PR

## Support

For issues or questions:
- Check GitHub Actions logs for CI failures
- Review test traces: `npx playwright show-trace`
- Check Slack #erp-testing channel
