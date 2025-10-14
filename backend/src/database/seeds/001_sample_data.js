/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');

  // Clean existing data in reverse order of dependencies
  await knex('submissions').del();
  await knex('test_cases').del();
  await knex('problems').del();
  await knex('teams').del();
  await knex('contests').del();
  await knex('admin_users').del();

  // Generate proper password hashes
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 12);
  const superAdminPasswordHash = await bcrypt.hash('AdminPass123!', 12);

  // Insert admin users (matching ADMIN_TEST_DATA from tests)
  await knex('admin_users').insert([
    {
      id: 1,
      username: 'superadmin',
      email: 'superadmin@school.edu',
      password_hash: superAdminPasswordHash,
      role: 'super_admin'
    },
    {
      id: 2,
      username: 'admin',
      email: 'admin@school.edu',
      password_hash: adminPasswordHash,
      role: 'admin'
    }
  ]);

  // Insert test contests (for team registration testing)
  const contestDate = new Date();
  contestDate.setDate(contestDate.getDate() + 7); // Next week
  const endDate = new Date(contestDate);
  endDate.setHours(endDate.getHours() + 3); // 3 hours duration

  await knex('contests').insert([
    {
      contest_name: 'CS Club Spring Programming Contest 2024',
      description: 'Spring programming contest for E2E testing',
      registration_code: 'SPRING24',
      start_time: contestDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: 180, // 3 hours
      freeze_time: 60, // 1 hour before end
      is_active: false,
      is_registration_open: true,
      is_frozen: false,
      scoring_type: 'icpc',
      created_by: 1 // Created by superadmin
    },
    {
      contest_name: 'Test Contest for E2E',
      description: 'Contest specifically for E2E testing',
      registration_code: 'TESTCODE',
      start_time: contestDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: 120, // 2 hours
      freeze_time: 30,
      is_active: false,
      is_registration_open: true,
      is_frozen: false,
      scoring_type: 'icpc',
      created_by: 1 // Created by superadmin
    },
    {
      contest_name: 'Registration Test Contest',
      description: 'Contest for testing team registration workflow',
      registration_code: 'REGTEST1',
      start_time: contestDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: 180,
      freeze_time: 60,
      is_active: false,
      is_registration_open: true,
      is_frozen: false,
      scoring_type: 'icpc',
      created_by: 2 // Created by admin
    }
  ]);

  // Insert test teams for E2E testing
  const teamPasswordHash = await bcrypt.hash('SecurePass123!', 12);

  await knex('teams').insert([
    {
      team_name: 'MIT_Smith',
      contest_code: 'SPRING24',
      password_hash: teamPasswordHash,
      school_name: 'MIT',
      email: 'mit_smith@school.edu',
      member_names: JSON.stringify(['John Smith', 'Jane Doe', 'Bob Johnson']),
      session_token: null,
      registered_at: knex.fn.now(),
      last_activity: knex.fn.now(),
      is_active: true
    },
    {
      team_name: 'Stanford_Brown',
      contest_code: 'SPRING24',
      password_hash: await bcrypt.hash('StrongPassword456!', 12),
      school_name: 'Stanford',
      email: 'stanford_brown@school.edu',
      member_names: JSON.stringify(['Alice Brown', 'Charlie Prince', 'David Wilson']),
      session_token: null,
      registered_at: knex.fn.now(),
      last_activity: knex.fn.now(),
      is_active: true
    },
    {
      team_name: 'Harvard_Adams',
      contest_code: 'SPRING24',
      password_hash: await bcrypt.hash('MyPassword789!', 12),
      school_name: 'Harvard',
      email: 'harvard_adams@school.edu',
      member_names: JSON.stringify(['Emma Adams', 'Michael Wilson']),
      session_token: null,
      registered_at: knex.fn.now(),
      last_activity: knex.fn.now(),
      is_active: true
    }
  ]);

  console.log('✓ Sample data seeded successfully');
  console.log('✓ Admin users: superadmin/admin (password: AdminPass123!)');
  console.log('✓ Test contests: SPRING24, TESTCODE, REGTEST1');
  console.log('✓ Test teams: MIT_Smith, Stanford_Brown, Harvard_Adams (passwords from test data)');
};