#!/bin/bash

# Script to create a new admin user on production
# Usage: ./create-admin.sh <username> <email> <password>

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <username> <email> <password>"
    echo "Example: $0 admin admin@csclub.com MySecurePass123!"
    exit 1
fi

USERNAME="$1"
EMAIL="$2"
PASSWORD="$3"

echo "=== Creating Admin User ==="
echo "Username: $USERNAME"
echo "Email: $EMAIL"
echo ""

# Create a Node.js script to hash the password and insert the admin
cat > /tmp/create-admin-temp.js << 'EOFSCRIPT'
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const username = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

async function createAdmin() {
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

    if (existingUser.rows.length > 0) {
      console.log('✗ Username already exists!');
      process.exit(1);
    }

    // Hash password
    console.log('✓ Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert admin
    console.log('✓ Inserting admin user...');
    const result = await client.query(
      'INSERT INTO admin_users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, passwordHash, 'super_admin']
    );

    console.log('');
    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('Details:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Username:', result.rows[0].username);
    console.log('  Email:', result.rows[0].email);
    console.log('  Role:', result.rows[0].role);
    console.log('');
    console.log('You can now login with:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
EOFSCRIPT

# Run the script inside the backend container (which has Node.js, bcrypt, and pg)
sudo docker compose exec -T backend node /dev/stdin "$USERNAME" "$EMAIL" "$PASSWORD" < /tmp/create-admin-temp.js

# Clean up
rm /tmp/create-admin-temp.js

echo ""
echo "=== Done ==="
