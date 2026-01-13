@echo off
echo ========================================
echo   URC Attendance Sync Service
echo ========================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo.
    echo Please follow these steps:
    echo 1. Copy .env.example to .env
    echo 2. Edit .env file with your settings
    echo.
    pause
    exit /b 1
)

echo Starting sync service...
echo Press Ctrl+C to stop
echo.

python sync_attendance.py --daemon

pause
