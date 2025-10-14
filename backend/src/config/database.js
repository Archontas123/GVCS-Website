/**
 * @fileoverview Database configuration for the Programming Contest Platform.
 * Provides Knex.js database configuration for multiple environments (development,
 * test, production) with PostgreSQL as the database client. Supports both direct
 * connection parameters and DATABASE_URL connection strings.
 * 
 * Configuration Features:
 * - Environment-specific database configurations
 * - PostgreSQL connection pooling with optimized settings
 * - Migration and seed directory configuration
 * - Environment variable support with secure defaults
 * - Connection string and object-based connection support
 * - Separate test database configuration to prevent data conflicts
 * 
 * @module src/config/database
 * @requires ./env
 * @requires path
 * @author Programming Contest Platform Team
 * @version 1.5.0
 */

require('./env');
const path = require('path');

/**
 * Default PostgreSQL connection configuration.
 * Used as fallback when DATABASE_URL environment variable is not provided.
 * All connection parameters can be overridden via environment variables.
 * 
 * @constant {Object} defaultConnection - Default database connection parameters
 * @property {string} host - Database host from DB_HOST or 'localhost'
 * @property {number} port - Database port from DB_PORT or 5432
 * @property {string} database - Database name from DB_NAME or 'programming_contest_db'
 * @property {string} user - Database username from DB_USER or 'contest_user'
 * @property {string} password - Database password from DB_PASSWORD or 'contest_password'
 */
const defaultConnection = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hackathon_db',
  user: process.env.DB_USER || 'hackathon_user',
  password: process.env.DB_PASSWORD || 'hackathon_password'
};

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || defaultConnection,
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  },

  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      database: process.env.TEST_DB_NAME || 'programming_contest_test_db',
      user: process.env.TEST_DB_USER || 'contest_user',
      password: process.env.TEST_DB_PASSWORD || 'contest_password'
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || defaultConnection,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  }
};
