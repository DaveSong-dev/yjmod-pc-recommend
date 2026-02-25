@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Starting local server at http://localhost:8000
echo Press Ctrl+C to stop.
echo.
start http://localhost:8000
python -m http.server 8000
