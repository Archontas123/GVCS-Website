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
  const [admin] = await knex('admins').insert([
    {
      username: 'admin',
      email: 'admin@school.edu',
      password_hash: passwordHash,
      role: 'super_admin'
    }
  ]).returning('id');

  // Insert sample contest
  const contestStartTime = new Date();
  contestStartTime.setHours(contestStartTime.getHours() + 1); // Start 1 hour from now
  
  const [contest] = await knex('contests').insert([
    {
      contest_name: 'Sample Algorithmic Contest',
      description: 'A sample contest for testing the platform',
      registration_code: 'SAMPLE2024',
      start_time: contestStartTime,
      duration: 180, // 3 hours
      freeze_time: 60,
      created_by: admin.id,
      is_active: true,
      is_registration_open: true
    }
  ]).returning('id');

  // Insert sample problems
  const problems = await knex('problems').insert([
    {
      contest_id: contest.id,
      problem_letter: 'A',
      title: 'Hello World',
      description: 'Write a program that prints "Hello, World!" to the console.',
      input_format: 'No input required.',
      output_format: 'Print "Hello, World!" on a single line.',
      sample_input: '',
      sample_output: 'Hello, World!',
      constraints: 'No constraints.',
      time_limit: 1000,
      memory_limit: 256,
      difficulty: 'easy'
    },
    {
      contest_id: contest.id,
      problem_letter: 'B',
      title: 'Sum of Two Numbers',
      description: 'Given two integers A and B, compute their sum.',
      input_format: 'Two integers A and B on a single line, separated by a space.',
      output_format: 'Print the sum A + B on a single line.',
      sample_input: '3 5',
      sample_output: '8',
      constraints: '1 ≤ A, B ≤ 1000',
      time_limit: 1000,
      memory_limit: 256,
      difficulty: 'easy'
    },
    {
      contest_id: contest.id,
      problem_letter: 'C',
      title: 'Maximum of Array',
      description: 'Given an array of N integers, find the maximum element.',
      input_format: 'First line contains N. Second line contains N integers separated by spaces.',
      output_format: 'Print the maximum element on a single line.',
      sample_input: '5\n1 3 7 2 9',
      sample_output: '9',
      constraints: '1 ≤ N ≤ 100, 1 ≤ elements ≤ 1000',
      time_limit: 2000,
      memory_limit: 256,
      difficulty: 'medium'
    }
  ]).returning('id');

  // Insert test cases for problems
  await knex('test_cases').insert([
    // Problem A test cases
    {
      problem_id: problems[0].id,
      input: '',
      expected_output: 'Hello, World!',
      is_sample: true
    },
    // Problem B test cases
    {
      problem_id: problems[1].id,
      input: '3 5',
      expected_output: '8',
      is_sample: true
    },
    {
      problem_id: problems[1].id,
      input: '10 20',
      expected_output: '30',
      is_sample: false
    },
    {
      problem_id: problems[1].id,
      input: '1 1',
      expected_output: '2',
      is_sample: false
    },
    // Problem C test cases
    {
      problem_id: problems[2].id,
      input: '5\n1 3 7 2 9',
      expected_output: '9',
      is_sample: true
    },
    {
      problem_id: problems[2].id,
      input: '3\n10 5 8',
      expected_output: '10',
      is_sample: false
    },
    {
      problem_id: problems[2].id,
      input: '1\n42',
      expected_output: '42',
      is_sample: false
    }
  ]);

  // Insert sample teams
  const teams = await knex('teams').insert([
    {
      team_name: 'Code Warriors',
      contest_code: 'SAMPLE2024',
      session_token: 'sample_token_1',
      is_active: true
    },
    {
      team_name: 'Algorithm Masters',
      contest_code: 'SAMPLE2024', 
      session_token: 'sample_token_2',
      is_active: true
    },
    {
      team_name: 'Debug Demons',
      contest_code: 'SAMPLE2024',
      session_token: 'sample_token_3', 
      is_active: true
    }
  ]).returning('id');

  // Register teams for contest
  await knex('team_contests').insert([
    { team_id: teams[0].id, contest_id: contest.id },
    { team_id: teams[1].id, contest_id: contest.id },
    { team_id: teams[2].id, contest_id: contest.id }
  ]);

  // Initialize contest results
  await knex('contest_results').insert([
    {
      contest_id: contest.id,
      team_id: teams[0].id,
      problems_solved: 0,
      penalty_time: 0,
      rank: 1
    },
    {
      contest_id: contest.id,
      team_id: teams[1].id,
      problems_solved: 0,
      penalty_time: 0,
      rank: 1
    },
    {
      contest_id: contest.id,
      team_id: teams[2].id,
      problems_solved: 0,
      penalty_time: 0,
      rank: 1
    }
  ]);
};