const { Pool } = require('pg');
require('../config/env');

async function testDatabaseConnection() {
    console.log('🔗 Testing database connection...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Alternative configuration:
        // host: process.env.DB_HOST,
        // port: process.env.DB_PORT,
        // database: process.env.DB_NAME,
        // user: process.env.DB_USER,
        // password: process.env.DB_PASSWORD,
    });

    try {
        // Test basic connection
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL!');
        
        // Test query
        const result = await client.query('SELECT NOW(), VERSION()');
        console.log('📅 Current time:', result.rows[0].now);
        console.log('🐘 PostgreSQL version:', result.rows[0].version);
        
        // Test database info
        const dbInfo = await client.query('SELECT current_database(), current_user');
        console.log('🗄️  Database:', dbInfo.rows[0].current_database);
        console.log('👤 User:', dbInfo.rows[0].current_user);
        
        client.release();
        
        console.log('✅ Database connection test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Hint: Make sure PostgreSQL is running on the specified host and port.');
            console.log('💡 Try running: ./setup-database.sh');
        }
        
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the test
testDatabaseConnection().catch(console.error);
