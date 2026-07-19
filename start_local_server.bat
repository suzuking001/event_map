@echo off
setlocal

cd /d "%~dp0"
set "PORT=8000"
set "APP_URL=http://127.0.0.1:%PORT%/"
set "CODEX_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

py -3 --version >nul 2>&1
if not errorlevel 1 goto use_py

python --version >nul 2>&1
if not errorlevel 1 goto use_python

if exist "%CODEX_PYTHON%" goto use_codex_python

echo.
echo Python was not found.
echo Install Python 3, then run this file again.
echo https://www.python.org/downloads/
echo.
pause
exit /b 1

:use_py
echo Starting Event Map at %APP_URL%
echo Press Ctrl+C or close this window to stop the server.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1200; Start-Process '%APP_URL%'"
py -3 -m http.server %PORT% --bind 127.0.0.1
goto server_stopped

:use_python
echo Starting Event Map at %APP_URL%
echo Press Ctrl+C or close this window to stop the server.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1200; Start-Process '%APP_URL%'"
python -m http.server %PORT% --bind 127.0.0.1
goto server_stopped

:use_codex_python
echo Starting Event Map at %APP_URL%
echo Press Ctrl+C or close this window to stop the server.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1200; Start-Process '%APP_URL%'"
"%CODEX_PYTHON%" -m http.server %PORT% --bind 127.0.0.1

:server_stopped
echo.
echo The local server has stopped.
pause
