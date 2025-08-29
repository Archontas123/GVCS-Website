/**
 * Add LeetCode-style columns to existing SQLite database
 */

const path = require('path');
const Database = require('sqlite3').Database;

const dbPath = path.join(__dirname, 'backend/src/database/contest.db');

async function addLeetCodeColumns() {
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath);
    
    console.log('🔧 Adding LeetCode-style columns to problems table...');
    
    // Add all the new columns
    const alterQueries = [
      `ALTER TABLE problems ADD COLUMN function_signature_cpp TEXT DEFAULT 'int solution(vector<int>& nums) {\n    // Your solution here\n    return 0;\n}'`,
      `ALTER TABLE problems ADD COLUMN function_signature_java TEXT DEFAULT 'public int solution(int[] nums) {\n    // Your solution here\n    return 0;\n}'`,
      `ALTER TABLE problems ADD COLUMN function_signature_python TEXT DEFAULT 'def solution(nums):\n    # Your solution here\n    return 0'`,
      `ALTER TABLE problems ADD COLUMN io_wrapper_cpp TEXT DEFAULT '#include <iostream>\n#include <vector>\nusing namespace std;\n\n{USER_FUNCTION}\n\nint main() {\n    // Parse input\n    return 0;\n}'`,
      `ALTER TABLE problems ADD COLUMN io_wrapper_java TEXT DEFAULT 'import java.util.*;\n\npublic class Solution {\n    {USER_FUNCTION}\n    \n    public static void main(String[] args) {\n        // Parse input\n    }\n}'`,
      `ALTER TABLE problems ADD COLUMN io_wrapper_python TEXT DEFAULT '{USER_FUNCTION}\n\nif __name__ == "__main__":\n    # Parse input\n    pass'`,
      `ALTER TABLE problems ADD COLUMN input_format TEXT DEFAULT '{}'`,
      `ALTER TABLE problems ADD COLUMN output_format TEXT DEFAULT '0'`,
      `ALTER TABLE problems ADD COLUMN default_solution_cpp TEXT DEFAULT '// Your solution here\nreturn 0;'`,
      `ALTER TABLE problems ADD COLUMN default_solution_java TEXT DEFAULT '// Your solution here\nreturn 0;'`,
      `ALTER TABLE problems ADD COLUMN default_solution_python TEXT DEFAULT '# Your solution here\nreturn 0'`
    ];
    
    let completed = 0;
    const total = alterQueries.length;
    
    alterQueries.forEach((query, index) => {
      db.run(query, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.log(`⚠️  Column ${index + 1} might already exist: ${err.message}`);
        } else {
          console.log(`✅ Added column ${index + 1}/${total}`);
        }
        
        completed++;
        if (completed === total) {
          console.log('\n🔧 Creating team_problem_code table...');
          
          // Create the team_problem_code table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS team_problem_code (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              team_id INTEGER NOT NULL,
              problem_id INTEGER NOT NULL,
              language VARCHAR(20) NOT NULL,
              code TEXT NOT NULL,
              saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(team_id, problem_id, language),
              FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
              FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
            )
          `;
          
          db.run(createTableQuery, (err) => {
            if (err) {
              console.log(`⚠️  Table might already exist: ${err.message}`);
            } else {
              console.log('✅ Created team_problem_code table');
            }
            
            db.close();
            console.log('\n🎉 Database updates complete!');
            resolve();
          });
        }
      });
    });
  });
}

if (require.main === module) {
  addLeetCodeColumns()
    .then(() => {
      console.log('\n📋 Next steps:');
      console.log('1. Start your backend: npm run dev:backend');
      console.log('2. Test the API endpoints');
      console.log('3. Update the frontend code editor');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}