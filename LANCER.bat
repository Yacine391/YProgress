@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installe Node.js 22.12 ou plus recent, puis relance ce fichier.
  pause
  exit /b 1
)
echo Ouvre http://localhost:8787 dans ton navigateur. Ctrl+C pour arreter.
node --env-file-if-exists=.env.local server/index.js
pause
