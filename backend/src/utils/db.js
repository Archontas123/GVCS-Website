const knex = require('knex');
const config = require('../config/database');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

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