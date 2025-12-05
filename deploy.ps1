# Azure Web Apps Deployment Script for Vite React SPA (PowerShell)
# This script builds the app and prepares it for deployment

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "FreshGrad Tracker - Azure Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Exit on any error
$ErrorActionPreference = "Stop"

try {
    # 1. Install dependencies
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
    npm ci --production=false

    # 2. Build the application
    Write-Host "`n🔨 Building application..." -ForegroundColor Yellow
    npm run build

    # 3. Copy web.config to dist
    Write-Host "`n📋 Copying web.config..." -ForegroundColor Yellow
    Copy-Item -Path "web.config" -Destination "dist\" -Force

    # 4. Copy public assets to dist (if not already done by Vite)
    Write-Host "`n📁 Ensuring public assets are in dist..." -ForegroundColor Yellow
    if (Test-Path "public\Heros") {
        New-Item -ItemType Directory -Path "dist\Heros" -Force | Out-Null
        Copy-Item -Path "public\Heros\*" -Destination "dist\Heros\" -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path "public\hero-manifest.json") {
        Copy-Item -Path "public\hero-manifest.json" -Destination "dist\" -Force
    }

    Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "📂 Deployment files are in: .\dist" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Build failed: $_" -ForegroundColor Red
    exit 1
}
