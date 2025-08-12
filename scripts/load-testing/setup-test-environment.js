/**
 * CS Club Hackathon Platform - Load Testing Environment Setup
 * Phase 6.1, Task 1: Test Environment Setup
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { v4: uuidv4 } = require('uuid');
const faker = require('faker');

class TestEnvironmentSetup {
  constructor() {
    this.config = {
      serverUrl: process.env.TEST_SERVER_URL || 'http://localhost:3000',
      wsUrl: process.env.TEST_WS_URL || 'http://localhost:3000',
      adminCredentials: {
        username: 'admin',
        password: 'password123'
      },
      testDataPath: path.join(__dirname, 'test-data'),
      resultsPath: path.join(__dirname, 'results'),
      logsPath: path.join(__dirname, 'logs')
    };
    
    this.testData = {
      contests: [],
      teams: [],
      problems: [],
      testCases: [],
      admins: []
    };
    
    this.metrics = {
      setupStartTime: null,
      setupEndTime: null,
      errors: [],
      warnings: [],
      created: {
        contests: 0,
        teams: 0,
        problems: 0,
        testCases: 0
      }
    };
  }

  async setupEnvironment() {
    console.log(chalk.blue.bold('🧪 Setting up Load Testing Environment\n'));
    this.metrics.setupStartTime = Date.now();
    
    try {
      await this.createDirectories();
      await this.checkServerConnection();
      await this.authenticateAdmin();
      await this.createTestContest();
      await this.createTestProblems();
      await this.createTestTeams();
      await this.generateTestData();
      await this.validateSetup();
      
      this.metrics.setupEndTime = Date.now();
      this.generateSetupReport();
      
      console.log(chalk.green.bold('\n✅ Test environment setup completed successfully!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Setup failed:'), error.message);
      this.metrics.errors.push({
        phase: 'setup',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async createDirectories() {
    const spinner = ora('Creating test directories...').start();
    
    const dirs = [
      this.config.testDataPath,
      this.config.resultsPath,
      this.config.logsPath,
      path.join(this.config.resultsPath, 'performance'),
      path.join(this.config.resultsPath, 'load-tests'),
      path.join(this.config.resultsPath, 'screenshots')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    spinner.succeed('Test directories created');
  }

  async checkServerConnection() {
    const spinner = ora('Checking server connection...').start();
    
    try {
      const response = await axios.get(`${this.config.serverUrl}/api/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        spinner.succeed(`Server connection established (${this.config.serverUrl})`);
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      spinner.fail('Server connection failed');
      throw new Error(`Cannot connect to server: ${error.message}`);
    }
  }

  async authenticateAdmin() {
    const spinner = ora('Authenticating admin user...').start();
    
    try {
      const response = await axios.post(`${this.config.serverUrl}/api/admin/login`, {
        username: this.config.adminCredentials.username,
        password: this.config.adminCredentials.password
      });
      
      if (response.data && response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        spinner.succeed('Admin authentication successful');
      } else {
        throw new Error('Invalid admin credentials or response format');
      }
    } catch (error) {
      spinner.fail('Admin authentication failed');
      throw new Error(`Admin login failed: ${error.message}`);
    }
  }

  async createTestContest() {
    const spinner = ora('Creating test contest...').start();
    
    const contestData = {
      contest_name: 'Load Test Contest',
      description: 'Automated load testing contest for performance validation',
      start_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Start in 10 minutes
      duration: 240, // 4 hours
      freeze_time: 60, // Freeze 1 hour before end
      registration_code: `LOADTEST${Date.now()}`
    };
    
    try {
      const response = await axios.post(`${this.config.serverUrl}/api/admin/contests`, contestData, {
        headers: {
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        this.testContest = response.data.data;
        this.testData.contests.push(this.testContest);
        this.metrics.created.contests++;
        
        spinner.succeed(`Test contest created (ID: ${this.testContest.id})`);
      } else {
        throw new Error('Failed to create contest');
      }
    } catch (error) {
      spinner.fail('Contest creation failed');
      throw new Error(`Contest creation failed: ${error.message}`);
    }
  }

  async createTestProblems() {
    const spinner = ora('Creating test problems...').start();
    
    const problems = [
      {
        problem_letter: 'A',
        title: 'Simple Addition',
        description: 'Add two integers and output the result.',
        input_format: 'Two integers a and b',
        output_format: 'The sum a + b',
        sample_input: '3 5',
        sample_output: '8',
        constraints: '1 ≤ a, b ≤ 1000',
        time_limit: 1000,
        memory_limit: 256,
        difficulty: 'easy'
      },
      {
        problem_letter: 'B',
        title: 'Array Maximum',
        description: 'Find the maximum element in an array.',
        input_format: 'First line: n (array size), Second line: n integers',
        output_format: 'Maximum element',
        sample_input: '5\\n1 3 7 2 5',
        sample_output: '7',
        constraints: '1 ≤ n ≤ 100000',
        time_limit: 2000,
        memory_limit: 512,
        difficulty: 'easy'
      },
      {
        problem_letter: 'C',
        title: 'String Reverse',
        description: 'Reverse a given string.',
        input_format: 'A string s',
        output_format: 'The reversed string',
        sample_input: 'hello',
        sample_output: 'olleh',
        constraints: '1 ≤ |s| ≤ 1000',
        time_limit: 1000,
        memory_limit: 256,
        difficulty: 'easy'
      },
      {
        problem_letter: 'D',
        title: 'Binary Search',
        description: 'Find the position of a target in a sorted array.',
        input_format: 'First line: n and target, Second line: n sorted integers',
        output_format: 'Position of target (1-indexed) or -1 if not found',
        sample_input: '5 7\\n1 3 5 7 9',
        sample_output: '4',
        constraints: '1 ≤ n ≤ 100000',
        time_limit: 2000,
        memory_limit: 512,
        difficulty: 'medium'
      },
      {
        problem_letter: 'E',
        title: 'Dynamic Programming',
        description: 'Solve the coin change problem.',
        input_format: 'First line: n and amount, Second line: n coin denominations',
        output_format: 'Minimum number of coins needed or -1 if impossible',
        sample_input: '3 11\\n1 4 5',
        sample_output: '3',
        constraints: '1 ≤ n ≤ 100, 1 ≤ amount ≤ 10000',
        time_limit: 3000,
        memory_limit: 512,
        difficulty: 'hard'
      },
      {
        problem_letter: 'F',
        title: 'Graph Traversal',
        description: 'Implement breadth-first search on a graph.',
        input_format: 'Graph adjacency list representation',
        output_format: 'BFS traversal order starting from node 1',
        sample_input: '4 4\\n1 2\\n1 3\\n2 4\\n3 4',
        sample_output: '1 2 3 4',
        constraints: '1 ≤ n ≤ 10000',
        time_limit: 5000,
        memory_limit: 1024,
        difficulty: 'hard'
      }
    ];
    
    try {
      for (const problemData of problems) {
        const response = await axios.post(
          `${this.config.serverUrl}/api/admin/contests/${this.testContest.id}/problems`,
          problemData,
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data && response.data.success) {
          this.testData.problems.push(response.data.data);
          this.metrics.created.problems++;
        }
      }
      
      // Create test cases for each problem
      await this.createTestCases();
      
      spinner.succeed(`${problems.length} test problems created with test cases`);
    } catch (error) {
      spinner.fail('Problem creation failed');
      throw new Error(`Problem creation failed: ${error.message}`);
    }
  }

  async createTestCases() {
    // Create test cases for each problem
    const testCaseData = [
      // Problem A (Addition)
      [
        { input: '3 5', expected_output: '8', is_sample: true },
        { input: '10 20', expected_output: '30', is_sample: false },
        { input: '0 0', expected_output: '0', is_sample: false },
        { input: '1000 1000', expected_output: '2000', is_sample: false }
      ],
      // Problem B (Array Maximum)
      [
        { input: '5\\n1 3 7 2 5', expected_output: '7', is_sample: true },
        { input: '3\\n10 5 8', expected_output: '10', is_sample: false },
        { input: '1\\n42', expected_output: '42', is_sample: false },
        { input: '4\\n-1 -5 -3 -2', expected_output: '-1', is_sample: false }
      ],
      // Add more test cases for other problems...
    ];
    
    for (let i = 0; i < Math.min(this.testData.problems.length, testCaseData.length); i++) {
      const problem = this.testData.problems[i];
      const cases = testCaseData[i];
      
      for (const testCase of cases) {
        try {
          const response = await axios.post(
            `${this.config.serverUrl}/api/admin/problems/${problem.id}/testcases`,
            testCase,
            {
              headers: {
                Authorization: `Bearer ${this.adminToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data && response.data.success) {
            this.testData.testCases.push(response.data.data);
            this.metrics.created.testCases++;
          }
        } catch (error) {
          this.metrics.warnings.push(`Failed to create test case for problem ${problem.problem_letter}: ${error.message}`);
        }
      }
    }
  }

  async createTestTeams() {
    const spinner = ora('Creating test teams...').start();
    
    const teamCount = 100; // Create 100 test teams
    const teams = [];
    
    try {
      for (let i = 1; i <= teamCount; i++) {
        const teamData = {
          team_name: `LoadTestTeam${i.toString().padStart(3, '0')}`,
          contest_code: this.testContest.registration_code
        };
        
        const response = await axios.post(`${this.config.serverUrl}/api/team/register`, teamData);
        
        if (response.data && response.data.success) {
          const team = {
            ...response.data.data,
            teamName: teamData.team_name,
            contestCode: teamData.contest_code,
            skill_level: faker.random.arrayElement(['beginner', 'intermediate', 'advanced']),
            submission_frequency: faker.random.number({ min: 1, max: 10 }), // submissions per hour
            problem_preference: faker.random.arrayElement(['sequential', 'random', 'difficulty-based'])
          };
          
          teams.push(team);
          this.testData.teams.push(team);
          this.metrics.created.teams++;
        }
        
        // Add small delay to avoid overwhelming the server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      spinner.succeed(`${teamCount} test teams created`);
    } catch (error) {
      spinner.fail('Team creation failed');
      throw new Error(`Team creation failed: ${error.message}`);
    }
  }

  async generateTestData() {
    const spinner = ora('Generating test data files...').start();
    
    try {
      // Generate team credentials file
      const teamCredentials = this.testData.teams.map(team => ({
        teamName: team.teamName,
        token: team.token,
        contestCode: team.contestCode,
        skillLevel: team.skill_level,
        submissionFrequency: team.submission_frequency,
        problemPreference: team.problem_preference
      }));
      
      // Generate test code samples for different languages
      const codeSamples = {
        cpp: {
          addition: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
          array_max: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    cout << *max_element(arr.begin(), arr.end()) << endl;
    return 0;
}`,
          wrong_answer: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b << endl; // Intentionally wrong for testing
    return 0;
}`
        },
        java: {
          addition: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`,
          array_max: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int val = sc.nextInt();
            max = Math.max(max, val);
        }
        System.out.println(max);
    }
}`
        },
        python: {
          addition: `a, b = map(int, input().split())
print(a + b)`,
          array_max: `n = int(input())
arr = list(map(int, input().split()))
print(max(arr))`,
          timeout: `import time
a, b = map(int, input().split())
time.sleep(10)  # Intentionally cause timeout
print(a + b)`
        }
      };
      
      // Save all test data
      const testDataFiles = {
        'team-credentials.json': teamCredentials,
        'contest-info.json': {
          contest: this.testContest,
          problems: this.testData.problems,
          testCases: this.testData.testCases.length
        },
        'code-samples.json': codeSamples,
        'load-test-config.json': {
          serverUrl: this.config.serverUrl,
          wsUrl: this.config.wsUrl,
          teamCount: this.testData.teams.length,
          problemCount: this.testData.problems.length,
          contestId: this.testContest.id,
          registrationCode: this.testContest.registration_code
        }
      };
      
      for (const [filename, data] of Object.entries(testDataFiles)) {
        fs.writeFileSync(
          path.join(this.config.testDataPath, filename),
          JSON.stringify(data, null, 2)
        );
      }
      
      spinner.succeed('Test data files generated');
    } catch (error) {
      spinner.fail('Test data generation failed');
      throw new Error(`Test data generation failed: ${error.message}`);
    }
  }

  async validateSetup() {
    const spinner = ora('Validating test environment...').start();
    
    try {
      // Validate contest exists
      const contestResponse = await axios.get(
        `${this.config.serverUrl}/api/admin/contests/${this.testContest.id}`,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        }
      );
      
      if (!contestResponse.data.success) {
        throw new Error('Contest validation failed');
      }
      
      // Validate problems exist
      const problemsResponse = await axios.get(
        `${this.config.serverUrl}/api/admin/contests/${this.testContest.id}/problems`,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        }
      );
      
      if (!problemsResponse.data.success || problemsResponse.data.data.length === 0) {
        throw new Error('Problems validation failed');
      }
      
      // Test team authentication
      const sampleTeam = this.testData.teams[0];
      const authResponse = await axios.get(`${this.config.serverUrl}/api/team/status`, {
        headers: { Authorization: `Bearer ${sampleTeam.token}` }
      });
      
      if (!authResponse.data.success) {
        throw new Error('Team authentication validation failed');
      }
      
      spinner.succeed('Environment validation completed');
    } catch (error) {
      spinner.fail('Environment validation failed');
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  generateSetupReport() {
    const setupTime = this.metrics.setupEndTime - this.metrics.setupStartTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      setupDuration: `${setupTime}ms`,
      environment: {
        serverUrl: this.config.serverUrl,
        wsUrl: this.config.wsUrl
      },
      created: this.metrics.created,
      testData: {
        contestId: this.testContest.id,
        registrationCode: this.testContest.registration_code,
        teamCount: this.testData.teams.length,
        problemCount: this.testData.problems.length,
        testCaseCount: this.testData.testCases.length
      },
      files: {
        testDataPath: this.config.testDataPath,
        resultsPath: this.config.resultsPath,
        logsPath: this.config.logsPath
      },
      warnings: this.metrics.warnings,
      errors: this.metrics.errors
    };
    
    fs.writeFileSync(
      path.join(this.config.resultsPath, 'setup-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(chalk.cyan('\n📊 Setup Summary:'));
    console.log(chalk.white(`• Setup Time: ${setupTime}ms`));
    console.log(chalk.white(`• Contest Created: ${this.testContest.id} (${this.testContest.contest_name})`));
    console.log(chalk.white(`• Teams Created: ${this.metrics.created.teams}`));
    console.log(chalk.white(`• Problems Created: ${this.metrics.created.problems}`));
    console.log(chalk.white(`• Test Cases Created: ${this.metrics.created.testCases}`));
    console.log(chalk.white(`• Registration Code: ${this.testContest.registration_code}`));
    
    if (this.metrics.warnings.length > 0) {
      console.log(chalk.yellow(`• Warnings: ${this.metrics.warnings.length}`));
    }
    
    if (this.metrics.errors.length > 0) {
      console.log(chalk.red(`• Errors: ${this.metrics.errors.length}`));
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new TestEnvironmentSetup();
  setup.setupEnvironment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Setup failed:'), error);
      process.exit(1);
    });
}

module.exports = TestEnvironmentSetup;