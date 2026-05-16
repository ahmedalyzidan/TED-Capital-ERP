#!/bin/bash

# ==============================================================================
# TED ERP - Enterprise Deployment Script for Ubuntu
# ==============================================================================

# Exit on any error
set -e

echo "🚀 Starting TED ERP Server Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Create Swap File (Essential for 4GB RAM)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB Swap file for stability..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap file created and enabled."
else
    echo "ℹ️ Swap file already exists."
fi

# 3. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed."
else
    echo "ℹ️ Docker is already installed."
fi

# 4. Configure Firewall (UFW)
echo "🔥 Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "✅ Firewall configured (SSH, HTTP, HTTPS allowed)."

# 5. Environment File Setup
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️  CRITICAL: .env created from .env.example. Please EDIT it now!"
        echo "Press any key to open .env with nano (or CTRL+C to stop and edit manually)..."
        read -n 1
        nano .env
    else
        echo "❌ Error: .env.example not found. Please create .env manually."
        exit 1
    fi
else
    echo "ℹ️ .env file already exists."
fi

# 6. Database Backup Cron Job
echo "⏰ Setting up daily database backup cron job..."
CHMOD_CMD="chmod +x $(pwd)/backup-db.sh"
eval $CHMOD_CMD
CRON_JOB="0 2 * * * cd $(pwd) && ./backup-db.sh >> ./backups/backup.log 2>&1"
(crontab -l 2>/dev/null | grep -Fv "backup-db.sh" ; echo "$CRON_JOB") | crontab -
echo "✅ Cron job added (Daily at 2:00 AM)."

# 7. Build and Start Application
echo "🏗️ Building and starting TED ERP containers..."
sudo docker compose up -d --build

echo ""
echo "=============================================================================="
echo "🎉 TED ERP DEPLOYMENT COMPLETE!"
echo "=============================================================================="
echo "Frontend: http://46.224.144.166"
echo "Backend API: http://46.224.144.166/api"
echo ""
echo "Monitor logs with: sudo docker compose logs -f"
echo "=============================================================================="
