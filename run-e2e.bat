@echo off
REM ===================================
REM TED ERP E2E Test Runner (Windows)
REM ===================================
REM Starts backend server and runs Playwright E2E tests

SETLOCAL ENABLEDELAYEDEXPANSION

echo.
echo 🚀 TED ERP E2E Test Suite
echo ===============================
echo.

REM Check if Node is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 20+
    exit /b 1
)

REM Set environment
set NODE_ENV=test
set PORT=4000
set BASE_URL=http://127.0.0.1:4000

echo ⚙️  Starting backend server on %BASE_URL%...
start "Backend Server" node backend/server.js

REM Wait for backend to be ready
echo ⏳ Waiting for backend to be healthy...
timeout /t 10 /nobreak

echo.
echo 🧪 Running E2E tests...
echo.

cd backend\playwright-e2e-tests
npx playwright test --project=chromium --reporter=html

REM Store exit code
set EXIT_CODE=%errorlevel%

REM Show HTML report location
if exist "playwright-report\index.html" (
    echo.
    echo ✅ Test report generated: %cd%\playwright-report\index.html
)

echo.
if %EXIT_CODE% equ 0 (
    echo ✅ All tests passed!
) else (
    echo ⚠️  Some tests failed. Check the report above.
)

cd ..\..

REM Kill background server
taskkill /F /FI "WINDOWTITLE eq Backend Server" >nul 2>&1

exit /b %EXIT_CODE%
