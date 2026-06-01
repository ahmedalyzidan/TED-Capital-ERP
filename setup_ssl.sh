#!/bin/bash
# --- SSL Setup Script for tedcapital.duckdns.org ---
set -e

DOMAIN="tedcapital2026.duckdns.org"
EMAIL="ahmedzidan2013@gmail.com"

echo "=========================================================="
echo "Starting Let's Encrypt SSL Setup for ${DOMAIN}..."
echo "=========================================================="

# 1. Install Certbot
echo "[1/5] Installing certbot..."
sudo apt-get update
sudo apt-get install -y certbot

# 2. Stop Docker-compose to free port 80
echo "[2/5] Stopping active containers on port 80..."
sudo docker-compose down || true

# 3. Generate Let's Encrypt Certificate
echo "[3/5] Requesting certificate for ${DOMAIN}..."
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL"

# 4. Overwrite nginx.conf with SSL config
echo "[4/5] Activating SSL Nginx configuration..."
cp nginx.ssl.conf nginx.conf

# 5. Start Docker containers with SSL
echo "[5/5] Launching containers with SSL active..."
sudo docker-compose up -d --build

echo "=========================================================="
echo "SSL Setup Successful! System is live at: https://${DOMAIN}"
echo "=========================================================="
sudo docker ps
