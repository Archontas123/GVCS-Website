#!/bin/bash

# CS Club Hackathon Platform - Quick Update Script
# Use this to quickly update the running application

set -e

cd /opt/cs-club-hackathon

echo "Pulling latest changes..."
git pull origin master

echo "Rebuilding containers..."
docker-compose -f docker-compose.prod.yml build

echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "Running migrations..."
sleep 5
docker exec cs_club_backend npm run migrate

echo "Update complete!"
docker-compose -f docker-compose.prod.yml ps
