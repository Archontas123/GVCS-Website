#!/bin/bash

echo "=================================="
echo "Production Database Connection Fix"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Expected credentials from docker-compose.yml
DB_USER="hackathon_user"
DB_PASSWORD="hackathon_password"
DB_NAME="hackathon_db"

echo -e "${YELLOW}Step 1: Checking PostgreSQL container status...${NC}"
if ! docker ps | grep -q programming_contest_postgres; then
    echo -e "${RED}❌ PostgreSQL container is not running!${NC}"
    echo "Starting containers..."
    docker-compose up -d postgres
    sleep 5
fi
echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
echo ""

echo -e "${YELLOW}Step 2: Resetting database user password...${NC}"
docker exec -i programming_contest_postgres psql -U postgres <<EOF
-- Ensure the user exists and reset password
DROP USER IF EXISTS ${DB_USER};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and grant schema permissions
\c ${DB_NAME}
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_USER};

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${DB_USER};

-- Verify user exists
SELECT usename, usesuper FROM pg_user WHERE usename = '${DB_USER}';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database user password reset successfully${NC}"
else
    echo -e "${RED}❌ Failed to reset database user password${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Testing database connection from host...${NC}"
if PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful from host${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot connect from host (this is OK if psql is not installed)${NC}"
fi
echo ""

echo -e "${YELLOW}Step 4: Testing database connection from inside container...${NC}"
if docker exec programming_contest_postgres psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful from inside container${NC}"
else
    echo -e "${RED}❌ Connection failed from inside container${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 5: Restarting backend container...${NC}"
docker-compose restart backend
echo "Waiting for backend to restart (15 seconds)..."
sleep 15
echo ""

echo -e "${YELLOW}Step 6: Checking backend logs for database connection...${NC}"
BACKEND_LOGS=$(docker logs programming_contest_backend --tail 50 2>&1)
if echo "$BACKEND_LOGS" | grep -q "Database connection failed"; then
    echo -e "${RED}❌ Backend still cannot connect to database${NC}"
    echo ""
    echo "Recent backend logs:"
    echo "$BACKEND_LOGS" | tail -20
    exit 1
elif echo "$BACKEND_LOGS" | grep -q "Server running on port"; then
    echo -e "${GREEN}✅ Backend started successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Backend status unclear, check logs manually${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Testing API health endpoint...${NC}"
sleep 5
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    echo "Response: $HEALTH_CHECK"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "Response: $HEALTH_CHECK"
fi
echo ""

echo "=================================="
echo -e "${GREEN}✅ Fix script completed!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Monitor backend logs: docker logs -f programming_contest_backend"
echo "2. Test your hackathon website login"
echo "3. If still having issues, check: docker-compose logs -f"
