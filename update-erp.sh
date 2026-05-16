#!/bin/bash
echo "🚀 Updating TED ERP..."
git pull origin main
docker-compose up -d --build
echo "✅ Update Complete!"
