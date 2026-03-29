@echo off
echo.
echo ============================================
echo   Delhi Air Quality Intelligence Platform
echo ============================================
echo.

cd backend

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Initializing database...
node db/init.js

echo.
echo [3/3] Starting server...
set PORT=3005
start /b node server.js

echo.
echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo Opening browser...
start http://localhost:3005

echo.
echo ============================================
echo   Server running at http://localhost:3005
echo   Press any key to shutdown
echo ============================================
pause
exit
