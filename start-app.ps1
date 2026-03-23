# Start the Cognito Authorizer application
# This script starts both the backend API server and the Vite frontend in Windows Terminal tabs

$projectDir = "$PSScriptRoot"
$backendPort = 3002
$frontendPort = 5175

function Stop-ProcessOnPort {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $pid = $connection.OwningProcess | Select-Object -First 1
        Write-Host "Killing process on port $Port (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Kill any existing processes on our ports
Stop-ProcessOnPort -Port $backendPort
Stop-ProcessOnPort -Port $frontendPort

# Check if node_modules exists
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $projectDir
    npm install
    Pop-Location
}

Write-Host "Starting backend server (port $backendPort)..." -ForegroundColor Cyan
wt -w 0 nt --title "Backend API" -d "$projectDir" cmd /k "npm run server"

Write-Host "Starting Vite dev server..." -ForegroundColor Cyan
wt -w 0 nt --title "Frontend" -d "$projectDir" cmd /k "npm run dev"

Write-Host ""
Write-Host "Application started!" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:$backendPort" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:$frontendPort" -ForegroundColor White
