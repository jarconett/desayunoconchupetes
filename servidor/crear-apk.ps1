# ============================================================
#  Desayuno con Chupetes - Crear la APK de Android
#
#  Compila la app en los servidores de Expo (EAS Build, plan gratuito)
#  y descarga la APK en <unidad>:\DesayunoConChupetes-APK
#  (D:\DesayunoConChupetes-APK si el proyecto esta en D:)
#
#  Requisitos: cuenta gratuita en https://expo.dev (se pide al iniciar
#  sesion la primera vez) y el archivo .env con los datos de Supabase.
#  Se lanza desde crear-apk.bat
# ============================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$Raiz = Split-Path -Parent $PSScriptRoot
$CarpetaApk = Join-Path ((Split-Path -Qualifier $Raiz) + '\') 'DesayunoConChupetes-APK'
Set-Location $Raiz

function Titulo($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  [i]  $t" -ForegroundColor Gray }
function Fallo($t) { Write-Host "  [X]  $t" -ForegroundColor Red; exit 1 }
# Se llama a npx.cmd (no al npx.ps1 de Node 24, que pierde los argumentos
# cuando se le pasan desde una funcion de PowerShell)
function EAS { & npx.cmd --yes eas-cli@latest @args }

Write-Host ''
Write-Host '  ==================================================' -ForegroundColor Magenta
Write-Host '     DESAYUNO CON CHUPETES - Crear APK de Android' -ForegroundColor Magenta
Write-Host '  ==================================================' -ForegroundColor Magenta

# ---------- Comprobaciones ----------
Titulo 'Comprobaciones'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Info 'Instalando Node.js LTS...'
        winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fallo 'Falta Node.js: instalalo desde https://nodejs.org y vuelve a ejecutar.' }
}
$envPath = Join-Path $Raiz '.env'
$envTexto = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { '' }
if ($envTexto -match 'EXPO_PUBLIC_SUPABASE_URL=https://[^/\s]+/') {
    # La URL debe ser solo https://xxxx.supabase.co (sin /rest/v1/ ni barra final)
    $envTexto = $envTexto -replace 'EXPO_PUBLIC_SUPABASE_URL=(https://[^/\s]+)[^\r\n]*', 'EXPO_PUBLIC_SUPABASE_URL=$1'
    [IO.File]::WriteAllText($envPath, $envTexto)
    Write-Host '  [OK] Corregida la URL de Supabase en .env' -ForegroundColor Green
}
if (-not $envTexto -or $envTexto -match 'TU-PROYECTO' -or $envTexto -notmatch 'EXPO_PUBLIC_SUPABASE_URL=https://') {
    Write-Host '  Datos de Supabase: supabase.com > tu proyecto > Project Settings > API' -ForegroundColor White
    $sbUrl = (Read-Host '  Project URL (https://xxxx.supabase.co)').Trim()
    $sbKey = (Read-Host '  Clave anon / publishable').Trim()
    if ($sbUrl -match '^(https://[^/\s]+)') { $sbUrl = $matches[1] }   # quita /rest/v1/ y la barra final
    if ($sbUrl -notmatch '^https://' -or -not $sbKey) { Fallo 'Datos de Supabase no validos.' }
    [IO.File]::WriteAllText($envPath, "EXPO_PUBLIC_SUPABASE_URL=$sbUrl`r`nEXPO_PUBLIC_SUPABASE_ANON_KEY=$sbKey`r`n")
}
Ok 'Datos de Supabase en .env (se incluyen en la APK)'
$marcaDeps = Join-Path $Raiz 'node_modules\.package-lock.json'
$lock = Join-Path $Raiz 'package-lock.json'
if (-not (Test-Path $marcaDeps) -or ((Get-Item $lock).LastWriteTime -gt (Get-Item $marcaDeps).LastWriteTime)) {
    Info 'Instalando dependencias...'
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Fallo 'No se pudieron instalar las dependencias.' }
}
Ok 'Dependencias listas'

# ---------- Cuenta de Expo ----------
Titulo 'Cuenta de Expo'
function Usuario-Expo {
    # Se lee toda la salida (cortarla con Select-Object -First 1 detiene el
    # proceso y da un codigo de error aunque la sesion este iniciada)
    $salida = @(EAS whoami 2>$null)
    $codigo = $LASTEXITCODE
    $texto = $salida -join "`n"
    if ($codigo -ne 0 -or $texto -match 'command line tool|Not logged in|not logged') { return $null }
    $u = $salida | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^[A-Za-z0-9._-]+$' } | Select-Object -First 1
    if ($u) { return $u } else { return 'cuenta de Expo' }
}
$usuario = Usuario-Expo
if (-not $usuario) {
    Write-Host '  Inicia sesion con tu cuenta de Expo (gratis en https://expo.dev/signup).' -ForegroundColor White
    EAS login
    $usuario = Usuario-Expo
    if (-not $usuario) { Fallo 'No se pudo iniciar sesion en Expo.' }
}
Ok "Sesion iniciada en Expo como: $usuario"

# ---------- Proyecto en Expo (solo la primera vez) ----------
function ProjectId { ((Get-Content (Join-Path $Raiz 'app.json') -Raw | ConvertFrom-Json).expo.extra.eas.projectId) }
if (-not (ProjectId)) {
    Titulo 'Registrando el proyecto en Expo (solo la primera vez)'
    Info 'Responde Y (si) a las preguntas.'
    EAS init
    if (-not (ProjectId)) { Fallo 'No se pudo registrar el proyecto en Expo (app.json sigue sin projectId).' }
}
Ok "Proyecto registrado en Expo ($(ProjectId))"

# ---------- Compilar ----------
$version = (git -C $Raiz log -1 --format='%h del %cd' --date=format:'%d/%m/%Y %H:%M' 2>$null)
if ($version) { Info "Se compila la version $version" }
Titulo 'Compilando la APK en Expo (10-30 minutos, depende de la cola)'
Info 'La primera vez pregunta si generar un "Android Keystore": responde Y.'
Info 'Puedes seguir el progreso en el enlace que aparece (expo.dev).'
# La version (commit) se guarda en build-info.json para que la app la muestre:
# en los servidores de Expo no hay historial de git. Se borra al terminar.
$buildInfo = Join-Path $Raiz 'build-info.json'
$commit = (git -C $Raiz rev-parse --short HEAD 2>$null)
$commitDate = (git -C $Raiz log -1 --format=%cI 2>$null)
if ($commit) { [IO.File]::WriteAllText($buildInfo, (@{ commit = "$commit".Trim(); commitDate = "$commitDate".Trim() } | ConvertTo-Json -Compress)) }
EAS build --platform android --profile preview --wait
$codigoBuild = $LASTEXITCODE
Remove-Item $buildInfo -ErrorAction SilentlyContinue
if ($codigoBuild -ne 0) { Fallo 'La compilacion ha fallado. Revisa el enlace de expo.dev que aparece arriba.' }

# ---------- Descargar ----------
Titulo 'Descargando la APK'
$json = (EAS build:list --platform android --status finished --limit 1 --json --non-interactive 2>$null) -join "`n"
$url = $null
try { $url = (($json | ConvertFrom-Json) | Select-Object -First 1).artifacts.buildUrl } catch { }
if (-not $url) { Fallo 'No se encontro la APK. Descargala desde https://expo.dev (Builds).' }
New-Item -ItemType Directory -Force -Path $CarpetaApk | Out-Null
$destino = Join-Path $CarpetaApk ("DesayunoConChupetes-" + (Get-Date -Format 'yyyy-MM-dd_HHmm') + '.apk')
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $destino -ErrorAction Stop
} catch {
    Fallo "No se pudo descargar. Enlace directo: $url"
}
Copy-Item $destino (Join-Path $CarpetaApk 'DesayunoConChupetes-ultima.apk') -Force
[IO.File]::WriteAllText((Join-Path $CarpetaApk 'COMO-INSTALAR.txt'), @"
Instalar Desayuno con Chupetes en Android
========================================
1. Copia DesayunoConChupetes-ultima.apk al movil (cable USB, Google Drive,
   WhatsApp a ti mismo...) o abre en el movil este enlace de descarga:
   $url
2. Abre el archivo en el movil. Si Android lo pide, permite
   "Instalar aplicaciones desconocidas" para esa app (Archivos, Chrome...).
3. Pulsa Instalar y abre "Desayuno con Chupetes".

Para una nueva version: ejecuta otra vez crear-apk.bat e instala la nueva
APK encima (no se pierden los datos, estan en Supabase).
"@)
Ok "APK guardada en $destino"
Write-Host ''
Write-Host '  Enlace para descargarla directamente en el movil:' -ForegroundColor Yellow
Write-Host "  $url" -ForegroundColor Yellow
try { Set-Clipboard -Value $url } catch { }
Start-Process explorer.exe $CarpetaApk
