const knex = require('knex');
const config = require('../config/database');

/** @constant {string} Current application environment */
const environment = process.env.NODE_ENV || 'development';

/** @constant {Object} Knex database instance configured for current environment */
const db = knex(config[environment]);

/**
 * Tests the database connection by executing a simple query.
 * @async
 * @function testConnection
 * @returns {Promise<boolean>} True if connection is successful
 * @throws {Error} Database connection error
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
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  db,
  testConnection
};