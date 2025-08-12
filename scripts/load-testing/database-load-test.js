/**
 * CS Club Hackathon Platform - Database Load Test
 * Phase 6.1, Task 4: Database performance under high query volume
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const chalk = require('chalk');
const ora = require('ora');
const { performance } = require('perf_hooks');

class DatabaseLoadTest {
  constructor(config = {}) {
    this.config = {
      dbPath: config.dbPath || path.join(__dirname, '..', 'server', 'src', 'database', 'contest.db'),
      testDbPath: config.testDbPath || path.join(__dirname, 'test-database.db'),
      concurrentConnections: config.concurrentConnections || 20,
      queriesPerConnection: config.queriesPerConnection || 100,
      testDuration: config.testDuration || 120000, // 2 minutes
      resultsPath: config.resultsPath || path.join(__dirname, 'results'),
      ...config
    };

    this.connections = [];
    this.metrics = {
      startTime: null,
      endTime: null,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      peakQueryTime: 0,
      minQueryTime: Infinity,
      queryTypeMetrics: new Map(),
      connectionMetrics: new Map(),
      timeSeriesData: [],
      errors: []
    };

    this.queryTypes = [
      'leaderboard_queries',
      'submission_queries',
      'problem_queries',
      'team_queries',
      'contest_queries',
      'insert_operations',
      'update_operations',
      'complex_joins'
    ];

    this.testQueries = this.generateTestQueries();
  }

  generateTestQueries() {
    return {
      leaderboard_queries: [
        `SELECT t.team_name, t.id, 
                COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as solved_problems,
                SUM(CASE WHEN s.verdict = 'Accepted' THEN p.points ELSE 0 END) as total_points,
                MAX(s.submitted_at) as last_submission
         FROM teams t 
         LEFT JOIN submissions s ON t.id = s.team_id 
         LEFT JOIN problems p ON s.problem_id = p.id
         WHERE t.contest_id = ?
         GROUP BY t.id, t.team_name 
         ORDER BY total_points DESC, last_submission ASC`,
         
        `SELECT p.problem_letter, p.title,
                COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as accepted_count,
                COUNT(s.id) as total_submissions,
                AVG(s.execution_time) as avg_execution_time
         FROM problems p
         LEFT JOIN submissions s ON p.id = s.problem_id
         WHERE p.contest_id = ?
         GROUP BY p.id, p.problem_letter, p.title
         ORDER BY p.problem_letter`,
         
        `SELECT DATE(s.submitted_at) as submission_date,
                COUNT(*) as daily_submissions,
                COUNT(DISTINCT s.team_id) as active_teams
         FROM submissions s
         JOIN teams t ON s.team_id = t.id
         WHERE t.contest_id = ?
         GROUP BY DATE(s.submitted_at)
         ORDER BY submission_date DESC`
      ],

      submission_queries: [
        `SELECT s.*, p.problem_letter, p.title, t.team_name
         FROM submissions s
         JOIN problems p ON s.problem_id = p.id
         JOIN teams t ON s.team_id = t.id
         WHERE t.contest_id = ?
         ORDER BY s.submitted_at DESC
         LIMIT 50`,
         
        `SELECT s.* FROM submissions s
         JOIN teams t ON s.team_id = t.id
         WHERE t.contest_id = ? AND s.team_id = ?
         ORDER BY s.submitted_at DESC`,
         
        `UPDATE submissions 
         SET verdict = ?, execution_time = ?, memory_used = ?, judged_at = datetime('now')
         WHERE id = ?`,
         
        `SELECT COUNT(*) as pending_count
         FROM submissions s
         JOIN teams t ON s.team_id = t.id
         WHERE t.contest_id = ? AND s.verdict = 'Pending'`
      ],

      problem_queries: [
        `SELECT * FROM problems WHERE contest_id = ? ORDER BY problem_letter`,
        
        `SELECT p.*, 
                COUNT(s.id) as submission_count,
                COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as accepted_count
         FROM problems p
         LEFT JOIN submissions s ON p.id = s.problem_id
         WHERE p.contest_id = ?
         GROUP BY p.id
         ORDER BY p.problem_letter`,
         
        `SELECT tc.* FROM test_cases tc
         JOIN problems p ON tc.problem_id = p.id
         WHERE p.contest_id = ? AND tc.problem_id = ?`
      ],

      team_queries: [
        `SELECT * FROM teams WHERE contest_id = ? ORDER BY team_name`,
        
        `SELECT t.*, COUNT(s.id) as submission_count,
                COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as solved_count
         FROM teams t
         LEFT JOIN submissions s ON t.id = s.team_id
         WHERE t.contest_id = ?
         GROUP BY t.id
         ORDER BY solved_count DESC, submission_count ASC`,
         
        `UPDATE teams SET last_activity = datetime('now') WHERE id = ?`
      ],

      contest_queries: [
        `SELECT * FROM contests WHERE id = ?`,
        
        `SELECT c.*,
                COUNT(DISTINCT t.id) as team_count,
                COUNT(DISTINCT p.id) as problem_count,
                COUNT(s.id) as submission_count
         FROM contests c
         LEFT JOIN teams t ON c.id = t.contest_id
         LEFT JOIN problems p ON c.id = p.contest_id
         LEFT JOIN submissions s ON t.id = s.team_id
         WHERE c.id = ?
         GROUP BY c.id`
      ],

      insert_operations: [
        `INSERT INTO submissions (team_id, problem_id, language, source_code, verdict, submitted_at)
         VALUES (?, ?, ?, ?, 'Pending', datetime('now'))`,
         
        `INSERT INTO teams (contest_id, team_name, registration_code, created_at)
         VALUES (?, ?, ?, datetime('now'))`,
         
        `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, created_at)
         VALUES (?, ?, ?, 0, datetime('now'))`
      ],

      update_operations: [
        `UPDATE submissions SET verdict = ?, execution_time = ?, memory_used = ?, judged_at = datetime('now') WHERE id = ?`,
        
        `UPDATE teams SET last_activity = datetime('now'), submission_count = submission_count + 1 WHERE id = ?`,
        
        `UPDATE contests SET status = ? WHERE id = ?`
      ],

      complex_joins: [
        `SELECT t.team_name, p.problem_letter, s.verdict, s.execution_time, s.submitted_at,
                ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY s.submitted_at DESC) as submission_rank
         FROM teams t
         JOIN submissions s ON t.id = s.team_id
         JOIN problems p ON s.problem_id = p.id
         WHERE t.contest_id = ? AND s.verdict = 'Accepted'
         ORDER BY s.submitted_at DESC`,
         
        `WITH team_stats AS (
           SELECT t.id, t.team_name,
                  COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as solved,
                  COUNT(s.id) as total_submissions,
                  MIN(s.submitted_at) as first_submission,
                  MAX(s.submitted_at) as last_submission
           FROM teams t
           LEFT JOIN submissions s ON t.id = s.team_id
           WHERE t.contest_id = ?
           GROUP BY t.id, t.team_name
         )
         SELECT ts.*, 
                CASE WHEN ts.solved > 0 THEN 
                  ROUND((JULIANDAY(ts.last_submission) - JULIANDAY(ts.first_submission)) * 24 * 60, 2)
                ELSE 0 END as session_duration_minutes
         FROM team_stats ts
         ORDER BY ts.solved DESC, ts.last_submission ASC`,
         
        `SELECT p.problem_letter, p.title,
                COUNT(DISTINCT s.team_id) as teams_attempted,
                COUNT(s.id) as total_submissions,
                COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as accepted_submissions,
                ROUND(AVG(CASE WHEN s.verdict = 'Accepted' THEN s.execution_time END), 2) as avg_accepted_time,
                ROUND(100.0 * COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) / COUNT(s.id), 2) as acceptance_rate
         FROM problems p
         LEFT JOIN submissions s ON p.id = s.problem_id
         WHERE p.contest_id = ?
         GROUP BY p.id, p.problem_letter, p.title
         HAVING total_submissions > 0
         ORDER BY acceptance_rate DESC, total_submissions DESC`
      ]
    };
  }

  async startLoadTest() {
    console.log(chalk.blue.bold('🚀 Starting Database Load Test\n'));
    this.metrics.startTime = performance.now();

    try {
      await this.setupTestDatabase();
      await this.validateDatabase();
      await this.runLoadTest();
      
      this.metrics.endTime = performance.now();
      await this.generateResults();
      
      console.log(chalk.green.bold('\n✅ Database load test completed!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Load test failed:'), error.message);
      this.metrics.errors.push({
        phase: 'load-test',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    } finally {
      await this.cleanup();
    }
  }

  async setupTestDatabase() {
    const spinner = ora('Setting up test database...').start();
    
    try {
      // Copy main database to test location
      if (fs.existsSync(this.config.dbPath)) {
        fs.copyFileSync(this.config.dbPath, this.config.testDbPath);
        spinner.succeed('Test database created');
      } else {
        spinner.warn('Main database not found, creating empty test database');
        await this.createEmptyTestDatabase();
      }
    } catch (error) {
      spinner.fail('Test database setup failed');
      throw error;
    }
  }

  async createEmptyTestDatabase() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.config.testDbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create minimal schema for testing
        const schema = `
          CREATE TABLE IF NOT EXISTS contests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contest_name TEXT NOT NULL,
            description TEXT,
            start_time TEXT,
            duration INTEGER,
            freeze_time INTEGER,
            status TEXT DEFAULT 'upcoming',
            created_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contest_id INTEGER,
            team_name TEXT NOT NULL,
            registration_code TEXT,
            token TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            last_activity TEXT,
            submission_count INTEGER DEFAULT 0,
            FOREIGN KEY (contest_id) REFERENCES contests (id)
          );

          CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contest_id INTEGER,
            problem_letter TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            time_limit INTEGER DEFAULT 1000,
            memory_limit INTEGER DEFAULT 256,
            points INTEGER DEFAULT 100,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (contest_id) REFERENCES contests (id)
          );

          CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER,
            problem_id INTEGER,
            language TEXT NOT NULL,
            source_code TEXT NOT NULL,
            verdict TEXT DEFAULT 'Pending',
            execution_time INTEGER,
            memory_used INTEGER,
            submitted_at TEXT DEFAULT (datetime('now')),
            judged_at TEXT,
            FOREIGN KEY (team_id) REFERENCES teams (id),
            FOREIGN KEY (problem_id) REFERENCES problems (id)
          );

          CREATE TABLE IF NOT EXISTS test_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id INTEGER,
            input TEXT NOT NULL,
            expected_output TEXT NOT NULL,
            is_sample INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (problem_id) REFERENCES problems (id)
          );

          -- Insert test data
          INSERT INTO contests (id, contest_name, description, status) 
          VALUES (1, 'Load Test Contest', 'Contest for load testing', 'active');

          INSERT INTO problems (contest_id, problem_letter, title, description) VALUES
          (1, 'A', 'Simple Addition', 'Add two numbers'),
          (1, 'B', 'Array Maximum', 'Find max in array'),
          (1, 'C', 'String Reverse', 'Reverse a string');

          INSERT INTO teams (contest_id, team_name, registration_code) VALUES
          (1, 'TestTeam001', 'LOADTEST001'),
          (1, 'TestTeam002', 'LOADTEST002'),
          (1, 'TestTeam003', 'LOADTEST003');
        `;

        db.exec(schema, (err) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async validateDatabase() {
    const spinner = ora('Validating database structure...').start();
    
    try {
      const db = new sqlite3.Database(this.config.testDbPath);
      
      await new Promise((resolve, reject) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contests'", (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            reject(new Error('Required table "contests" not found'));
          } else {
            resolve();
          }
        });
      });

      db.close();
      spinner.succeed('Database structure validated');
    } catch (error) {
      spinner.fail('Database validation failed');
      throw error;
    }
  }

  async runLoadTest() {
    const spinner = ora('Running database load test...').start();
    
    try {
      // Initialize query type metrics
      for (const queryType of this.queryTypes) {
        this.metrics.queryTypeMetrics.set(queryType, {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errors: 0
        });
      }

      // Create database connections
      await this.createConnections();

      // Run concurrent query load
      const promises = [];
      for (let i = 0; i < this.config.concurrentConnections; i++) {
        promises.push(this.runConnectionLoad(i));
      }

      // Monitor progress
      const monitorInterval = setInterval(() => {
        this.collectMetrics(spinner);
      }, 2000);

      await Promise.all(promises);
      clearInterval(monitorInterval);
      
      spinner.succeed('Database load test completed');
    } catch (error) {
      spinner.fail('Database load test failed');
      throw error;
    }
  }

  async createConnections() {
    for (let i = 0; i < this.config.concurrentConnections; i++) {
      const connection = new sqlite3.Database(this.config.testDbPath);
      this.connections.push(connection);
      
      this.metrics.connectionMetrics.set(i, {
        queries: 0,
        successful: 0,
        failed: 0,
        totalTime: 0,
        averageTime: 0
      });
    }
  }

  async runConnectionLoad(connectionIndex) {
    const connection = this.connections[connectionIndex];
    const connectionMetrics = this.metrics.connectionMetrics.get(connectionIndex);
    const endTime = Date.now() + this.config.testDuration;
    
    let queryCount = 0;
    
    while (Date.now() < endTime && queryCount < this.config.queriesPerConnection) {
      const queryType = this.getRandomQueryType();
      const query = this.getRandomQuery(queryType);
      const params = this.generateQueryParams(queryType);
      
      const startTime = performance.now();
      
      try {
        await this.executeQuery(connection, query, params);
        const executionTime = performance.now() - startTime;
        
        this.recordQuerySuccess(queryType, connectionIndex, executionTime);
        queryCount++;
        
      } catch (error) {
        const executionTime = performance.now() - startTime;
        this.recordQueryFailure(queryType, connectionIndex, executionTime, error);
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    }
  }

  executeQuery(connection, query, params) {
    return new Promise((resolve, reject) => {
      if (query.trim().startsWith('SELECT') || query.trim().startsWith('WITH')) {
        connection.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else if (query.trim().startsWith('INSERT')) {
        connection.run(query, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      } else if (query.trim().startsWith('UPDATE')) {
        connection.run(query, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      } else {
        connection.run(query, params, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  getRandomQueryType() {
    const weights = {
      'leaderboard_queries': 0.25,
      'submission_queries': 0.3,
      'problem_queries': 0.15,
      'team_queries': 0.1,
      'contest_queries': 0.05,
      'insert_operations': 0.1,
      'update_operations': 0.03,
      'complex_joins': 0.02
    };

    const random = Math.random();
    let cumulative = 0;
    
    for (const [queryType, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return queryType;
      }
    }
    
    return 'leaderboard_queries'; // Fallback
  }

  getRandomQuery(queryType) {
    const queries = this.testQueries[queryType];
    return queries[Math.floor(Math.random() * queries.length)];
  }

  generateQueryParams(queryType) {
    const contestId = 1; // Test contest ID
    const teamId = Math.floor(Math.random() * 3) + 1; // Random team 1-3
    const problemId = Math.floor(Math.random() * 3) + 1; // Random problem 1-3
    
    switch (queryType) {
      case 'leaderboard_queries':
      case 'problem_queries':
      case 'contest_queries':
      case 'team_queries':
        return [contestId];
        
      case 'submission_queries':
        if (Math.random() < 0.5) {
          return [contestId, teamId];
        } else if (Math.random() < 0.5) {
          return ['Accepted', Math.floor(Math.random() * 1000) + 100, Math.floor(Math.random() * 256) + 64, Math.floor(Math.random() * 1000) + 1];
        } else {
          return [contestId];
        }
        
      case 'insert_operations':
        if (Math.random() < 0.6) { // submission insert
          return [teamId, problemId, 'cpp', '#include<iostream>\nint main(){return 0;}'];
        } else if (Math.random() < 0.8) { // team insert
          return [contestId, `LoadTestTeam${Date.now()}`, `CODE${Date.now()}`];
        } else { // test case insert
          return [problemId, '5 3', '8'];
        }
        
      case 'update_operations':
        if (Math.random() < 0.7) { // submission update
          return ['Accepted', Math.floor(Math.random() * 1000) + 100, Math.floor(Math.random() * 256) + 64, Math.floor(Math.random() * 1000) + 1];
        } else if (Math.random() < 0.9) { // team update
          return [teamId];
        } else { // contest update
          return ['active', contestId];
        }
        
      case 'complex_joins':
        return [contestId];
        
      default:
        return [contestId];
    }
  }

  recordQuerySuccess(queryType, connectionIndex, executionTime) {
    // Update query type metrics
    const queryMetrics = this.metrics.queryTypeMetrics.get(queryType);
    queryMetrics.count++;
    queryMetrics.totalTime += executionTime;
    queryMetrics.averageTime = queryMetrics.totalTime / queryMetrics.count;
    queryMetrics.minTime = Math.min(queryMetrics.minTime, executionTime);
    queryMetrics.maxTime = Math.max(queryMetrics.maxTime, executionTime);

    // Update connection metrics
    const connectionMetrics = this.metrics.connectionMetrics.get(connectionIndex);
    connectionMetrics.queries++;
    connectionMetrics.successful++;
    connectionMetrics.totalTime += executionTime;
    connectionMetrics.averageTime = connectionMetrics.totalTime / connectionMetrics.queries;

    // Update global metrics
    this.metrics.totalQueries++;
    this.metrics.successfulQueries++;
    
    if (executionTime > this.metrics.peakQueryTime) {
      this.metrics.peakQueryTime = executionTime;
    }
    if (executionTime < this.metrics.minQueryTime) {
      this.metrics.minQueryTime = executionTime;
    }
  }

  recordQueryFailure(queryType, connectionIndex, executionTime, error) {
    // Update query type metrics
    const queryMetrics = this.metrics.queryTypeMetrics.get(queryType);
    queryMetrics.errors++;

    // Update connection metrics
    const connectionMetrics = this.metrics.connectionMetrics.get(connectionIndex);
    connectionMetrics.queries++;
    connectionMetrics.failed++;

    // Update global metrics
    this.metrics.totalQueries++;
    this.metrics.failedQueries++;

    // Record error
    this.metrics.errors.push({
      phase: 'query',
      queryType,
      connectionIndex,
      error: error.message,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }

  collectMetrics(spinner) {
    const elapsed = performance.now() - this.metrics.startTime;
    const remaining = Math.max(0, this.config.testDuration - elapsed);
    
    const queriesPerSecond = elapsed > 0 ? 
      Math.round(this.metrics.totalQueries / (elapsed / 1000)) : 0;
    
    const successRate = this.metrics.totalQueries > 0 ? 
      Math.round((this.metrics.successfulQueries / this.metrics.totalQueries) * 100) : 0;

    // Calculate average query time
    let totalTime = 0;
    let totalCount = 0;
    
    for (const [queryType, metrics] of this.metrics.queryTypeMetrics.entries()) {
      totalTime += metrics.totalTime;
      totalCount += metrics.count;
    }
    
    this.metrics.averageQueryTime = totalCount > 0 ? totalTime / totalCount : 0;

    spinner.text = `Running database load... Queries: ${this.metrics.totalQueries}, ` +
                  `Rate: ${queriesPerSecond}/s, Success: ${successRate}%, ` +
                  `Avg Time: ${this.metrics.averageQueryTime.toFixed(2)}ms`;

    // Store time series data
    this.metrics.timeSeriesData.push({
      timestamp: Date.now(),
      totalQueries: this.metrics.totalQueries,
      queriesPerSecond,
      successRate,
      averageQueryTime: this.metrics.averageQueryTime
    });
  }

  async generateResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const successRate = this.metrics.totalQueries > 0 ? 
      (this.metrics.successfulQueries / this.metrics.totalQueries) * 100 : 0;

    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        concurrentConnections: this.config.concurrentConnections,
        queriesPerConnection: this.config.queriesPerConnection,
        testDuration: this.config.testDuration,
        testDbPath: this.config.testDbPath
      },
      summary: {
        duration: `${duration.toFixed(2)}ms`,
        totalQueries: this.metrics.totalQueries,
        successfulQueries: this.metrics.successfulQueries,
        failedQueries: this.metrics.failedQueries,
        successRate: `${successRate.toFixed(2)}%`,
        averageQueryTime: `${this.metrics.averageQueryTime.toFixed(2)}ms`,
        peakQueryTime: `${this.metrics.peakQueryTime.toFixed(2)}ms`,
        minQueryTime: this.metrics.minQueryTime === Infinity ? 0 : `${this.metrics.minQueryTime.toFixed(2)}ms`
      },
      performance: {
        queriesPerSecond: Math.round(this.metrics.totalQueries / (duration / 1000)),
        averageConnectionLoad: Math.round(this.metrics.totalQueries / this.config.concurrentConnections),
        peakQueryTime: this.metrics.peakQueryTime
      },
      queryTypeMetrics: Array.from(this.metrics.queryTypeMetrics.entries()).map(([type, metrics]) => ({
        queryType: type,
        count: metrics.count,
        averageTime: `${metrics.averageTime.toFixed(2)}ms`,
        minTime: metrics.minTime === Infinity ? 0 : `${metrics.minTime.toFixed(2)}ms`,
        maxTime: `${metrics.maxTime.toFixed(2)}ms`,
        errors: metrics.errors,
        successRate: metrics.count > 0 ? `${((metrics.count - metrics.errors) / metrics.count * 100).toFixed(2)}%` : '0%'
      })),
      connectionMetrics: Array.from(this.metrics.connectionMetrics.entries()).map(([id, metrics]) => ({
        connectionId: id,
        queries: metrics.queries,
        successful: metrics.successful,
        failed: metrics.failed,
        successRate: metrics.queries > 0 ? `${(metrics.successful / metrics.queries * 100).toFixed(2)}%` : '0%',
        averageTime: `${metrics.averageTime.toFixed(2)}ms`
      })),
      timeSeriesData: this.metrics.timeSeriesData,
      errors: this.metrics.errors
    };

    // Save detailed results
    fs.writeFileSync(
      path.join(this.config.resultsPath, 'database-load-test-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate CSV for analysis
    this.generateCSVReport(report);

    // Print summary
    this.printSummary(report);
  }

  generateCSVReport(report) {
    const csvLines = [
      'timestamp,totalQueries,queriesPerSecond,successRate,averageQueryTime'
    ];

    for (const data of report.timeSeriesData) {
      csvLines.push(
        `${new Date(data.timestamp).toISOString()},${data.totalQueries},${data.queriesPerSecond},${data.successRate},${data.averageQueryTime}`
      );
    }

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'database-load-test-timeseries.csv'),
      csvLines.join('\n')
    );
  }

  printSummary(report) {
    console.log(chalk.cyan('\n📊 DATABASE LOAD TEST RESULTS'));
    console.log('='.repeat(50));
    console.log(chalk.white(`Duration: ${report.summary.duration}`));
    console.log(chalk.white(`Total Queries: ${report.summary.totalQueries}`));
    console.log(chalk.white(`Successful: ${report.summary.successfulQueries}`));
    console.log(chalk.white(`Failed: ${report.summary.failedQueries}`));
    console.log(chalk.white(`Success Rate: ${report.summary.successRate}`));
    console.log(chalk.white(`Average Query Time: ${report.summary.averageQueryTime}`));
    console.log(chalk.white(`Peak Query Time: ${report.summary.peakQueryTime}`));
    console.log(chalk.white(`Queries/Second: ${report.performance.queriesPerSecond}`));

    console.log(chalk.cyan('\n📈 Query Type Performance:'));
    for (const queryData of report.queryTypeMetrics) {
      if (queryData.count > 0) {
        console.log(chalk.white(`  ${queryData.queryType}: ${queryData.count} queries, ${queryData.averageTime} avg, ${queryData.successRate}`));
      }
    }

    if (report.errors.length > 0) {
      console.log(chalk.yellow(`\n⚠️ Errors Encountered: ${report.errors.length}`));
      
      // Group errors by type
      const errorGroups = {};
      for (const error of report.errors) {
        const key = error.queryType || 'unknown';
        errorGroups[key] = (errorGroups[key] || 0) + 1;
      }
      
      for (const [queryType, count] of Object.entries(errorGroups)) {
        console.log(chalk.yellow(`  ${queryType}: ${count} errors`));
      }
    }

    console.log(chalk.green(`\n📁 Results saved to: ${this.config.resultsPath}`));
  }

  async cleanup() {
    const spinner = ora('Cleaning up database connections...').start();
    
    try {
      // Close all database connections
      await Promise.all(this.connections.map(connection => {
        return new Promise(resolve => {
          connection.close((err) => {
            if (err) {
              console.error('Error closing connection:', err);
            }
            resolve();
          });
        });
      }));

      this.connections = [];

      // Clean up test database
      if (fs.existsSync(this.config.testDbPath)) {
        fs.unlinkSync(this.config.testDbPath);
      }
      
      spinner.succeed('Cleanup completed');
    } catch (error) {
      spinner.fail('Cleanup failed');
      console.error(error);
    }
  }
}

// Run database load test if called directly
if (require.main === module) {
  const config = {
    concurrentConnections: process.env.CONCURRENT_CONNECTIONS ? parseInt(process.env.CONCURRENT_CONNECTIONS) : 20,
    queriesPerConnection: process.env.QUERIES_PER_CONNECTION ? parseInt(process.env.QUERIES_PER_CONNECTION) : 100,
    testDuration: process.env.TEST_DURATION ? parseInt(process.env.TEST_DURATION) : 120000,
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'server', 'src', 'database', 'contest.db')
  };

  const loadTest = new DatabaseLoadTest(config);
  loadTest.startLoadTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Database load test failed:'), error);
      process.exit(1);
    });
}

module.exports = DatabaseLoadTest;