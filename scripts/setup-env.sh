#!/bin/bash

# CS Club Hackathon Platform - Environment Setup Script
# This script generates a production-ready .env file with secure secrets

set -e

echo "=========================================="
echo "CS Club Hackathon - Environment Setup"
echo "=========================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    read -p ".env file already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Prompt for required values
echo "Please provide the following information:"
echo ""

read -p "Your DuckDNS subdomain (e.g., yourname.duckdns.org): " DOMAIN
while [ -z "$DOMAIN" ]; do
    read -p "Domain is required. Please enter your domain: " DOMAIN
done

read -sp "Admin password: " ADMIN_PASSWORD
echo
while [ -z "$ADMIN_PASSWORD" ]; do
    read -sp "Admin password is required: " ADMIN_PASSWORD
    echo
done

read -sp "PostgreSQL password: " POSTGRES_PASSWORD
echo
while [ -z "$POSTGRES_PASSWORD" ]; do
    read -sp "PostgreSQL password is required: " POSTGRES_PASSWORD
    echo
done

read -sp "Redis password: " REDIS_PASSWORD
echo
while [ -z "$REDIS_PASSWORD" ]; do
    read -sp "Redis password is required: " REDIS_PASSWORD
    echo
done

echo ""
echo "Generating secure secrets..."

# Generate secrets
JWT_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 32)

echo "Creating .env file..."

# Create .env file
cat > .env << EOF
# CS Club Hackathon Platform - Production Environment Configuration
# Generated on $(date)

# ==============================================
# APPLICATION SETTINGS
# ==============================================
NODE_ENV=production
PORT=3000
FRONTEND_PORT=80
BACKEND_PORT=3000

# Domain and URLs
DOMAIN=${DOMAIN}
REACT_APP_API_URL=https://${DOMAIN}/api
REACT_APP_WS_URL=wss://${DOMAIN}

# ==============================================
# SECURITY CONFIGURATION
# ==============================================
# JWT Secret (Auto-generated)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# Admin Password
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# Session Secret (Auto-generated)
SESSION_SECRET=${SESSION_SECRET}

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DB_TYPE=postgres
DATABASE_URL=postgresql://hackathon_user:${POSTGRES_PASSWORD}@postgres:5432/hackathon_db

# PostgreSQL settings
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hackathon_db
POSTGRES_DB=hackathon_db
POSTGRES_USER=hackathon_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DB_PASSWORD=${POSTGRES_PASSWORD}

# ==============================================
# REDIS CONFIGURATION
# ==============================================
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ==============================================
# CONTEST SETTINGS
# ==============================================
CONTEST_DURATION=240
DEFAULT_CONTEST_DURATION=180
DEFAULT_FREEZE_TIME=60
MAX_TEAMS=100
MAX_SUBMISSIONS_PER_MINUTE=10
MAX_SUBMISSIONS_PER_HOUR=60
MAX_PROBLEMS_PER_CONTEST=10
DEFAULT_TIME_LIMIT=5000
DEFAULT_MEMORY_LIMIT=256

# ==============================================
# CODE EXECUTION SETTINGS
# ==============================================
ENABLE_CODE_EXECUTION=true
EXECUTION_TIMEOUT=10
MEMORY_LIMIT=256
CPU_LIMIT=1.0
SUPPORTED_LANGUAGES=cpp,java,python3
DOCKER_NETWORK=hackathon_network
JUDGE_CONTAINER=hackathon_judge

# ==============================================
# MONITORING & LOGGING
# ==============================================
ENABLE_METRICS=true
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_USER=admin
GRAFANA_PASSWORD=$(openssl rand -hex 16)
LOKI_PORT=3100
LOG_LEVEL=info
LOG_FILE=./logs/combined.log
ERROR_LOG_FILE=./logs/error.log

# ==============================================
# EMAIL NOTIFICATIONS (Optional)
# ==============================================
ENABLE_EMAIL=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@${DOMAIN}

# ==============================================
# RATE LIMITING
# ==============================================
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
LOGIN_RATE_LIMIT_WINDOW=900000
LOGIN_RATE_LIMIT_MAX=5

# ==============================================
# BACKUP SETTINGS
# ==============================================
ENABLE_BACKUPS=true
BACKUP_INTERVAL=3600
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=./backups

# ==============================================
# SSL/TLS CONFIGURATION
# ==============================================
SSL_CERT_PATH=./nginx/ssl/cert.pem
SSL_KEY_PATH=./nginx/ssl/private.key
SSL_CA_PATH=./nginx/ssl/ca.pem
LETSENCRYPT_EMAIL=admin@${DOMAIN}
ENABLE_HTTPS=true

# ==============================================
# PERFORMANCE TUNING
# ==============================================
UV_THREADPOOL_SIZE=4
NODE_OPTIONS=--max-old-space-size=2048
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY_ON_FAILURE=100

# ==============================================
# FEATURE FLAGS
# ==============================================
ENABLE_REAL_TIME_UPDATES=true
ENABLE_LEADERBOARD_FREEZE=true
ENABLE_TEAM_REGISTRATION=true
ENABLE_ADMIN_PANEL=true
ENABLE_SUBMISSION_QUEUE=true

# ==============================================
# MISCELLANEOUS
# ==============================================
TZ=UTC
APP_NAME=CS Club Hackathon Platform
APP_VERSION=6.2.0
CONTACT_EMAIL=admin@${DOMAIN}
SUPPORT_URL=https://${DOMAIN}/support
EOF

# Set proper permissions
chmod 600 .env

echo ""
echo "=========================================="
echo "✓ Environment setup complete!"
echo "=========================================="
echo ""
echo "Configuration saved to .env"
echo ""
echo "Your domain: ${DOMAIN}"
echo "API URL: https://${DOMAIN}/api"
echo "WebSocket URL: wss://${DOMAIN}"
echo ""
echo "IMPORTANT: Keep your .env file secure!"
echo "File permissions set to 600 (owner read/write only)"
echo ""
echo "Next steps:"
echo "1. Review .env file if needed: nano .env"
echo "2. Setup SSL certificates: bash scripts/setup-ssl.sh"
echo "3. Deploy application: bash deploy.sh"
echo ""
