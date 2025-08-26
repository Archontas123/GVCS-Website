/**
 * Simplify admin roles to just use 'admin'
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop the existing role constraint first
    await trx.raw('ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check');
    
    // Update any existing admin records to use 'admin' role
    await trx('admins').update({ role: 'admin' });
    
    // Add new constraint that only allows 'admin'
    await trx.raw("ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role = 'admin')");
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop the simplified constraint
    await trx.raw('ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check');
    
    // Restore the original constraint with super_admin and judge
    await trx.raw("ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role = ANY (ARRAY['super_admin'::text, 'judge'::text]))");
    
    // Update existing records back to super_admin (since we can't know the original)
    await trx('admins').update({ role: 'super_admin' });
  });
};