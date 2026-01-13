@echo off
echo ========================================
echo   URC Attendance Sync - Build Portable
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please download and install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [1/3] Installing required packages...
pip install pyinstaller pyzk requests python-dotenv schedule

echo.
echo [2/3] Building portable executable...
pyinstaller --onefile --name "URC-Attendance-Sync" --icon=NONE sync_attendance.py

echo.
echo [3/3] Copying files to dist folder...
copy ".env.example" "dist\.env.example"
copy "README.md" "dist\README.md"

echo.
echo ========================================
echo   BUILD COMPLETE!
echo ========================================
echo.
echo Your portable software is in the "dist" folder:
echo   - URC-Attendance-Sync.exe
echo   - .env.example (rename to .env and edit)
echo.
echo Copy the entire "dist" folder to any Windows PC!
echo.
pause
