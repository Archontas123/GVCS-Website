/**
 * Migration: Add judging system columns to submissions table
 * Phase 4.2: ICPC-style Judging Engine
 */

exports.up = function(knex) {
  return knex.schema.table('submissions', function(table) {
    // Add verdict column if it doesn't exist
    table.string('verdict', 50).defaultTo('Pending');
    
    // Add judge details JSON column if it doesn't exist  
    table.json('judge_details').nullable();
    
    // Add judged timestamp
    table.timestamp('judged_at').nullable();
    
    // Add indexes for performance
    table.index('verdict');
    table.index('judged_at');
  }).then(() => {
    // Create team_scores table if it doesn't exist
    return knex.schema.hasTable('team_scores').then(function(exists) {
      if (!exists) {
        return knex.schema.createTable('team_scores', function(table) {
          table.increments('score_id').primary();
          table.integer('contest_id').unsigned().references('contest_id').inTable('contests');
          table.integer('team_id').unsigned().references('team_id').inTable('teams');
          table.integer('problem_id').unsigned().references('problem_id').inTable('problems');
          table.boolean('solved').defaultTo(false);
          table.integer('attempts').defaultTo(0);
          table.integer('solve_time').defaultTo(0); // Minutes from contest start
          table.integer('penalty').defaultTo(0);   // Penalty minutes
          table.boolean('first_solve').defaultTo(false);
          table.timestamps(true, true);
          
          // Composite unique constraint
          table.unique(['contest_id', 'team_id', 'problem_id']);
          
          // Indexes
          table.index('contest_id');
          table.index(['contest_id', 'team_id']);
          table.index(['contest_id', 'problem_id']);
          table.index('solved');
          table.index('first_solve');
        });
      }
    });
  });
};

exports.down = function(knex) {
  return knex.schema.table('submissions', function(table) {
    table.dropColumn('verdict');
    table.dropColumn('judge_details');
    table.dropColumn('judged_at');
  }).then(() => {
    return knex.schema.dropTableIfExists('team_scores');
  });
};