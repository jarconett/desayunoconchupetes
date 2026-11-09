# ============================================================
#  Desayuno con Chupetes - Alojar la app en este PC (gratis)
#
#  1. Comprueba Node.js
#  2. Actualiza el proyecto desde GitHub (si se descargo con git)
#  3. Instala dependencias
#  4. Pide los datos de Supabase la primera vez (.env)
#  5. Genera la web (solo si hay cambios)
#  6. Arranca el servidor web en el puerto 8080
#  7. Publica la web en internet con un tunel gratuito de Cloudflare
#
#  Se lanza desde iniciar-desayunoconchupetes.bat
# ============================================================

# 'Continue': en PowerShell 5 los avisos de git/npm por stderr no deben parar el script
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'   # descargas mucho mas rapidas en PowerShell 5
$Puerto = 8080
$Raiz = Split-Path -Parent $PSScriptRoot
$Herramientas = Join-Path $Raiz 'herramientas'
$Logs = Join-Path $Raiz 'logs'
$Cloudflared = Join-Path $Herramientas 'cloudflared.exe'
$ArchivoEnlace = Join-Path $Raiz 'ENLACE-PUBLICO.txt'
Set-Location $Raiz

function Titulo($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  [i]  $t" -ForegroundColor Gray }
function Aviso($t) { Write-Host "  [!]  $t" -ForegroundColor Yellow }
function Fallo($t) { Write-Host "  [X]  $t" -ForegroundColor Red; exit 1 }

function Recargar-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Hash-Texto($texto) {
    $sha = [Security.Cryptography.SHA256]::Create()
    $bytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($texto))
    return ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
}

function Leer-Log($ruta) {
    # Lee un log aunque otro proceso lo tenga abierto
    try {
        $fs = [IO.File]::Open($ruta, 'Open', 'Read', 'ReadWrite')
        try { return (New-Object IO.StreamReader($fs)).ReadToEnd() } finally { $fs.Close() }
    } catch { return '' }
}

function Puerto-Ocupado($p) {
    # True si algo escucha en 127.0.0.1:$p (sin pasar por el proxy de Windows)
    $c = New-Object Net.Sockets.TcpClient
    try {
        $ar = $c.BeginConnect('127.0.0.1', $p, $null, $null)
        if ($ar.AsyncWaitHandle.WaitOne(800) -and $c.Connected) { return $true }
        return $false
    } catch { return $false } finally { $c.Close() }
}

function Detener-Restos {
    # Cierra servidores o tuneles que se quedaran abiertos de una ejecucion anterior
    try {
        Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cloudflared.exe'" |
            Where-Object { $_.CommandLine -and ($_.CommandLine -like '*servidor-web.js*' -or $_.ExecutablePath -eq $Cloudflared) } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch { }
}

Write-Host ''
Write-Host '  ==================================================' -ForegroundColor Magenta
Write-Host '     DESAYUNO CON CHUPETES - Servidor de la app' -ForegroundColor Magenta
Write-Host '  ==================================================' -ForegroundColor Magenta

# ---------- 1. Node.js ----------
Titulo 'Comprobando Node.js'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Aviso 'Node.js no esta instalado.'
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $r = Read-Host '  Instalar Node.js LTS ahora? (S/N)'
        if ($r -match '^[sS]') {
            winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            Recargar-Path
        }
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Start-Process 'https://nodejs.org/es/download'
        Fallo 'Instala Node.js LTS desde https://nodejs.org, cierra esta ventana y vuelve a ejecutar el .bat'
    }
}
$versionNode = (node -v).Trim()
if ([int]($versionNode.TrimStart('v').Split('.')[0]) -lt 20) {
    Fallo "Tu Node.js es $versionNode y se necesita la version 20 o superior (https://nodejs.org)"
}
Ok "Node.js $versionNode"

# ---------- 2. Actualizar desde GitHub ----------
Titulo 'Buscando actualizaciones'
$hayGit = [bool](Get-Command git -ErrorAction SilentlyContinue)
if ($hayGit -and (Test-Path (Join-Path $Raiz '.git'))) {
    git -C $Raiz pull --ff-only 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok 'Proyecto al dia' }
    else { Aviso 'No se pudo actualizar (sin internet o con cambios locales). Se usa la version actual.' }
} else {
    Info 'El proyecto no se descargo con git: para actualizar, vuelve a descargarlo de GitHub.'
}

# ---------- 3. Dependencias ----------
Titulo 'Dependencias'
$marcaDeps = Join-Path $Raiz 'node_modules\.package-lock.json'
$lock = Join-Path $Raiz 'package-lock.json'
if (-not (Test-Path $marcaDeps) -or ((Get-Item $lock).LastWriteTime -gt (Get-Item $marcaDeps).LastWriteTime)) {
    Info 'Instalando dependencias (la primera vez tarda unos minutos)...'
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Fallo 'No se pudieron instalar las dependencias. Revisa la conexion a internet.' }
}
Ok 'Dependencias listas'

# ---------- 4. Supabase (.env) ----------
Titulo 'Configuracion de Supabase'
$envPath = Join-Path $Raiz '.env'
$envTexto = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { '' }
if (-not $envTexto -or $envTexto -match 'TU-PROYECTO' -or $envTexto -notmatch 'EXPO_PUBLIC_SUPABASE_URL=https://') {
    Write-Host '  Los datos estan en supabase.com > tu proyecto > Project Settings > API' -ForegroundColor White
    $sbUrl = (Read-Host '  Project URL (https://xxxx.supabase.co)').Trim()
    $sbKey = (Read-Host '  Clave anon / publishable').Trim()
    if ($sbUrl -notmatch '^https://') { Fallo 'La URL debe empezar por https://' }
    if (-not $sbKey) { Fallo 'Falta la clave anon.' }
    $envTexto = "EXPO_PUBLIC_SUPABASE_URL=$sbUrl`r`nEXPO_PUBLIC_SUPABASE_ANON_KEY=$sbKey`r`n"
    [IO.File]::WriteAllText($envPath, $envTexto)   # UTF-8 sin BOM
    Ok 'Datos guardados en .env (para cambiarlos, borra ese archivo)'
} else {
    Ok 'Usando los datos de .env'
}

# ---------- 5. Generar la web ----------
Titulo 'Version web'
if ($hayGit -and (Test-Path (Join-Path $Raiz '.git'))) {
    $version = (git -C $Raiz rev-parse HEAD).Trim()
    $version += (git -C $Raiz status --porcelain -- src assets app.json package.json) -join ';'
} else {
    $version = (Get-ChildItem (Join-Path $Raiz 'src'), (Join-Path $Raiz 'assets') -Recurse -File |
        ForEach-Object { $_.LastWriteTimeUtc.Ticks } | Measure-Object -Maximum).Maximum.ToString()
}
$huella = Hash-Texto ($version + '|' + $envTexto)
$dist = Join-Path $Raiz 'dist'
$marcaBuild = Join-Path $dist '.huella-build'
$huellaAnterior = if (Test-Path $marcaBuild) { (Get-Content $marcaBuild -Raw).Trim() } else { '' }
if (-not (Test-Path (Join-Path $dist 'index.html')) -or $huella -ne $huellaAnterior) {
    Info 'Generando la web (1-3 minutos)...'
    npx expo export --platform web
    if ($LASTEXITCODE -ne 0) { Fallo 'Error al generar la web.' }
    [IO.File]::WriteAllText($marcaBuild, $huella)
    Ok 'Web generada'
} else {
    Ok 'Sin cambios: se usa la web ya generada'
}

# ---------- 6. Cloudflared (tunel gratuito) ----------
Titulo 'Tunel de Cloudflare'
New-Item -ItemType Directory -Force -Path $Herramientas, $Logs | Out-Null
if (-not (Test-Path $Cloudflared)) {
    Info 'Descargando cloudflared (solo la primera vez)...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    try {
        Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $Cloudflared -ErrorAction Stop
    } catch {
        Remove-Item $Cloudflared -ErrorAction SilentlyContinue
        Aviso 'No se pudo descargar cloudflared: la app solo estara disponible en tu red local.'
    }
}
if (Test-Path $Cloudflared) { Ok 'cloudflared listo' }

# ---------- 7. Arrancar ----------
Detener-Restos
$procServidor = $null
$procTunel = $null

function Iniciar-Tunel {
    $logTunel = Join-Path $Logs 'tunel.log'
    Remove-Item $logTunel -ErrorAction SilentlyContinue
    $p = Start-Process -FilePath $Cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Puerto") `
        -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $Logs 'tunel-salida.log') -RedirectStandardError $logTunel
    $url = $null
    for ($i = 0; $i -lt 60 -and -not $url; $i++) {
        Start-Sleep -Seconds 1
        if ($p.HasExited) { break }
        if (Test-Path $logTunel) {
            $m = [regex]::Match((Leer-Log $logTunel), 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
            if ($m.Success) { $url = $m.Value }
        }
    }
    return @{ Proceso = $p; Url = $url }
}

try {
    Titulo 'Arrancando el servidor web'
    # Si el puerto 8080 esta ocupado por otro programa, se usa el siguiente libre
    while (Puerto-Ocupado $Puerto) {
        Aviso "El puerto $Puerto esta ocupado por otro programa: se prueba el $($Puerto + 1)"
        $Puerto++
        if ($Puerto -gt 8100) { Fallo 'No hay puertos libres entre 8080 y 8100.' }
    }
    $logSrv = Join-Path $Logs 'servidor.log'
    $logSrvErr = Join-Path $Logs 'servidor-error.log'
    $nodeExe = (Get-Command node).Source
    $procServidor = Start-Process -FilePath $nodeExe -ArgumentList @("`"$(Join-Path $Raiz 'servidor\servidor-web.js')`"", "$Puerto") `
        -WorkingDirectory $Raiz -NoNewWindow -PassThru -RedirectStandardOutput $logSrv -RedirectStandardError $logSrvErr
    $listo = $false
    for ($i = 0; $i -lt 60 -and -not $listo; $i++) {
        Start-Sleep -Milliseconds 500
        if ($procServidor.HasExited) { break }
        $listo = Puerto-Ocupado $Puerto
    }
    if (-not $listo) {
        Write-Host ''
        if ($procServidor.HasExited) { Aviso "El servidor se cerro (codigo $($procServidor.ExitCode))." }
        else { Aviso 'El servidor no responde despues de 30 segundos.' }
        Write-Host '  ---- logs\servidor.log ----' -ForegroundColor DarkGray
        Write-Host (Leer-Log $logSrv)
        Write-Host '  ---- logs\servidor-error.log ----' -ForegroundColor DarkGray
        Write-Host (Leer-Log $logSrvErr)
        Fallo 'El servidor no ha arrancado. Copia el texto de arriba y envialo para revisarlo.'
    }
    Ok "Servidor en http://localhost:$Puerto"
    $ipsLocales = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -ExpandProperty IPAddress

    $urlPublica = $null
    if (Test-Path $Cloudflared) {
        Info 'Abriendo el tunel a internet...'
        $t = Iniciar-Tunel
        $procTunel = $t.Proceso
        $urlPublica = $t.Url
        if (-not $urlPublica) { Aviso 'No se obtuvo el enlace publico (revisa logs\tunel.log). La app sigue disponible en local.' }
    }

    function Mostrar-Enlaces {
        Write-Host ''
        Write-Host '  ==================================================' -ForegroundColor Green
        Write-Host '   LA APP ESTA FUNCIONANDO' -ForegroundColor Green
        Write-Host '  ==================================================' -ForegroundColor Green
        Write-Host "   En este PC:      http://localhost:$Puerto"
        foreach ($ip in $ipsLocales) { Write-Host "   En tu WiFi:      http://${ip}:$Puerto" }
        if ($script:urlPublica) {
            Write-Host "   Para las familias (internet):" -ForegroundColor Yellow
            Write-Host "      $($script:urlPublica)" -ForegroundColor Yellow
            Write-Host '   (copiado al portapapeles y guardado en ENLACE-PUBLICO.txt)' -ForegroundColor DarkGray
            Write-Host '   OJO: este enlace cambia cada vez que se reinicia el servidor.' -ForegroundColor DarkGray
            Write-Host '   En Supabase > Authentication > URL Configuration debe estar' -ForegroundColor DarkGray
            Write-Host '   https://*.trycloudflare.com/** (para recuperar contrasenas).' -ForegroundColor DarkGray
        }
        Write-Host ''
        Write-Host '   Deja esta ventana abierta. Pulsa Q para detener la app.' -ForegroundColor White
        Write-Host ''
    }

    if ($urlPublica) {
        try { Set-Clipboard -Value $urlPublica } catch { }
        [IO.File]::WriteAllText($ArchivoEnlace, "Enlace publico de la app (generado $(Get-Date -Format 'dd/MM/yyyy HH:mm')):`r`n$urlPublica`r`n")
        Info 'Esperando a que el enlace publico este activo...'
        Start-Sleep -Seconds 6
        Start-Process $urlPublica
    } else {
        Start-Process "http://localhost:$Puerto"
    }
    Mostrar-Enlaces

    # Vigilar: si el tunel se cae, se vuelve a abrir; Q para salir
    while ($true) {
        Start-Sleep -Milliseconds 500
        $salir = $false
        try { if ([Console]::KeyAvailable -and [Console]::ReadKey($true).Key -eq 'Q') { $salir = $true } } catch { }
        if ($salir) { break }
        if ($procServidor.HasExited) {
            Aviso 'El servidor web se ha detenido. Revisa logs\servidor-error.log'
            break
        }
        if ($procTunel -and $procTunel.HasExited) {
            Aviso 'El tunel se ha cerrado (posible corte de internet). Reintentando en 10 s...'
            Start-Sleep -Seconds 10
            $t = Iniciar-Tunel
            $procTunel = $t.Proceso
            if ($t.Url) {
                $script:urlPublica = $t.Url
                try { Set-Clipboard -Value $t.Url } catch { }
                [IO.File]::WriteAllText($ArchivoEnlace, "Enlace publico de la app (generado $(Get-Date -Format 'dd/MM/yyyy HH:mm')):`r`n$($t.Url)`r`n")
                Aviso 'NUEVO enlace publico:'
                Mostrar-Enlaces
            }
        }
    }
}
finally {
    Write-Host ''
    Info 'Deteniendo la app...'
    foreach ($p in @($procTunel, $procServidor)) {
        if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    }
    Detener-Restos
    Ok 'App detenida'
}
