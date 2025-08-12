const { Pool } = require('pg');
require('dotenv').config();

async function validateDatabaseSchema() {
    console.log('🔍 Validating database schema...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const client = await pool.connect();
        
        // Check if all required tables exist
        const expectedTables = [
            'admins',
            'contests', 
            'teams',
            'problems',
            'test_cases',
            'submissions',
            'team_contests',
            'contest_results',
            'knex_migrations'
        ];

        console.log('📋 Checking required tables...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        
        const tablesResult = await client.query(tablesQuery);
        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            console.log('❌ Missing tables:', missingTables.join(', '));
            return false;
        }
        
        console.log('✅ All required tables exist');
        console.log('📊 Found tables:', existingTables.join(', '));

        // Check migration status
        console.log('\n🔄 Checking migrations...');
        const migrationsResult = await client.query('SELECT * FROM knex_migrations ORDER BY id');
        console.log(`✅ ${migrationsResult.rows.length} migrations applied:`);
        migrationsResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.name} (${row.batch})`);
        });

        // Check sample data
        console.log('\n📈 Checking sample data...');
        const countsQueries = [
            { name: 'Admins', query: 'SELECT COUNT(*) FROM admins' },
            { name: 'Contests', query: 'SELECT COUNT(*) FROM contests' },
            { name: 'Teams', query: 'SELECT COUNT(*) FROM teams' },
            { name: 'Problems', query: 'SELECT COUNT(*) FROM problems' },
            { name: 'Test Cases', query: 'SELECT COUNT(*) FROM test_cases' },
            { name: 'Submissions', query: 'SELECT COUNT(*) FROM submissions' }
        ];

        for (const countQuery of countsQueries) {
            const result = await client.query(countQuery.query);
            const count = parseInt(result.rows[0].count);
            console.log(`   ${countQuery.name}: ${count} records`);
        }

        // Check indexes
        console.log('\n🎯 Checking indexes...');
        const indexQuery = `
            SELECT schemaname, tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename != 'knex_migrations'
            ORDER BY tablename, indexname;
        `;
        
        const indexResult = await client.query(indexQuery);
        console.log(`✅ ${indexResult.rows.length} indexes found`);
        
        // Group by table
        const indexesByTable = {};
        indexResult.rows.forEach(row => {
            if (!indexesByTable[row.tablename]) {
                indexesByTable[row.tablename] = [];
            }
            indexesByTable[row.tablename].push(row.indexname);
        });

        Object.keys(indexesByTable).forEach(tableName => {
            console.log(`   ${tableName}: ${indexesByTable[tableName].length} indexes`);
        });

        client.release();
        
        console.log('\n✅ Database schema validation completed successfully!');
        console.log('\n🚀 Phase 1.1 Database Setup is now COMPLETE!');
        return true;
        
    } catch (error) {
        console.error('❌ Schema validation failed:');
        console.error('Error:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

// Run the validation
validateDatabaseSchema().then(success => {
    process.exit(success ? 0 : 1);
}).catch(console.error);