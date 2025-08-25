/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');
  
  // Clean existing data in reverse order of dependencies
  await knex('contest_results').del();
  await knex('team_contests').del();
  await knex('submissions').del();
  await knex('test_cases').del();
  await knex('problems').del();
  await knex('teams').del();
  await knex('contests').del();
  await knex('admins').del();

  // Generate proper password hash for 'password123'
  const passwordHash = await bcrypt.hash('password123', 12);

  // Insert sample admin
  await knex('admins').insert([
    {
      username: 'admin',
      email: 'admin@school.edu',
      password_hash: passwordHash,
      role: 'admin'
    }
  ]);
};