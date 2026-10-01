# ==============================================================================
# Antiquitäten-App - Windows Development Launcher
# ==============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Antiquitäten-App - Windows Development Launcher    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Prüfe Python Installation
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    Write-Host "[FEHLER] Python wurde nicht im PATH gefunden!" -ForegroundColor Red
    Write-Host "Bitte installiere Python 3.11+ und aktiviere 'Add python.exe to PATH'." -ForegroundColor Yellow
    exit 1
}

# 2. Virtuelles Environment backend/venv prüfen und anlegen
$BackendDir = Join-Path $ScriptDir "backend"
$VenvDir = Join-Path $BackendDir "venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$RequirementsFile = Join-Path $BackendDir "requirements.txt"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[1/3] Virtuelles Python-Environment wird erstellt in backend\venv..." -ForegroundColor Yellow
    & python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FEHLER] Konnte venv nicht erstellen." -ForegroundColor Red
        exit 1
    }
    Write-Host "[1/3] Installiere Python-Abhängigkeiten aus requirements.txt..." -ForegroundColor Yellow
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r $RequirementsFile
} else {
    Write-Host "[1/3] Virtuelles Environment ist bereit." -ForegroundColor Green
    if (Test-Path $RequirementsFile) {
        $CheckUvicorn = & $VenvPython -c "import uvicorn; print('ok')" 2>$null
        if ($CheckUvicorn -ne "ok") {
            Write-Host "[1/3] Ergänze fehlende Python-Abhängigkeiten..." -ForegroundColor Yellow
            & $VenvPython -m pip install -r $RequirementsFile
        }
    }
}

# 3. Frontend-Abhängigkeiten prüfen
$FrontendDir = Join-Path $ScriptDir "frontend"
$NodeModules = Join-Path $FrontendDir "node_modules"

if (-not (Test-Path $NodeModules)) {
    Write-Host "[2/3] Installiere Node.js-Abhängigkeiten in frontend/ (npm install)..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        & npm.cmd install
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[2/3] Frontend-Abhängigkeiten vorhanden." -ForegroundColor Green
}

# 4. Backend (FastAPI) auf http://127.0.0.1:8000 starten
Write-Host "[3/3] Starte FastAPI Backend auf http://127.0.0.1:8000..." -ForegroundColor Cyan
$BackendProcess = Start-Process `
    -FilePath $VenvPython `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" `
    -WorkingDirectory $BackendDir `
    -PassThru

Write-Host "-> Backend läuft (PID: $($BackendProcess.Id))" -ForegroundColor Green
Write-Host "   API:  http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "   Docs: http://127.0.0.1:8000/api/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Starte Vite Frontend Dev-Server (http://localhost:3000)..." -ForegroundColor Cyan
Write-Host "Beenden mit STRG+C." -ForegroundColor Yellow
Write-Host ""

# 5. Frontend Dev-Server starten & Aufräumen bei Beenden
Push-Location $FrontendDir
try {
    & npm.cmd run dev
} finally {
    Pop-Location
    if ($BackendProcess -and !$BackendProcess.HasExited) {
        Write-Host ""
        Write-Host "Stoppe Backend-Prozess (PID: $($BackendProcess.Id))..." -ForegroundColor Yellow
        taskkill.exe /PID $BackendProcess.Id /T /F 2>$null
        Write-Host "Backend gestoppt." -ForegroundColor Green
    }
}
