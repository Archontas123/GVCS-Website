/**
 * Clean database script - removes all data from tables
 * Run with: node scripts/clean-database.js
 */

const knex = require('knex');
const path = require('path');

// Load knexfile
const knexConfig = require(path.join(__dirname, '..', 'knexfile.js'));
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

const db = knex(config);

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  try {
    // Delete data in reverse order of dependencies
    await db('submissions').del();
    console.log('✓ Cleared submissions');

    await db('test_cases').del();
    console.log('✓ Cleared test_cases');

    await db('problems').del();
    console.log('✓ Cleared problems');

    await db('teams').del();
    console.log('✓ Cleared teams');

    await db('contests').del();
    console.log('✓ Cleared contests');

    await db('admin_users').del();
    console.log('✓ Cleared admin_users');

    console.log('\n✅ Database cleaned successfully!');
    console.log('\nNow you can run:');
    console.log('  npm run db:migrate');
    console.log('  npm run db:seed');
    console.log('\nOr just run:');
    console.log('  npm run db:fresh');

  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

cleanDatabase();
