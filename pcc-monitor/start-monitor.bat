@echo off
title PCC API Monitor
echo Starting PCC API Update Monitor (every 4 hours)...
echo Press Ctrl+C to stop.
echo.
node "%~dp0monitor.mjs" --interval 4
pause
