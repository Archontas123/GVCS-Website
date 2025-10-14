/**
 * Force recreate database script - terminates connections and recreates
 * Run with: node scripts/force-recreate-database.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function forceRecreateDatabase() {
  const dbName = process.env.DB_NAME || 'hackathon_db';
  const dbUser = process.env.DB_USER || 'hackathon_user';
  const dbPassword = process.env.DB_PASSWORD || 'hackathon_password';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;

  // Connect to postgres database (not the target database)
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL');

    // Terminate all connections to the database
    console.log(`🔌 Terminating all connections to '${dbName}'...`);
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
    `);
    console.log('✓ Connections terminated');

    // Drop existing database
    console.log(`🗑️  Dropping database '${dbName}'...`);
    await client.query(`DROP DATABASE IF EXISTS ${dbName};`);
    console.log('✓ Database dropped');

    // Create new database
    console.log(`🆕 Creating database '${dbName}'...`);
    await client.query(`CREATE DATABASE ${dbName};`);
    console.log('✓ Database created');

    console.log('\n✅ Database recreated successfully!');
    console.log('\nNext steps:');
    console.log('  npm run db:migrate');
    console.log('  npm run db:seed');

  } catch (error) {
    console.error('❌ Error recreating database:', error.message);
    console.error('\nFull error details:', error);
    console.error('\nTry closing any applications connected to the database:');
    console.error('  - Stop your backend server if running');
    console.error('  - Close any database GUI tools (pgAdmin, DBeaver, etc.)');
    console.error('  - Close any other terminal sessions running database commands');
    process.exit(1);
  } finally {
    await client.end();
  }
}

forceRecreateDatabase();
