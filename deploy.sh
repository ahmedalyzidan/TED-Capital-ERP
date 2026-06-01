#!/bin/bash
# --- Ted ERP Production Deployment Script ---

# 1. Update & Prerequisites
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common git ufw

# 2. Configure 2GB Swap for Stability
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap configured: 2GB"
fi

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker installed."
fi

# 4. Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed."
fi

# 5. Configure Firewall (UFW)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 6. Deployment Logic
echo "Pulling latest code..."
# git pull origin main (Uncomment if repo is set up)

# Ensure .env exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "WARNING: .env created from example. Please update it with production secrets!"
fi

# Ensure nginx.conf is SSL version on production
if [ -f nginx.ssl.conf ]; then
    cp nginx.ssl.conf nginx.conf
    echo "SSL Nginx configuration applied."
fi

echo "Building and starting containers..."
sudo docker-compose up -d --build

echo "Deployment Successful! System is live at 46.224.144.166"
sudo docker ps
