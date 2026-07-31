@echo off
setlocal

cd /d "%~dp0"
set "PUBLIC_URL=https://suzuking001.github.io/event_map/"
set "SERVER_SCRIPT=%~dp0scripts\start_event_map.py"
set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
set "PY_LAUNCHER=%LOCALAPPDATA%\Programs\Python\Launcher\py.exe"

if exist "%PYTHON_EXE%" goto use_installed_python
if exist "%PY_LAUNCHER%" goto use_installed_launcher

py -3 --version >nul 2>&1
if not errorlevel 1 goto use_py

python --version >nul 2>&1
if not errorlevel 1 goto use_python

echo.
echo Python was not found. Opening the published Event Map instead.
echo No installation is required.
echo.
start "" "%PUBLIC_URL%"
exit /b 0

:use_installed_python
title Event Map Local Server
"%PYTHON_EXE%" "%SERVER_SCRIPT%"
if errorlevel 1 pause
exit /b %errorlevel%

:use_installed_launcher
title Event Map Local Server
"%PY_LAUNCHER%" -3 "%SERVER_SCRIPT%"
if errorlevel 1 pause
exit /b %errorlevel%

:use_py
title Event Map Local Server
py -3 "%SERVER_SCRIPT%"
if errorlevel 1 pause
exit /b %errorlevel%

:use_python
title Event Map Local Server
python "%SERVER_SCRIPT%"
if errorlevel 1 pause
exit /b %errorlevel%
