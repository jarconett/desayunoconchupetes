@echo off
rem ============================================================
rem  Desayuno con Chupetes - Alojar la app en este PC (deja la ventana abierta; Q para detener)
rem ============================================================
rem  Todo va en un unico bloque: cmd lo lee entero antes de ejecutarlo,
rem  asi el git pull puede actualizar este mismo .bat sin romperlo.
(
    title Desayuno con Chupetes - Servidor
    cd /d "%~dp0"
    if exist ".git\" (
        where git >nul 2>&1 && (
            echo  Buscando actualizaciones en GitHub...
            git pull --ff-only -q
        )
    )
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor\iniciar-servidor.ps1"
    pause
    exit /b
)
