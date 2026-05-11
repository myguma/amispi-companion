# AmitySpirit Companion - Release Builder
# Run via build-release.bat (double-click) or: powershell -ExecutionPolicy Bypass -File build-release.ps1

param(
    [string]$KeyFile = "$HOME\.tauri\amispi-companion.key"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AmitySpirit Companion - Release Build " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Check prerequisites ---

function Require-Command($name, $installUrl) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "[MISSING] $name not found." -ForegroundColor Red
        Write-Host "  Install from: $installUrl" -ForegroundColor Yellow
        exit 1
    }
    $ver = & $name --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] $name  $ver" -ForegroundColor Green
}

Require-Command "node"  "https://nodejs.org/"
Require-Command "cargo" "https://rustup.rs/"
Require-Command "npm"   "https://nodejs.org/"

Write-Host ""

# --- Signing key ---

if (Test-Path $KeyFile) {
    $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $KeyFile -Raw).Trim()
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
    Write-Host "[OK] Signing key loaded from $KeyFile" -ForegroundColor Green
} else {
    Write-Host "[WARN] Signing key not found at $KeyFile" -ForegroundColor Yellow
    Write-Host "       Auto-update signing will be disabled for this build." -ForegroundColor Yellow
    Write-Host "       To enable: save the private key from docs/RELEASE.md to $KeyFile" -ForegroundColor Yellow
}

Write-Host ""

# --- Move to project root ---

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot
Write-Host "[INFO] Project root: $ProjectRoot" -ForegroundColor DarkGray

# --- Install frontend dependencies ---

Write-Host ""
Write-Host "--- Installing dependencies ---" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] npm install failed" -ForegroundColor Red
    exit 1
}

# --- Build ---

Write-Host ""
Write-Host "--- Building Windows installer ---" -ForegroundColor Cyan
Write-Host "    This takes 3-10 minutes on first run (Rust compilation)." -ForegroundColor DarkGray
Write-Host ""

npm run tauri:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed. Check output above." -ForegroundColor Red
    exit 1
}

# --- Locate installer ---

$BundleDir = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis"
$Installer  = Get-ChildItem $BundleDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($Installer) {
    Write-Host ""
    Write-Host "  Installer: $($Installer.Name)" -ForegroundColor White
    Write-Host "  Size:      $([math]::Round($Installer.Length / 1MB, 1)) MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening output folder..." -ForegroundColor DarkGray
    Start-Process "explorer.exe" "/select,`"$($Installer.FullName)`""
} else {
    Write-Host ""
    Write-Host "  Output folder: $BundleDir" -ForegroundColor White
    Start-Process "explorer.exe" $BundleDir
}

Write-Host ""
