/**
 * Recreate database script - drops and recreates the database
 * Run with: node scripts/recreate-database.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function recreateDatabase() {
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
    process.exit(1);
  } finally {
    await client.end();
  }
}

recreateDatabase();
