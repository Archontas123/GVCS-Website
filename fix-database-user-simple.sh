#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================="
echo -e "PostgreSQL User Fix Script (Simple)"
echo -e "==================================${NC}\n"

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run with sudo${NC}"
    exit 1
fi

# Set the correct credentials
NEW_USER="hackathon_user"
NEW_PASSWORD="hackathon_password"
DB_NAME="hackathon_db"

echo -e "${BLUE}This script will:${NC}"
echo -e "1. Update PostgreSQL user credentials inside the existing database"
echo -e "2. Keep all existing data intact"
echo -e "3. Restart the backend to apply changes\n"

echo -e "${BLUE}🔍 Step 1: Checking current PostgreSQL users...${NC}"
docker exec programming_contest_postgres psql -U postgres -d postgres -c "\du"

echo -e "\n${BLUE}🔧 Step 2: Creating/updating hackathon_user with correct password...${NC}"
docker exec programming_contest_postgres psql -U postgres -d postgres <<EOF
-- Drop user if exists (to recreate with correct password)
DROP USER IF EXISTS hackathon_user;

-- Create user with correct password
CREATE USER hackathon_user WITH PASSWORD 'hackathon_password';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE hackathon_db TO hackathon_user;

-- Connect to hackathon_db and grant schema privileges
\c hackathon_db

-- Grant all privileges on schema
GRANT ALL ON SCHEMA public TO hackathon_user;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hackathon_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hackathon_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hackathon_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hackathon_user;

-- Make hackathon_user owner of the database
\c postgres
ALTER DATABASE hackathon_db OWNER TO hackathon_user;

\q
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ User credentials updated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to update user credentials!${NC}"
    exit 1
fi

echo -e "\n${BLUE}🔍 Step 3: Verifying updated users...${NC}"
docker exec programming_contest_postgres psql -U postgres -d postgres -c "\du"

echo -e "\n${BLUE}🧪 Step 4: Testing connection with new credentials...${NC}"
if docker exec programming_contest_postgres psql -U "$NEW_USER" -d "$DB_NAME" -c "SELECT current_user, current_database();" 2>&1; then
    echo -e "${GREEN}✅ Connection test successful!${NC}"
else
    echo -e "${RED}❌ Connection test failed!${NC}"
    exit 1
fi

echo -e "\n${BLUE}🔄 Step 5: Restarting backend container...${NC}"
cd /opt/cs-club-hackathon
docker-compose restart backend

echo -e "\n${BLUE}⏳ Waiting for backend to restart (20 seconds)...${NC}"
sleep 20

echo -e "\n${BLUE}📊 Step 6: Checking backend logs...${NC}"
docker logs programming_contest_backend --tail 30

echo -e "\n${BLUE}🔍 Step 7: Checking for authentication errors...${NC}"
if docker logs programming_contest_postgres --tail 50 | grep -i "authentication failed"; then
    echo -e "${YELLOW}⚠️  Authentication errors found:${NC}"
    docker logs programming_contest_postgres --tail 20
else
    echo -e "${GREEN}✅ No authentication errors!${NC}"
fi

echo -e "\n${BLUE}🧪 Step 8: Testing API health endpoint...${NC}"
sleep 5
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    echo -e "${BLUE}Response:${NC} $HEALTH_CHECK"
else
    echo -e "${RED}❌ API is not responding${NC}"
fi

echo -e "\n${GREEN}=================================="
echo -e "✅ Script completed!"
echo -e "==================================${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Monitor backend logs for any remaining issues:"
echo -e "   ${YELLOW}docker logs -f programming_contest_backend${NC}"
echo -e ""
echo -e "2. Monitor PostgreSQL logs:"
echo -e "   ${YELLOW}docker logs -f programming_contest_postgres${NC}"
echo -e ""
echo -e "3. Test the admin login at your hackathon website"
