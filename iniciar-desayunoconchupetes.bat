@echo off
rem ============================================================
rem  Desayuno con Chupetes - Alojar la app en este PC (deja la ventana abierta; Q para detener)
rem ============================================================
rem  Todo va en un unico bloque: cmd lo lee entero antes de ejecutarlo,
rem  asi la actualizacion puede cambiar este mismo .bat sin romperlo.
(
    title Desayuno con Chupetes - Servidor
    cd /d "%~dp0"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\actualizar.ps1"
    if errorlevel 1 (
        pause
        exit /b 1
    )
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\iniciar-servidor.ps1"
    pause
    exit /b
)
