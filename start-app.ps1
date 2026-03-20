# Start the Cognito Authorizer application
# This script starts both the backend API server and the Vite frontend

$projectDir = "$PSScriptRoot\manage-policies"

# Check if node_modules exists
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $projectDir
    npm install
    Pop-Location
}

Write-Host "Starting backend server (port 3001)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$projectDir`" && npm run server" -WindowStyle Normal

Write-Host "Starting Vite dev server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$projectDir`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Application started!" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
