/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // First, update all existing super_admins to admin role
    await trx('admins')
      .where('role', 'super_admin')
      .update({ role: 'admin' });
    
    // Update all existing judges to admin role as well
    await trx('admins')
      .where('role', 'judge')
      .update({ role: 'admin' });
    
    // Now alter the table to change the enum to only have 'admin'
    // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
    
    // Create temporary table with new schema
    await trx.schema.createTable('admins_new', function(table) {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.enum('role', ['admin']).defaultTo('admin');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['username']);
      table.index(['email']);
    });
    
    // Copy data to new table
    await trx.raw(`
      INSERT INTO admins_new (id, username, email, password_hash, role, created_at)
      SELECT id, username, email, password_hash, 'admin', created_at
      FROM admins
    `);
    
    // Drop old table
    await trx.schema.dropTable('admins');
    
    // Rename new table
    await trx.schema.renameTable('admins_new', 'admins');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Recreate the original table structure with super_admin and judge roles
    await trx.schema.createTable('admins_new', function(table) {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.enum('role', ['super_admin', 'judge']).defaultTo('judge');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['username']);
      table.index(['email']);
    });
    
    // Copy data back, converting all admin roles to super_admin
    await trx.raw(`
      INSERT INTO admins_new (id, username, email, password_hash, role, created_at)
      SELECT id, username, email, password_hash, 'super_admin', created_at
      FROM admins
    `);
    
    // Drop current table
    await trx.schema.dropTable('admins');
    
    // Rename new table
    await trx.schema.renameTable('admins_new', 'admins');
  });
};