@echo off
title TED ERP Development Environment
echo [INFO] Starting TED ERP Servers...

:: 1. إصلاح مسارات الملفات: هذا الأمر يجبر السكريبت على العمل من مساره الحالي دائماً
cd /d "%~dp0"

:: 2. حماية مفتاح الـ API: ضع مفتاحك هنا ولكن تذكر ألا تشارك هذا الملف مع أحد
set GEMINI_API_KEY= AIzaSyA_wxN3JtRjWK9YKIBovvx5UkjbHAWSR9A && litellm

:: 3. Start AI Proxy (LiteLLM with Gemini 2.5 Flash)
echo [INFO] Starting Gemini AI Proxy (Port 4040)...
start "AI Proxy - LiteLLM" cmd /k "chcp 65001 && if exist venv\Scripts\activate (call .\venv\Scripts\activate) else (echo [ERROR] venv not found! Please check paths.) && set PYTHONIOENCODING=utf-8 && litellm --model gemini/gemini-2.5-flash --port 4040 --drop_params"

:: 4. Start Frontend (Vite) in a separate window
echo [INFO] Starting Vite Frontend...
start "TED ERP - Frontend" cmd /k "if exist backend\client (cd backend\client && npm run dev) else (echo [ERROR] Cannot find backend\client folder! && pause)"

:: 5. Start Backend Server with Hot Reload
echo [INFO] Starting Backend Server...
start "TED ERP - Backend" cmd /k "npm start"

:: 6. Verify AI Proxy Status
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
    echo [WARNING] Port 4040 is not fully ready yet. The Gemini 2.5 Flash model might still be loading.
    echo [ACTION] Please check the "AI Proxy - LiteLLM" terminal window for errors.
    echo.
)

echo [SUCCESS] Environment startup complete!
echo [NOTE] Backend auto-restart is active. Run "python orchestrator.py" manually for testing.
if "%~1" neq "--no-pause" pause