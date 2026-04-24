@echo off
REM Rome Project - Quick Start Script (Windows)

echo.
echo ============================================
echo 7  Rome Project - Server Startup
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed. 
    echo   Visit: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Y Node.js detected (%NODE_VERSION%)
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo X package.json not found.
    echo   Make sure to run this from Rome-Server or Rome root directory.
    pause
    exit /b 1
)

echo.
echo ^^! Make sure Ollama is running on http://localhost:11434
echo.
echo Starting Rome-Server...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server
call npm start

pause

