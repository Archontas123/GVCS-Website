#!/bin/bash

# Script to check existing admin users on production

echo "=== Checking Admin Users in Production Database ==="
echo ""

# Check if docker containers are running
echo "1. Checking if containers are running..."
sudo docker compose ps | grep postgres

echo ""
echo "2. Querying admin users in database..."
sudo docker compose exec postgres psql -U hackathon_user -d hackathon_db -c "SELECT id, username, email, role, created_at FROM admin_users ORDER BY id;"

echo ""
echo "3. Count of admin users:"
sudo docker compose exec postgres psql -U hackathon_user -d hackathon_db -c "SELECT COUNT(*) as admin_count FROM admin_users;"
