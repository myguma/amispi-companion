@echo off
title AmitySpirit Companion - Release Builder
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-release.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Build failed. Press any key to close.
    pause >nul
)
