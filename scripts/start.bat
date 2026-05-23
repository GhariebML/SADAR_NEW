@echo off
title SADAR System - Spectrum Anomaly Detection
color 0A
cls

echo ==========================================
echo    SADAR System Starting...
echo    Spectrum Anomaly Detection
echo ==========================================
echo.

echo [1/3] Starting Backend (FastAPI :8000)...
cd /d "C:\SADAR\backend"
start "SADAR Backend" cmd /k "python -m uvicorn src.api.main:app --reload --port 8000"
timeout /t 5 /nobreak >nul
echo        Started.

echo [2/3] Starting Frontend (React :5173)...
cd /d "C:\SADAR\frontend"
start "SADAR Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
echo        Started.

echo [3/3] Opening Browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ==========================================
echo   All services running!
echo.
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo   WebSocket: ws://localhost:8000/ws/alerts
echo ==========================================
echo.
echo Press any key to STOP all services...
pause >nul

echo.
echo Stopping all services...
taskkill /FI "WINDOWTITLE eq SADAR Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SADAR Frontend*" /F >nul 2>&1
echo Done. Goodbye!
timeout /t 2 /nobreak >nul