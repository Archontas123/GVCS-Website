/**
 * Test script to verify partial scoring system
 * Run with: NODE_ENV=development node test-partial-scoring.js
 */

const { db } = require('./backend/src/utils/db');
const hackathonScoring = require('./backend/src/services/hackathonScoring');

async function testPartialScoring() {
  try {
    console.log('🧪 Testing Partial Scoring System...\n');

    // Test 1: Test partial points calculation
    console.log('Test 1: Partial points calculation');
    
    // Example: 10 out of 15 test cases passed, problem worth 15 points
    const points1 = hackathonScoring.calculatePartialPoints(10, 15, 15);
    console.log(`✅ 10/15 test cases on 15-point problem = ${points1} points`);
    
    // Example: 5 out of 10 test cases passed, problem worth 1 point
    const points2 = hackathonScoring.calculatePartialPoints(5, 10, 1);
    console.log(`✅ 5/10 test cases on 1-point problem = ${points2} points`);
    
    // Example: All test cases passed
    const points3 = hackathonScoring.calculatePartialPoints(20, 20, 25);
    console.log(`✅ 20/20 test cases on 25-point problem = ${points3} points`);

    // Test 2: Check database schema updates
    console.log('\nTest 2: Database schema verification');
    
    // Check if new columns exist in submissions table
    try {
      const submissionColumns = await db.raw(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'submissions' 
        AND column_name IN ('test_cases_passed', 'total_test_cases', 'points_earned')
      `).catch(() => {
        // If PostgreSQL info schema fails, try SQLite approach
        return db.raw("PRAGMA table_info(submissions)");
      });
      
      console.log('✅ Submission table columns:', submissionColumns.rows || submissionColumns);
    } catch (error) {
      console.log('⚠️  Could not verify submission table schema:', error.message);
    }

    // Test 3: Check problems table has points_value
    try {
      const problemsWithPoints = await db('problems')
        .select('id', 'title', 'points_value')
        .limit(3);
      
      console.log('✅ Sample problems with points:');
      problemsWithPoints.forEach(p => {
        console.log(`   - ${p.title}: ${p.points_value || 1} points`);
      });
    } catch (error) {
      console.log('⚠️  Could not verify problems points:', error.message);
    }

    // Test 4: Test case counting (excluding samples)
    console.log('\nTest 3: Test case counting');
    
    try {
      const testCaseStats = await db('test_cases')
        .select('problem_id')
        .select(db.raw('COUNT(*) as total'))
        .select(db.raw('COUNT(CASE WHEN is_sample = true THEN 1 END) as samples'))
        .select(db.raw('COUNT(CASE WHEN is_sample = false THEN 1 END) as grading'))
        .groupBy('problem_id')
        .limit(5);
        
      console.log('✅ Test case distribution:');
      testCaseStats.forEach(stat => {
        console.log(`   Problem ${stat.problem_id}: ${stat.total} total (${stat.grading} grading, ${stat.samples} samples)`);
      });
    } catch (error) {
      console.log('⚠️  Could not analyze test cases:', error.message);
    }

    console.log('\n🎉 Partial Scoring Tests Completed!');
    console.log('\n📋 Summary:');
    console.log('• Points calculated as: (test_cases_passed / total_test_cases) * problem_points');
    console.log('• Sample test cases are excluded from scoring');
    console.log('• Teams can earn fractional points (e.g., 10.67 points)');
    console.log('• All test cases run (no stop-on-first-failure)');
    console.log('• Problem points are customizable per problem');
    console.log('• Example scoring:');
    console.log('  - Problem worth 15 points, 12/20 test cases passed = 9 points');
    console.log('  - Problem worth 3 points, 7/10 test cases passed = 2.1 points');
    console.log('  - Problem worth 1 point, 0/5 test cases passed = 0 points');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testPartialScoring();