/**
 * Simple validation script for Programming Contest Scoring
 */

const scoringService = require('../services/scoringService');
const { db } = require('../utils/db');

async function validateScoring() {
  try {
    console.log('🧪 Testing Programming Contest Scoring System...');
    
    // Test with test database
    process.env.NODE_ENV = 'test';
    
    // Simple test - check if we can calculate score for non-existent team
    console.log('Testing with non-existent team...');
    const result = await scoringService.calculateTeamScore(999, 999);
    console.log('✅ Non-existent team result:', result);
    
    console.log('✅ Programming Contest Scoring system basic validation passed!');
    await db.destroy();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

validateScoring();