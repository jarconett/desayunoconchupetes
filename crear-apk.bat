@echo off
rem ============================================================
rem  Desayuno con Chupetes - Crear la APK de Android
rem  La APK se guarda en <unidad>:\DesayunoConChupetes-APK
rem ============================================================
title Desayuno con Chupetes - Crear APK
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\crear-apk.ps1"
pause
