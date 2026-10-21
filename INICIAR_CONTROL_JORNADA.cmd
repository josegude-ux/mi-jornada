@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor_local.ps1"
if errorlevel 1 (
 echo No se pudo iniciar el servidor local.
 pause
)
