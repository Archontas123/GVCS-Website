const { db } = require('../utils/db');

beforeAll(async () => {
  // Ensure test database is using correct environment
  process.env.NODE_ENV = 'test';
  
  try {
    // Test database connection
    await db.raw('SELECT 1');
  } catch (error) {
    console.error('Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up database connection
  if (db) {
    await db.destroy();
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);