const knex = require('knex');
const config = require('../config/database');

/** @constant {string} Current application environment */
const environment = process.env.NODE_ENV || 'development';

/** @constant {Object} Knex database instance configured for current environment */
const db = knex(config[environment]);

/** Tracks whether migrations have already been executed for this process */
let migrationsEnsured = false;

/**
 * Runs any outstanding database migrations exactly once per process.
 * Ensures new columns (e.g. contests.manual_control) exist before services run.
 *
 * @async
 * @function ensureMigrations
 * @returns {Promise<boolean>} True when migrations are up to date
 * @throws {Error} When migrations fail to apply
 */
const ensureMigrations = async () => {
  if (migrationsEnsured) {
    return true;
  }

  try {
    const [batch, migrations] = await db.migrate.latest();
    migrationsEnsured = true;

    if (migrations.length > 0) {
      console.log(`? Applied database migrations (batch ${batch}): ${migrations.join(', ')}`);
    } else {
      console.log('? Database migrations already up to date');
    }

    return true;
  } catch (error) {
    console.error('? Database migration failed:', error.message);
    throw error;
  }
};

/**
 * Tests the database connection and ensures schema migrations are applied.
 * @async
 * @function testConnection
 * @returns {Promise<boolean>} True if connection and migrations succeed
 * @throws {Error} Database connection or migration error
 * @example
 * try {
 *   await testConnection();
 *   console.log('Database is ready');
 * } catch (error) {
 *   console.error('Database connection failed:', error);
 * }
 */
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('? Database connection successful');
  } catch (error) {
    console.error('? Database connection failed:', error.message);
    throw error;
  }

  await ensureMigrations();
  return true;
};

module.exports = {
  db,
  testConnection,
  ensureMigrations
};
