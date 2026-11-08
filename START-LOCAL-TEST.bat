@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python Launcher was not found. Install Python 3 or use your GitHub Pages website.
  pause
  exit /b 1
)
start "HPT Local Server" /D "%~dp0" cmd /k py -m http.server 8000
timeout /t 2 /nobreak >nul
start "" http://localhost:8000/
echo Local HPT preview opened. Keep the HPT Local Server window running.
