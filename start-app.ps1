# Start the Cognito Authorizer application
# This script starts both the backend API server and the Vite frontend in Windows Terminal tabs

$projectDir = "$PSScriptRoot"

# Check if node_modules exists
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $projectDir
    npm install
    Pop-Location
}

Write-Host "Starting backend server (port 3002)..." -ForegroundColor Cyan
wt -w 0 nt --title "Backend API" -d "$projectDir" cmd /k "npm run server"

Write-Host "Starting Vite dev server..." -ForegroundColor Cyan
wt -w 0 nt --title "Frontend" -d "$projectDir" cmd /k "npm run dev"

Write-Host ""
Write-Host "Application started!" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:3002" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:5175" -ForegroundColor White
