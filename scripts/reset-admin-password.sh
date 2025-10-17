#!/bin/bash

# Script to reset an existing admin user's password
# Usage: ./reset-admin-password.sh <username> <new-password>

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <username> <new-password>"
    echo "Example: $0 admin NewSecurePass123!"
    exit 1
fi

USERNAME="$1"
NEW_PASSWORD="$2"

echo "=== Resetting Admin Password ==="
echo "Username: $USERNAME"
echo ""

# Create a Node.js script to hash the password and update the admin
cat > /tmp/reset-password-temp.js << 'EOFSCRIPT'
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const username = process.argv[2];
const newPassword = process.argv[3];

async function resetPassword() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hackathon_db',
    user: process.env.DB_USER || 'hackathon_user',
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if username exists
    const existingUser = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length === 0) {
      console.log('✗ Username not found!');
      process.exit(1);
    }

    // Hash new password
    console.log('✓ Hashing new password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    console.log('✓ Updating password...');
    await client.query(
      'UPDATE admin_users SET password_hash = $1 WHERE username = $2',
      [passwordHash, username]
    );

    console.log('');
    console.log('✓ Password reset successfully!');
    console.log('');
    console.log(`You can now login with:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${newPassword}`);

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetPassword();
EOFSCRIPT

# Run the script inside the backend container
sudo docker compose exec -T backend node /dev/stdin "$USERNAME" "$NEW_PASSWORD" < /tmp/reset-password-temp.js

# Clean up
rm /tmp/reset-password-temp.js

echo ""
echo "=== Done ==="
