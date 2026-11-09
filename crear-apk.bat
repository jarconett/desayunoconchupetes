@echo off
rem ============================================================
rem  Desayuno con Chupetes - Crear la APK de Android en <unidad>:\DesayunoConChupetes-APK
rem ============================================================
rem  Todo va en un unico bloque: cmd lo lee entero antes de ejecutarlo,
rem  asi el git pull puede actualizar este mismo .bat sin romperlo.
(
    title Desayuno con Chupetes - Crear APK
    cd /d "%~dp0"
    if exist ".git\" (
        where git >nul 2>&1 && (
            echo  Buscando actualizaciones en GitHub...
            git pull --ff-only -q
        )
    )
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\crear-apk.ps1"
    pause
    exit /b
)
