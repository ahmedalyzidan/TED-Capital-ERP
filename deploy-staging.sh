#!/bin/bash
# --- Ted ERP Staging Deployment Script ---

echo "🚀 Starting Staging Deployment..."

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build and start staging containers
echo "🏗️ Building Staging Environment (Port 8080)..."
docker-compose -f docker-compose.staging.yml up -d --build

echo "✅ Staging Environment is live at http://46.224.144.166:8080"
docker ps | grep staging
