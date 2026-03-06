# Kalshi Intelligence Platform — Start Script
# Run this once to launch backend + frontend + ngrok
# Usage: .\start.ps1

$dashboard = "C:\Users\hunte\.openclaw\workspace\kalshi-dashboard"

Write-Host "Starting Kalshi Intelligence Platform..." -ForegroundColor Cyan

# Backend (FastAPI on :8000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dashboard'; python main.py" -WindowStyle Normal

# Frontend (Vite on :5173)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dashboard'; npm run dev -- --host" -WindowStyle Normal

# ngrok tunnel
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dashboard'; npx ngrok http 5173" -WindowStyle Normal

Start-Sleep -Seconds 4

# Get ngrok URL
try {
    $tunnels = Invoke-RestMethod "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $url = $tunnels.tunnels[0].public_url
    Write-Host ""
    Write-Host "Dashboard live at:" -ForegroundColor Green
    Write-Host "  Local:  http://localhost:5173" -ForegroundColor White
    Write-Host "  Public: $url" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Backend API: http://localhost:8000/api/status" -ForegroundColor Gray
} catch {
    Write-Host "Local: http://localhost:5173" -ForegroundColor Green
    Write-Host "(ngrok URL available at http://localhost:4040)" -ForegroundColor Gray
}
