#!/bin/bash

# Fix Database Credentials Script
# This script fixes the PostgreSQL authentication issue by ensuring correct environment variables

set -e  # Exit on error

echo "=================================="
echo "Database Credentials Fix Script"
echo "=================================="
echo ""

# Change to the application directory
cd /opt/cs-club-hackathon || { echo "Error: Could not find /opt/cs-club-hackathon directory"; exit 1; }

echo "✓ Changed to application directory: $(pwd)"
echo ""

# Backup existing .env if it exists
if [ -f .env ]; then
    BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Backing up existing .env to $BACKUP_FILE"
    cp .env "$BACKUP_FILE"
    echo "✓ Backup created"
    echo ""
fi

# Check current POSTGRES environment variables
echo "📋 Current PostgreSQL environment variables in .env:"
if [ -f .env ]; then
    grep -E "^POSTGRES_" .env || echo "  (none found)"
else
    echo "  .env file does not exist"
fi
echo ""

# Create/update .env file with correct credentials
echo "📝 Setting correct database credentials..."
cat > .env.temp << 'EOF'
# Database Configuration
POSTGRES_DB=hackathon_db
POSTGRES_USER=hackathon_user
POSTGRES_PASSWORD=hackathon_password

# JWT Configuration (update this with your actual secret)
JWT_SECRET=your_jwt_secret_change_in_production

# Admin Configuration
ADMIN_PASSWORD=change_this_admin_password

# Application Settings
NODE_ENV=production
BACKEND_PORT=3000
FRONTEND_PORT=80

# Contest Settings
CONTEST_DURATION=240
MAX_TEAMS=100
MAX_SUBMISSIONS_PER_MINUTE=10

# Code Execution Settings
EXECUTION_TIMEOUT=10
MEMORY_LIMIT=256
ENABLE_CODE_EXECUTION=true

# Monitoring Settings
ENABLE_METRICS=true
LOG_LEVEL=info

# Domain Configuration (update with your actual domain)
DOMAIN=hackthevalley.duckdns.org
REACT_APP_API_URL=https://hackthevalley.duckdns.org/api
REACT_APP_WS_URL=wss://hackthevalley.duckdns.org
EOF

# If existing .env has JWT_SECRET, preserve it
if [ -f .env ]; then
    EXISTING_JWT=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2- || echo "")
    if [ ! -z "$EXISTING_JWT" ] && [ "$EXISTING_JWT" != "your_jwt_secret_change_in_production" ]; then
        echo "✓ Preserving existing JWT_SECRET"
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$EXISTING_JWT|" .env.temp
    fi

    EXISTING_ADMIN_PASS=$(grep "^ADMIN_PASSWORD=" .env | cut -d'=' -f2- || echo "")
    if [ ! -z "$EXISTING_ADMIN_PASS" ]; then
        echo "✓ Preserving existing ADMIN_PASSWORD"
        sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$EXISTING_ADMIN_PASS|" .env.temp
    fi
fi

# Move the temp file to .env
mv .env.temp .env
chmod 600 .env  # Secure the file

echo "✓ .env file updated with correct credentials"
echo ""

# Show the new database configuration
echo "📋 New database configuration:"
grep -E "^POSTGRES_|^DB_" .env
echo ""

# Verify docker-compose can read the file
echo "🔍 Verifying docker-compose configuration..."
docker-compose config | grep -A 5 "DB_USER" || echo "Warning: Could not verify configuration"
echo ""

# Restart the backend container
echo "🔄 Restarting backend container to apply new credentials..."
docker-compose restart backend

echo ""
echo "⏳ Waiting for backend to restart (15 seconds)..."
sleep 15

# Check backend container status
echo ""
echo "📊 Backend container status:"
docker ps | grep programming_contest_backend

# Check backend logs for any database connection errors
echo ""
echo "📝 Recent backend logs (last 20 lines):"
docker logs programming_contest_backend --tail 20 2>&1

echo ""
echo "=================================="
echo "✅ Script completed!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Check if the postgres authentication errors have stopped:"
echo "   docker logs programming_contest_postgres --tail 20"
echo ""
echo "2. Test the admin login at:"
echo "   https://hackthevalley.duckdns.org/api/admin/login"
echo ""
echo "3. If errors persist, check backend environment variables:"
echo "   docker inspect programming_contest_backend --format='{{range .Config.Env}}{{println .}}{{end}}' | grep DB_"
echo ""
