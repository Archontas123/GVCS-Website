const axios = require('axios');

// Test the contest update endpoint
async function testContestUpdate() {
  try {
    // First, let's login as admin to get a token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/admin/login', {
      username: 'admin',
      password: 'password123'
    });

    if (!loginResponse.data.success || !loginResponse.data.data.token) {
      console.error('❌ Failed to login:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Get existing contests to find one to update
    console.log('📋 Fetching contests...');
    const contestsResponse = await axios.get('http://localhost:3000/api/admin/contests', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!contestsResponse.data.success || contestsResponse.data.data.length === 0) {
      console.log('⚠️ No contests found to update');
      return;
    }

    const firstContest = contestsResponse.data.data[0];
    console.log('✅ Found contest:', firstContest.contest_name);

    // Test updating the contest with the correct field names
    console.log('🔄 Testing contest update...');
    const updateData = {
      contest_name: firstContest.contest_name + ' (Updated)',
      description: firstContest.description + ' - Updated via test',
      start_time: firstContest.start_time,
      duration: firstContest.duration,
      freeze_time: firstContest.freeze_time,
      is_registration_open: firstContest.is_registration_open,
      is_active: firstContest.is_active
    };

    const updateResponse = await axios.put(
      `http://localhost:3000/api/admin/contests/${firstContest.id}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (updateResponse.data.success) {
      console.log('✅ Contest update successful!');
      console.log('Updated contest:', updateResponse.data.data.contest_name);
    } else {
      console.error('❌ Contest update failed:', updateResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testContestUpdate();