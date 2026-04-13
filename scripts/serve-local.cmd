@echo off
chcp 65001 >nul
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo Starting local HTTP server at http://127.0.0.1:4173/index.html
echo Press Ctrl+C to stop.
echo.
start http://127.0.0.1:4173/index.html
call npm run dev
