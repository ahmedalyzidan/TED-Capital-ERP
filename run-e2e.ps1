#!/usr/bin/env pwsh
<#
.SYNOPSIS
TED ERP E2E Test Runner (PowerShell)

.DESCRIPTION
Starts backend server and runs Playwright E2E tests with proper cleanup

.EXAMPLE
.\run-e2e.ps1
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "🚀 TED ERP E2E Test Suite" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Check if Node is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

# Set environment
$env:NODE_ENV = "test"
$env:PORT = "4000"
$env:BASE_URL = "http://127.0.0.1:4000"

Write-Host ""
Write-Host "⚙️  Starting backend server on $($env:BASE_URL)..." -ForegroundColor Yellow

# Start backend in background
$backendProcess = Start-Process -FilePath "node" -ArgumentList "backend/server.js" -PassThru -NoNewWindow

Write-Host "⏳ Waiting for backend to be healthy (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verify backend is running
$backendHealthy = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:4000/api/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $backendHealthy = $true
            Write-Host "✅ Backend is healthy" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "⏳ Attempt $i/5 - Backend not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $backendHealthy) {
    Write-Host "❌ Backend failed to start or become healthy" -ForegroundColor Red
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "🧪 Running E2E tests..." -ForegroundColor Cyan
Write-Host ""

# Run tests
$testResult = 0
try {
    Push-Location "backend/playwright-e2e-tests"
    & npx playwright test --project=chromium --reporter=html
    $testResult = $LASTEXITCODE
    Pop-Location
} catch {
    Write-Host "❌ Test execution failed: $_" -ForegroundColor Red
    $testResult = 1
    Pop-Location
}

# Show report
$reportPath = "backend/playwright-e2e-tests/playwright-report/index.html"
if (Test-Path $reportPath) {
    Write-Host ""
    Write-Host "✅ Test report generated: $(Resolve-Path $reportPath)" -ForegroundColor Green
}

Write-Host ""
if ($testResult -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check the report above." -ForegroundColor Yellow
}

# Cleanup
Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
try {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Backend server stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not stop backend process: $_" -ForegroundColor Yellow
}

exit $testResult
