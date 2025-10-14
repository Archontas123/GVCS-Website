#!/bin/bash

# CS Club Hackathon Platform - SSL Certificate Setup Script
# This script sets up SSL certificates using Let's Encrypt

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Get domain from user
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for Let's Encrypt notifications: " EMAIL

log_info "Setting up SSL certificates for $DOMAIN..."

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Stop nginx container temporarily
log_info "Stopping nginx container..."
docker-compose -f /opt/cs-club-hackathon/docker-compose.prod.yml stop frontend

# Obtain certificate
log_info "Obtaining SSL certificate..."
certbot certonly --standalone \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --preferred-challenges http

# Copy certificates to nginx directory
log_info "Copying certificates..."
mkdir -p /opt/cs-club-hackathon/nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/cs-club-hackathon/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/cs-club-hackathon/nginx/ssl/private.key

# Set permissions
chmod 644 /opt/cs-club-hackathon/nginx/ssl/cert.pem
chmod 600 /opt/cs-club-hackathon/nginx/ssl/private.key

# Start nginx container
log_info "Starting nginx container..."
docker-compose -f /opt/cs-club-hackathon/docker-compose.prod.yml start frontend

# Setup auto-renewal
log_info "Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renewal << EOF
# Renew Let's Encrypt certificates twice daily
0 0,12 * * * root certbot renew --quiet --post-hook "docker-compose -f /opt/cs-club-hackathon/docker-compose.prod.yml restart frontend"
EOF

log_info "SSL certificates installed successfully!"
log_info "Certificates will auto-renew before expiration"
log_info ""
log_info "Your site should now be accessible at: https://$DOMAIN"
