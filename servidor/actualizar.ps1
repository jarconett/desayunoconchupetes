# ============================================================
#  Desayuno con Chupetes - Actualizar el proyecto desde GitHub
#  Lo lanzan los .bat ANTES de arrancar, para usar siempre la ultima version.
#  - Descarta los cambios automaticos de package-lock.json (los genera npm)
#  - Conserva los ajustes locales (app.json con el proyecto de Expo, .env...)
# ============================================================
$ErrorActionPreference = 'Continue'
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

Write-Host ''
Write-Host '== Buscando actualizaciones en GitHub' -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue) -or -not (Test-Path (Join-Path $Raiz '.git'))) {
    Write-Host '  [i]  El proyecto no se descargo con git: no se puede actualizar automaticamente.' -ForegroundColor Gray
    exit 0
}

# package-lock.json lo reescribe npm al instalar: no es un cambio tuyo
git checkout -- package-lock.json 2>$null

$antes = (git rev-parse HEAD).Trim()
$salida = git pull --ff-only --autostash origin main 2>&1
$codigo = $LASTEXITCODE
$despues = (git rev-parse HEAD).Trim()
$version = (git log -1 --format='%h del %cd' --date=format:'%d/%m/%Y %H:%M').Trim()

if ($codigo -ne 0) {
    Write-Host '  [!]  NO SE HA PODIDO ACTUALIZAR. Se usara la version que ya tienes:' -ForegroundColor Yellow
    Write-Host "       $version" -ForegroundColor Yellow
    Write-Host '  ---- detalle de git ----' -ForegroundColor DarkGray
    $salida | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkGray }
    Write-Host '  Archivos modificados en este PC:' -ForegroundColor DarkGray
    git status --short | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkGray }
    Write-Host '  Copia este texto y envialo para revisarlo.' -ForegroundColor Yellow
    Write-Host ''
    $r = Read-Host '  Continuar de todos modos con la version actual? (S/N)'
    if ($r -notmatch '^[sS]') { exit 1 }
    exit 0
}
if ($antes -ne $despues) {
    Write-Host "  [OK] Actualizado a la version $version" -ForegroundColor Green
} else {
    Write-Host "  [OK] Ya tienes la ultima version ($version)" -ForegroundColor Green
}
exit 0
