@echo off
setlocal
cd /d "%~dp0"
title Antiquitaeten-App Launcher

where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] PowerShell wurde nicht im PATH gefunden.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Der Launcher wurde mit einem Fehler beendet.
    pause
)
