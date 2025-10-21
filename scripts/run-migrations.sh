#!/bin/bash

# Script to manually run database migrations on production
# Usage: ./scripts/run-migrations.sh

set -e

echo "========================================="
echo "Running Database Migrations"
echo "========================================="
echo ""

# Check if running in production
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo "This script must be run from the project root directory."
  exit 1
fi

echo "📋 Current migration status:"
sudo docker compose exec backend npx knex migrate:status --knexfile /app/knexfile.js

echo ""
echo "🔄 Running latest migrations..."
sudo docker compose exec backend npx knex migrate:latest --knexfile /app/knexfile.js

echo ""
echo "✅ Migration complete!"
echo ""

echo "📋 Updated migration status:"
sudo docker compose exec backend npx knex migrate:status --knexfile /app/knexfile.js

echo ""
echo "========================================="
echo "Migration process finished!"
echo "========================================="
