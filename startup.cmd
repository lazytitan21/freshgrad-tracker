@echo off
REM Azure App Service Startup Script
echo Starting FreshGrad Tracker Server...

REM Navigate to server directory
cd /d %HOME%\site\wwwroot\server

REM Install dependencies if needed
if not exist node_modules\nul (
    echo Installing dependencies...
    call npm install
)

REM Start the Node.js server
echo Starting Node.js server...
node src\index.js
