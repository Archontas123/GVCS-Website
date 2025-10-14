#!/bin/bash
# Complete VPS Deployment Script for Hetzner
# Run this on your Hetzner VPS after initial setup

set -e

echo "=== CS Club Hackathon Platform - VPS Deployment ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${YELLOW}Step 2: Install Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Install Docker Compose${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install docker-compose -y
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Install Certbot${NC}"
if ! command -v certbot &> /dev/null; then
    apt install certbot -y
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Configure Firewall${NC}"
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5432/tcp  # PostgreSQL
ufw allow 6379/tcp  # Redis
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"

echo ""
echo -e "${YELLOW}Step 6: Clone Repository${NC}"
cd /opt
if [ -d "CSCLUBWebsite" ]; then
    echo "Repository already exists, pulling latest..."
    cd CSCLUBWebsite
    git pull
else
    read -p "Enter your GitHub repository URL: " REPO_URL
    git clone "$REPO_URL" CSCLUBWebsite
    cd CSCLUBWebsite
fi
echo -e "${GREEN}✓ Repository ready${NC}"

echo ""
echo -e "${YELLOW}Step 7: Setup Environment${NC}"
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo -e "${GREEN}✓ Environment file created${NC}"
else
    echo -e "${GREEN}✓ Environment file already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 8: Setup DuckDNS${NC}"
if [ -f "scripts/setup-duckdns.sh" ]; then
    bash scripts/setup-duckdns.sh
else
    echo -e "${RED}Warning: DuckDNS setup script not found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 9: Get SSL Certificate${NC}"
read -p "Do you want to setup SSL now? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    certbot certonly --standalone -d hackthevalley.duckdns.org
    echo -e "${GREEN}✓ SSL certificate obtained${NC}"
else
    echo -e "${YELLOW}⚠ Skipping SSL setup (you can run: certbot certonly --standalone -d hackthevalley.duckdns.org)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 10: Start Services${NC}"
echo "Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

echo "Waiting for databases to be ready (30 seconds)..."
sleep 30

echo "Starting backend and frontend..."
docker-compose up -d backend frontend

echo -e "${GREEN}✓ All services started${NC}"

echo ""
echo -e "${YELLOW}Step 11: Run Database Migrations${NC}"
sleep 10  # Give backend time to start
docker exec programming_contest_backend npm run migrate || echo -e "${YELLOW}⚠ Migration failed or already run${NC}"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo -e "${GREEN}✓ Your application should now be running!${NC}"
echo ""
echo "Check status with:"
echo "  docker-compose ps"
echo ""
echo "View logs with:"
echo "  docker-compose logs -f"
echo ""
echo "Access your application at:"
echo "  http://hackthevalley.duckdns.org (or https if SSL configured)"
echo ""
echo "To update in the future, run:"
echo "  cd /opt/CSCLUBWebsite && bash scripts/vps-deploy.sh"
