@echo off
echo ========================================
echo   URC Attendance Sync - First Time Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo.
    echo Please download Python from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

echo [1/2] Python found! Installing required packages...
echo.

pip install pyzk requests python-dotenv schedule

echo.
echo [2/2] Installation complete!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Copy .env.example to .env
echo 2. Edit .env file with your device IP
echo 3. Run RUN-SYNC.bat to start syncing
echo.
pause
