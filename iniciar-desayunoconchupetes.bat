@echo off
rem ============================================================
rem  Desayuno con Chupetes - Alojar la app en este PC
rem  Doble clic para arrancar. Deja la ventana abierta mientras
rem  quieras que la app este disponible. Pulsa Q para detenerla.
rem ============================================================
title Desayuno con Chupetes - Servidor
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\iniciar-servidor.ps1"
pause
