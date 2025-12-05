#!/bin/bash

# Azure Web Apps Deployment Script for Vite React SPA
# This script builds the app and prepares it for deployment

echo "========================================="
echo "FreshGrad Tracker - Azure Deployment"
echo "========================================="

# Exit on any error
set -e

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# 2. Build the application
echo "🔨 Building application..."
npm run build

# 3. Copy web.config to dist
echo "📋 Copying web.config..."
cp web.config dist/

# 4. Copy public assets to dist (if not already done by Vite)
echo "📁 Ensuring public assets are in dist..."
if [ -d "public/Heros" ]; then
  mkdir -p dist/Heros
  cp -r public/Heros/* dist/Heros/ 2>/dev/null || true
fi

if [ -f "public/hero-manifest.json" ]; then
  cp public/hero-manifest.json dist/
fi

echo "✅ Build completed successfully!"
echo "📂 Deployment files are in: ./dist"
echo "========================================="
