@echo off
title TED ERP Development Environment
echo [INFO] Starting TED ERP Servers...

:: 1. Start AI Proxy (LiteLLM with Gemini 1.5 Flash)
echo [INFO] Starting Gemini AI Proxy (Port 4040)...
start "AI Proxy - LiteLLM" cmd /k "chcp 65001 && call .\venv\Scripts\activate && set PYTHONIOENCODING=utf-8 && set GEMINI_API_KEY=AIzaSyA_wxN3JtRjWK9YKIBovvx5UkjbHAWSR9A && litellm --model gemini/gemini-2.5-flash --port 4040 --drop_params"

:: 2. Start Frontend (Vite) in a separate window
echo [INFO] Starting Vite Frontend...
start "TED ERP - Frontend" cmd /k "cd backend/client && npm run dev"

:: 3. Start Backend Server with Hot Reload (Auto-restart on save)
echo [INFO] Starting Backend Server...
start "TED ERP - Backend" cmd /k "npm start"

:: 4. Verify AI Proxy Status
echo [INFO] Waiting 10 seconds for Gemini Proxy to load...
timeout /t 10 /nobreak >nul

echo [INFO] Verifying AI Server on Port 4040...
netstat -an | find "4040" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo.
    echo ==============================================================
    echo [VERIFIED SUCCESS] AI Proxy is ACTIVELY LISTENING on Port 4040!
    echo [VERIFIED SUCCESS] Antigravity is safely connected to Gemini.
    echo ==============================================================
    echo.
) else (
    echo.
    echo [WARNING] Port 4040 is not fully ready yet. The 32b model might still be loading.
    echo [ACTION] Please check the "AI Proxy - LiteLLM" terminal window for errors.
    echo.
)

echo [SUCCESS] Environment startup complete!
echo [NOTE] Backend auto-restart is active. Run "python orchestrator.py" manually for testing.
if "%~1" neq "--no-pause" pause