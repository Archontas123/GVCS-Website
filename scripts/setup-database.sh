#!/bin/bash

# Database Setup Script for Hackathon Platform
# This script sets up PostgreSQL using Docker Compose

set -e

echo "🚀 Setting up Hackathon Platform Database..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Start PostgreSQL and Redis containers
echo "📦 Starting PostgreSQL and Redis containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec hackathon_postgres pg_isready -U hackathon_user -d hackathon_db; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Test connection
echo "🔗 Testing database connection..."
docker exec hackathon_postgres psql -U hackathon_user -d hackathon_db -c "SELECT 'Connection successful!' as status;"

echo "✅ Database setup completed successfully!"
echo ""
echo "📋 Connection Details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: hackathon_db"
echo "  Username: hackathon_user"
echo "  Password: hackathon_password"
echo ""
echo "🔗 Connection URL: postgresql://hackathon_user:hackathon_password@localhost:5432/hackathon_db"