#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================="
echo -e "PostgreSQL Database User Fix Script"
echo -e "==================================${NC}\n"

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run with sudo${NC}"
    exit 1
fi

# Set the correct credentials
DB_USER="hackathon_user"
DB_PASSWORD="hackathon_password"
DB_NAME="hackathon_db"
BACKUP_FILE="/tmp/hackathon_db_backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${YELLOW}⚠️  WARNING: This script will recreate the PostgreSQL database.${NC}"
echo -e "${YELLOW}A backup will be created first.${NC}\n"
read -p "Do you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo -e "\n${BLUE}📦 Step 1: Creating database backup...${NC}"
docker exec programming_contest_postgres pg_dump -U postgres -d hackathon_db > "$BACKUP_FILE" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not backup with postgres user, trying hackathon_user...${NC}"
    docker exec programming_contest_postgres pg_dump -U hackathon_user -d hackathon_db > "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not create backup (database might not exist yet). Continuing...${NC}"
        BACKUP_FILE=""
    }
}

if [ -n "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No backup created (database might be empty)${NC}"
    BACKUP_FILE=""
fi

echo -e "\n${BLUE}🛑 Step 2: Stopping containers...${NC}"
cd /opt/cs-club-hackathon
docker-compose down

echo -e "\n${BLUE}🗑️  Step 3: Removing PostgreSQL volume...${NC}"
docker volume rm cs-club-hackathon_postgres_data 2>/dev/null || \
    docker volume rm programming_contest_postgres_data 2>/dev/null || \
    echo -e "${YELLOW}⚠️  Volume might not exist${NC}"

echo -e "\n${BLUE}🔧 Step 4: Verifying docker-compose.yml credentials...${NC}"
if grep -q "POSTGRES_USER: $DB_USER" docker-compose.yml && \
   grep -q "POSTGRES_PASSWORD: $DB_PASSWORD" docker-compose.yml; then
    echo -e "${GREEN}✅ Credentials in docker-compose.yml are correct${NC}"
else
    echo -e "${RED}❌ Credentials in docker-compose.yml don't match!${NC}"
    echo -e "${YELLOW}Please update docker-compose.yml manually.${NC}"
    exit 1
fi

echo -e "\n${BLUE}🚀 Step 5: Starting PostgreSQL container...${NC}"
docker-compose up -d postgres

echo -e "\n${BLUE}⏳ Waiting for PostgreSQL to be ready (30 seconds)...${NC}"
sleep 30

# Wait for PostgreSQL to be healthy
echo -e "${BLUE}🔍 Checking PostgreSQL health...${NC}"
for i in {1..10}; do
    if docker exec programming_contest_postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    echo -e "${YELLOW}Waiting... ($i/10)${NC}"
    sleep 5
done

echo -e "\n${BLUE}📊 Step 6: Verifying database connection...${NC}"
if docker exec programming_contest_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo -e "${YELLOW}Checking PostgreSQL logs:${NC}"
    docker logs programming_contest_postgres --tail 30
    exit 1
fi

# Restore backup if it exists
if [ -n "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo -e "\n${BLUE}📥 Step 7: Restoring database from backup...${NC}"
    if docker exec -i programming_contest_postgres psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
        echo -e "${BLUE}Backup file saved at: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Failed to restore database!${NC}"
        echo -e "${YELLOW}Backup file saved at: $BACKUP_FILE${NC}"
        echo -e "${YELLOW}You can manually restore it later if needed.${NC}"
    fi
else
    echo -e "\n${YELLOW}⏭️  Step 7: Skipped (no backup to restore)${NC}"
    echo -e "${BLUE}Running init.sql to create tables...${NC}"
    # The init.sql should have run automatically, but let's verify
    sleep 5
fi

echo -e "\n${BLUE}🚀 Step 8: Starting all containers...${NC}"
docker-compose up -d

echo -e "\n${BLUE}⏳ Waiting for all services to start (20 seconds)...${NC}"
sleep 20

echo -e "\n${BLUE}📊 Step 9: Checking backend connection...${NC}"
docker logs programming_contest_backend --tail 30

echo -e "\n${BLUE}🔍 Step 10: Verifying no authentication errors...${NC}"
if docker logs programming_contest_postgres --tail 50 | grep -i "authentication failed"; then
    echo -e "${YELLOW}⚠️  Still seeing authentication errors:${NC}"
    docker logs programming_contest_postgres --tail 20
else
    echo -e "${GREEN}✅ No authentication errors found!${NC}"
fi

echo -e "\n${GREEN}=================================="
echo -e "✅ Database fix completed!"
echo -e "==================================${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Check if backend is connecting successfully:"
echo -e "   ${YELLOW}docker logs programming_contest_backend --tail 20${NC}"
echo -e ""
echo -e "2. Test the API health endpoint:"
echo -e "   ${YELLOW}curl http://localhost:3000/api/health${NC}"
echo -e ""
echo -e "3. Monitor PostgreSQL logs for any issues:"
echo -e "   ${YELLOW}docker logs -f programming_contest_postgres${NC}"

if [ -n "$BACKUP_FILE" ]; then
    echo -e ""
    echo -e "${BLUE}📦 Database backup saved at:${NC}"
    echo -e "   ${YELLOW}$BACKUP_FILE${NC}"
fi
