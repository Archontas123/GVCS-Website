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

  // Generate admin password hash using the .env ADMIN_PASSWORD
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 12);

  // Insert admin user
  await knex('admin_users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'admin@csclub.com',
      password_hash: adminPasswordHash,
      role: 'super_admin'
    }
  ]);

  // Insert two contests
  const contestDate = new Date();
  contestDate.setDate(contestDate.getDate() + 7); // Next week
  const endDate = new Date(contestDate);
  endDate.setHours(endDate.getHours() + 3); // 3 hours duration

  await knex('contests').insert([
    {
      id: 1,
      contest_name: 'Beginner Qual',
      description: 'Qualification round for beginner programmers',
      registration_code: 'BEGINQUAL',
      start_time: contestDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: 180, // 3 hours
      freeze_time: 60, // 1 hour before end
      is_active: false,
      is_registration_open: true,
      is_frozen: false,
      scoring_type: 'icpc',
      created_by: 1
    },
    {
      id: 2,
      contest_name: 'Advanced Qual',
      description: 'Qualification round for advanced programmers',
      registration_code: 'ADVQUAL',
      start_time: contestDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: 180, // 3 hours
      freeze_time: 60, // 1 hour before end
      is_active: false,
      is_registration_open: true,
      is_frozen: false,
      scoring_type: 'icpc',
      created_by: 1
    }
  ]);

  console.log('✓ Sample data seeded successfully');
  console.log('✓ Admin user: admin (password: AdminPass123!)');
  console.log('✓ Contests: Beginner Qual (BEGINQUAL), Advanced Qual (ADVQUAL)');
};
