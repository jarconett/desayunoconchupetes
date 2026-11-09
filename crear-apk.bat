@echo off
rem ============================================================
rem  Desayuno con Chupetes - Crear la APK de Android en <unidad>:\DesayunoConChupetes-APK
rem ============================================================
rem  Todo va en un unico bloque: cmd lo lee entero antes de ejecutarlo,
rem  asi la actualizacion puede cambiar este mismo .bat sin romperlo.
(
    title Desayuno con Chupetes - Crear APK
    cd /d "%~dp0"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\actualizar.ps1"
    if errorlevel 1 (
        pause
        exit /b 1
    )
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\crear-apk.ps1"
    pause
    exit /b
)
