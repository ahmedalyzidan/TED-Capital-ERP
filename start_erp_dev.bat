@echo off
title TED ERP Antigravity Orchestrator
echo [INFO] Starting TED ERP Development Environment...

:: Start Vite in a separate window
start cmd /k "cd backend/client && npm run dev"

:: Start Orchestrator in this window
python orchestrator.py

pause
