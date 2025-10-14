#!/bin/bash

# CS Club Hackathon Platform - VPS Initial Setup Script
# Run this script once on a fresh VPS to install dependencies

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

log_info "Starting VPS setup..."

# Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install basic dependencies
log_info "Installing basic dependencies..."
apt-get install -y \
    curl \
    git \
    wget \
    vim \
    htop \
    ufw \
    fail2ban \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_info "Docker installed successfully"
else
    log_info "Docker is already installed"
fi

# Install Docker Compose
log_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_info "Docker Compose installed successfully"
else
    log_info "Docker Compose is already installed"
fi

# Setup firewall
log_info "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw status

# Setup fail2ban
log_info "Configuring fail2ban..."
systemctl start fail2ban
systemctl enable fail2ban

# Create swap file if not exists (recommended for small VPS)
if [ ! -f /swapfile ]; then
    log_info "Creating swap file (2GB)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
    log_info "Swap file already exists"
fi

# Create deployment user
log_info "Creating deployment user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    log_info "User 'deploy' created and added to docker group"
else
    log_info "User 'deploy' already exists"
fi

# Setup automatic security updates
log_info "Setting up automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Install certbot for SSL (Let's Encrypt)
log_info "Installing Certbot for SSL certificates..."
apt-get install -y certbot

# Optimize system for production
log_info "Optimizing system settings..."
cat >> /etc/sysctl.conf <<EOF

# CS Club Hackathon Platform - Production optimizations
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
vm.overcommit_memory = 1
EOF
sysctl -p

# Setup log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/docker-containers <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

log_info "VPS setup completed successfully!"
log_info ""
log_info "Next steps:"
log_info "1. Set up SSH keys for the 'deploy' user"
log_info "2. Configure your GitHub repository URL in deploy.sh"
log_info "3. Create and configure .env file with production values"
log_info "4. Run the deploy.sh script to deploy the application"
log_info ""
log_info "For SSL certificates, run:"
log_info "  certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com"
log_info ""
log_info "To deploy, run as root:"
log_info "  bash deploy.sh"
