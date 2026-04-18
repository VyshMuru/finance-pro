@echo off
echo.
echo ==========================================
echo      Finance Pro - Local Setup
echo ==========================================
echo.

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org (v18+)
    pause
    exit /b 1
)
echo OK  Node.js detected

:: Install root deps
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install --silent
)

:: Install server deps
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install --silent
    cd ..
)

:: Install client deps
if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install --silent
    cd ..
)

:: Seed DB
if not exist "server\finance.db" (
    echo Seeding database with sample data...
    cd server
    call node db/seed.js
    cd ..
)

echo.
echo Starting Finance Pro...
echo   Frontend: http://localhost:5173
echo   API:      http://localhost:3001
echo.
echo Press Ctrl+C to stop
echo.

call npx concurrently --names "API,UI" --prefix-colors "cyan,green" --kill-others-on-fail "cd server && node server.js" "cd client && npm run dev"

pause
