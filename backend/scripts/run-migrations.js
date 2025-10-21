/**
 * Database Migration Runner Script
 *
 * This script runs all pending database migrations.
 * Can be executed manually on production to ensure schema is up to date.
 *
 * Usage:
 *   node scripts/run-migrations.js
 *
 * Or via Docker:
 *   docker compose exec backend node scripts/run-migrations.js
 */

require('../src/config/env');
const knex = require('knex');
const config = require('../src/config/database');

const environment = process.env.NODE_ENV || 'production';
const db = knex(config[environment]);

async function runMigrations() {
  console.log('=========================================');
  console.log('Database Migration Runner');
  console.log('=========================================\n');

  console.log(`Environment: ${environment}`);
  console.log(`Database: ${config[environment].connection.database || 'from DATABASE_URL'}\n`);

  try {
    // Check current migration status
    console.log('📋 Checking current migration status...\n');
    const [currentBatch, completedMigrations] = await db.migrate.currentVersion();
    console.log(`Current migration version: ${currentBatch || 'none'}`);

    if (completedMigrations && completedMigrations.length > 0) {
      console.log('\nCompleted migrations:');
      completedMigrations.forEach((migration, index) => {
        console.log(`  ${index + 1}. ${migration}`);
      });
    }

    // Run pending migrations
    console.log('\n🔄 Running pending migrations...\n');
    const [batch, migrations] = await db.migrate.latest();

    if (migrations.length === 0) {
      console.log('✅ No pending migrations. Database is up to date!');
    } else {
      console.log(`✅ Successfully applied ${migrations.length} migration(s) (batch ${batch}):\n`);
      migrations.forEach((migration, index) => {
        console.log(`  ${index + 1}. ${migration}`);
      });
    }

    console.log('\n=========================================');
    console.log('Migration complete!');
    console.log('=========================================');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('\nFull error:', error);
    }
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run migrations
runMigrations();
