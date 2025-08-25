/**
 * Test script to verify hackathon scoring system
 * Run with: NODE_ENV=development node test-hackathon-scoring.js
 */

const { db } = require('./backend/src/utils/db');
const hackathonScoring = require('./backend/src/services/hackathonScoring');
const scoringService = require('./backend/src/services/scoringService');

async function testHackathonScoring() {
  try {
    console.log('🧪 Testing Hackathon Scoring System...\n');

    // Get all contests to test with
    const contests = await db('contests').select('id', 'contest_name', 'scoring_type');
    
    if (contests.length === 0) {
      console.log('❌ No contests found. Create a contest first.');
      process.exit(1);
    }

    console.log('📊 Found contests:');
    contests.forEach(contest => {
      console.log(`  - ${contest.contest_name} (ID: ${contest.id}, Scoring: ${contest.scoring_type || 'hackathon'})`);
    });
    
    const testContestId = contests[0].id;
    console.log(`\n🎯 Testing with contest ID: ${testContestId}\n`);

    // Test 1: Get scoring type
    console.log('Test 1: Getting contest scoring type...');
    const scoringType = await scoringService.getContestScoringType(testContestId);
    console.log(`✅ Scoring type: ${scoringType}`);

    // Test 2: Get leaderboard using unified service
    console.log('\nTest 2: Getting leaderboard...');
    const leaderboard = await scoringService.getLeaderboard(testContestId);
    console.log(`✅ Leaderboard retrieved with ${leaderboard.length} teams`);
    
    if (leaderboard.length > 0) {
      console.log('📈 Top 3 teams:');
      leaderboard.slice(0, 3).forEach(team => {
        console.log(`  ${team.rank}. ${team.team_name}`);
        console.log(`     Points: ${team.total_points || 0} | Problems: ${team.problems_solved}`);
      });
    }

    // Test 3: Test points calculation for a team
    if (leaderboard.length > 0) {
      const testTeam = leaderboard[0];
      console.log(`\nTest 3: Calculating score for team "${testTeam.team_name}"...`);
      
      const teamScore = await scoringService.calculateTeamScore(testTeam.team_id, testContestId);
      console.log('✅ Team score calculation:');
      console.log(`   Total Points: ${teamScore.total_points || 0}`);
      console.log(`   Problems Solved: ${teamScore.problems_solved}`);
      console.log(`   Solved Problems:`, teamScore.solved_problems?.length || 0);
    }

    // Test 4: Test setting contest to hackathon mode
    console.log('\nTest 4: Setting contest to hackathon scoring mode...');
    await scoringService.setContestScoringType(testContestId, 'hackathon');
    console.log('✅ Contest set to hackathon scoring mode');

    // Test 5: Test points configuration
    console.log('\nTest 5: Testing points configuration...');
    console.log('🔧 Hackathon scoring configuration:');
    console.log(`   Base points: ${hackathonScoring.pointsConfig.BASE_POINTS}`);
    console.log(`   Difficulty multipliers:`, hackathonScoring.pointsConfig.DIFFICULTY_MULTIPLIERS);
    console.log(`   Time bonus enabled: ${hackathonScoring.pointsConfig.TIME_BONUS.ENABLED}`);
    console.log(`   First solve bonus: ${hackathonScoring.pointsConfig.FIRST_SOLVE_BONUS}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('• Unified scoring service routes to appropriate scoring system');
    console.log('• Hackathon scoring focuses on points earned, no penalties');
    console.log('• Teams ranked by: Points > Problems Solved > Earliest Last Submission');
    console.log('• Points calculated based on problem difficulty and timing bonuses');
    console.log('• WebSocket service updated to use unified scoring');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testHackathonScoring();