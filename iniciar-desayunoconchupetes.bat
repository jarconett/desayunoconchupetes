@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Desayuno con Chupetes - App de sueno infantil

rem ============================================================
rem  Desayuno con Chupetes - Arranque en un PC con Windows
rem  - Descarga (o actualiza) el proyecto desde GitHub
rem  - Instala las dependencias
rem  - Pide los datos de Supabase la primera vez (.env)
rem  - Arranca la app en el navegador o para el movil (Expo Go)
rem
rem  Puedes guardar este .bat en cualquier carpeta: el proyecto se
rem  descarga en una subcarpeta "desayunoconchupetes" a su lado.
rem ============================================================

set "REPO_URL=https://github.com/jarconett/desayunoconchupetes.git"
set "REPO_ZIP=https://github.com/jarconett/desayunoconchupetes/archive/refs/heads/main.zip"
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

rem Si el .bat ya esta dentro del proyecto, se usa esa carpeta
if exist "%SCRIPT_DIR%\package.json" if exist "%SCRIPT_DIR%\src\app" (
    set "APP_DIR=%SCRIPT_DIR%"
) else (
    set "APP_DIR=%SCRIPT_DIR%\desayunoconchupetes"
)
if not defined APP_DIR set "APP_DIR=%SCRIPT_DIR%\desayunoconchupetes"

echo.
echo  ==================================================
echo     Desayuno con Chupetes  ·  App de sueno infantil
echo  ==================================================
echo.

rem ---------- 1. Node.js ----------
where node >nul 2>&1
if errorlevel 1 (
    echo  [!] No se encuentra Node.js.
    call :instalar_winget OpenJS.NodeJS.LTS "Node.js LTS"
    where node >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  Instala Node.js LTS desde https://nodejs.org , cierra esta ventana
        echo  y vuelve a ejecutar el .bat.
        start "" https://nodejs.org/es/download
        goto :fin_error
    )
)
for /f "tokens=1 delims=." %%v in ('node -v') do set "NODE_MAJOR=%%v"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if %NODE_MAJOR% LSS 20 (
    echo  [!] Tu version de Node.js es antigua ^(v%NODE_MAJOR%^). Se necesita la 20 o superior.
    call :instalar_winget OpenJS.NodeJS.LTS "Node.js LTS"
    echo  Cierra esta ventana y vuelve a ejecutar el .bat.
    goto :fin_error
)
for /f "delims=" %%v in ('node -v') do echo  [OK] Node.js %%v

rem ---------- 2. Descargar / actualizar el proyecto ----------
where git >nul 2>&1
if errorlevel 1 (set "HAY_GIT=0") else (set "HAY_GIT=1")

if exist "%APP_DIR%\package.json" (
    if exist "%APP_DIR%\.git" if "%HAY_GIT%"=="1" (
        echo  [..] Buscando actualizaciones en GitHub...
        pushd "%APP_DIR%"
        git pull --ff-only >nul 2>&1
        if errorlevel 1 (
            echo  [i] No se pudo actualizar ^(sin internet o cambios locales^). Se usa la version guardada.
        ) else (
            echo  [OK] Proyecto al dia.
        )
        popd
    )
) else (
    echo  [..] Descargando el proyecto desde GitHub...
    if "%HAY_GIT%"=="1" (
        git clone "%REPO_URL%" "%APP_DIR%"
        if errorlevel 1 goto :error_descarga
    ) else (
        echo  [i] Git no esta instalado: se descarga como ZIP.
        set "ZIP_TMP=%TEMP%\desayunoconchupetes.zip"
        set "EXT_TMP=%TEMP%\desayunoconchupetes_zip"
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol='Tls12';" ^
          "Invoke-WebRequest -Uri '%REPO_ZIP%' -OutFile '!ZIP_TMP!';" ^
          "if (Test-Path '!EXT_TMP!') { Remove-Item -Recurse -Force '!EXT_TMP!' };" ^
          "Expand-Archive -Path '!ZIP_TMP!' -DestinationPath '!EXT_TMP!';" ^
          "Move-Item -Path (Get-ChildItem '!EXT_TMP!' | Select-Object -First 1).FullName -Destination '%APP_DIR%';" ^
          "Remove-Item -Force '!ZIP_TMP!'; Remove-Item -Recurse -Force '!EXT_TMP!'"
        if errorlevel 1 goto :error_descarga
    )
    echo  [OK] Proyecto descargado en "%APP_DIR%"
)

cd /d "%APP_DIR%"

rem ---------- 3. Dependencias ----------
if not exist "node_modules\expo\package.json" (
    echo  [..] Instalando dependencias ^(la primera vez tarda unos minutos^)...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo  [X] Fallo al instalar las dependencias. Revisa la conexion a internet.
        goto :fin_error
    )
    echo  [OK] Dependencias instaladas.
) else (
    rem Si package.json cambio tras una actualizacion, npm lo detecta rapido
    call npm install --no-audit --no-fund --prefer-offline >nul 2>&1
    echo  [OK] Dependencias listas.
)

rem ---------- 4. Configuracion de Supabase (.env) ----------
if not exist ".env" goto :configurar_env
findstr /c:"TU-PROYECTO" ".env" >nul 2>&1 && goto :configurar_env
goto :menu

:configurar_env
echo.
echo  --------------------------------------------------
echo   Configuracion inicial de Supabase
echo   Los datos estan en supabase.com ^> tu proyecto ^>
echo   Project Settings ^> API
echo  --------------------------------------------------
set "SB_URL="
set "SB_KEY="
set /p "SB_URL=  Project URL (https://xxxx.supabase.co): "
set /p "SB_KEY=  anon public key: "
if "%SB_URL%"=="" (
    echo  [!] No se ha introducido la URL. Puedes configurarlo luego con la opcion 4 del menu.
    goto :menu
)
> ".env" (
    echo EXPO_PUBLIC_SUPABASE_URL=%SB_URL%
    echo EXPO_PUBLIC_SUPABASE_ANON_KEY=%SB_KEY%
)
echo  [OK] Configuracion guardada en .env

rem ---------- 5. Menu ----------
:menu
echo.
echo  ==================================================
echo   Que quieres hacer?
echo  ==================================================
echo    1. Abrir la app en el navegador de este PC
echo    2. Probar en el movil con Expo Go (codigo QR, misma WiFi)
echo    3. Generar la version web para publicar (carpeta dist)
echo    4. Cambiar los datos de Supabase
echo    5. Salir
echo.
set "OPCION="
set /p "OPCION=  Elige una opcion [1]: "
if "%OPCION%"=="" set "OPCION=1"

if "%OPCION%"=="1" goto :web
if "%OPCION%"=="2" goto :movil
if "%OPCION%"=="3" goto :build
if "%OPCION%"=="4" goto :configurar_env
if "%OPCION%"=="5" goto :fin
echo  Opcion no valida.
goto :menu

:web
echo.
echo  [..] Arrancando la app. Se abrira el navegador en http://localhost:8081
echo       Para cerrarla, pulsa Ctrl+C en esta ventana.
echo.
call npx expo start --web --port 8081
goto :menu

:movil
echo.
echo  1. Instala "Expo Go" en el movil (Play Store / App Store).
echo  2. Conecta el movil a la misma WiFi que este PC.
echo  3. Escanea el codigo QR que aparecera a continuacion.
echo     (Si Windows pregunta por el Firewall, permite el acceso en redes privadas.)
echo.
call npx expo start --lan
goto :menu

:build
echo.
echo  [..] Generando la version web en la carpeta "dist"...
call npx expo export --platform web
if errorlevel 1 (
    echo  [X] Error al generar la web.
) else (
    echo  [OK] Listo. Sube el contenido de "%APP_DIR%\dist" a tu hosting.
    start "" "%APP_DIR%\dist"
)
goto :menu

rem ---------- Utilidades ----------
:instalar_winget
where winget >nul 2>&1
if errorlevel 1 exit /b 1
set "RESP="
set /p "RESP=  Quieres instalar %~2 automaticamente ahora? (S/N): "
if /i not "%RESP%"=="S" exit /b 1
winget install -e --id %1 --accept-package-agreements --accept-source-agreements
rem Recargar el PATH de la maquina y del usuario para encontrar node en esta ventana
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p"
exit /b 0

:error_descarga
echo.
echo  [X] No se pudo descargar el proyecto. Comprueba la conexion a internet
echo      ^(la primera vez es necesaria^) y vuelve a intentarlo.
goto :fin_error

:fin_error
echo.
pause
exit /b 1

:fin
endlocal
exit /b 0
