/**
 * CS Club Hackathon Platform - Team Simulation Script
 * Phase 6.1, Task 2: Concurrent Team Behavior Simulation
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');
const ora = require('ora');
const _ = require('lodash');

class TeamSimulation {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      wsUrl: config.wsUrl || 'ws://localhost:3000',
      maxConcurrentTeams: config.maxConcurrentTeams || 50,
      simulationDuration: config.simulationDuration || 300000, // 5 minutes
      testDataPath: config.testDataPath || path.join(__dirname, 'test-data'),
      resultsPath: config.resultsPath || path.join(__dirname, 'results'),
      ...config
    };

    this.teams = [];
    this.activeConnections = new Map();
    this.metrics = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      websocketConnections: 0,
      websocketErrors: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      submissionsSent: 0,
      submissionsProcessed: 0,
      errors: [],
      teamMetrics: new Map(),
      timeSeriesData: []
    };

    this.behaviorPatterns = {
      aggressive: {
        submissionFrequency: 0.5, // Every 30 seconds
        problemSwitchRate: 0.3,
        leaderboardCheckRate: 0.1,
        idleTime: { min: 5, max: 30 }
      },
      moderate: {
        submissionFrequency: 0.2, // Every 5 minutes
        problemSwitchRate: 0.5,
        leaderboardCheckRate: 0.05,
        idleTime: { min: 30, max: 120 }
      },
      conservative: {
        submissionFrequency: 0.1, // Every 10 minutes
        problemSwitchRate: 0.7,
        leaderboardCheckRate: 0.02,
        idleTime: { min: 120, max: 600 }
      }
    };

    this.loadTestData();
  }

  loadTestData() {
    try {
      const credentialsPath = path.join(this.config.testDataPath, 'team-credentials.json');
      const contestPath = path.join(this.config.testDataPath, 'contest-info.json');
      const samplesPath = path.join(this.config.testDataPath, 'code-samples.json');

      if (!fs.existsSync(credentialsPath)) {
        throw new Error('Team credentials not found. Please run setup-test-environment.js first.');
      }

      this.teamCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      this.contestInfo = JSON.parse(fs.readFileSync(contestPath, 'utf8'));
      this.codeSamples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));

      console.log(chalk.green(`✅ Loaded ${this.teamCredentials.length} team credentials`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to load test data:'), error.message);
      process.exit(1);
    }
  }

  async startSimulation() {
    console.log(chalk.blue.bold('🚀 Starting Team Simulation\n'));
    this.metrics.startTime = Date.now();

    try {
      await this.validateEnvironment();
      await this.spawnTeams();
      await this.runSimulation();
      
      this.metrics.endTime = Date.now();
      await this.generateResults();
      
      console.log(chalk.green.bold('\n✅ Team simulation completed successfully!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Simulation failed:'), error.message);
      this.metrics.errors.push({
        phase: 'simulation',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    } finally {
      await this.cleanup();
    }
  }

  async validateEnvironment() {
    const spinner = ora('Validating test environment...').start();
    
    try {
      // Check server health
      const healthResponse = await axios.get(`${this.config.serverUrl}/api/health`, {
        timeout: 5000
      });

      if (healthResponse.status !== 200) {
        throw new Error('Server health check failed');
      }

      // Validate contest and problems exist
      if (!this.contestInfo.contest || !this.contestInfo.problems) {
        throw new Error('Contest or problems data missing');
      }

      spinner.succeed('Environment validation passed');
    } catch (error) {
      spinner.fail('Environment validation failed');
      throw error;
    }
  }

  async spawnTeams() {
    const spinner = ora('Spawning virtual teams...').start();
    
    const teamCount = Math.min(this.config.maxConcurrentTeams, this.teamCredentials.length);
    
    for (let i = 0; i < teamCount; i++) {
      const teamData = this.teamCredentials[i];
      const behaviorType = this.selectBehaviorPattern();
      
      const team = new VirtualTeam({
        id: i + 1,
        teamName: teamData.teamName,
        token: teamData.token,
        contestId: this.contestInfo.contest.id,
        problems: this.contestInfo.problems,
        codeSamples: this.codeSamples,
        serverUrl: this.config.serverUrl,
        wsUrl: this.config.wsUrl,
        behavior: this.behaviorPatterns[behaviorType],
        behaviorType,
        simulation: this
      });

      this.teams.push(team);
      this.metrics.teamMetrics.set(team.id, {
        teamName: team.teamName,
        behaviorType,
        requests: 0,
        submissions: 0,
        websocketEvents: 0,
        errors: 0,
        responseTime: []
      });

      // Stagger team startup to avoid thundering herd
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    spinner.succeed(`${teamCount} virtual teams created`);
  }

  selectBehaviorPattern() {
    const patterns = ['aggressive', 'moderate', 'conservative'];
    const weights = [0.2, 0.6, 0.2]; // 20% aggressive, 60% moderate, 20% conservative
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < patterns.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return patterns[i];
      }
    }
    
    return 'moderate';
  }

  async runSimulation() {
    const spinner = ora('Running team simulation...').start();
    
    // Start all teams
    const teamPromises = this.teams.map(team => team.start());
    
    // Monitor progress
    const monitorInterval = setInterval(() => {
      this.collectMetrics();
      this.displayProgress(spinner);
    }, 5000);

    // Run for specified duration
    await Promise.race([
      Promise.all(teamPromises),
      new Promise(resolve => setTimeout(resolve, this.config.simulationDuration))
    ]);

    clearInterval(monitorInterval);
    spinner.succeed('Simulation completed');
  }

  collectMetrics() {
    const timestamp = Date.now();
    let totalRequests = 0;
    let totalWebsocketEvents = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [teamId, metrics] of this.metrics.teamMetrics.entries()) {
      totalRequests += metrics.requests;
      totalWebsocketEvents += metrics.websocketEvents;
      totalResponseTime += metrics.responseTime.reduce((sum, time) => sum + time, 0);
      responseTimeCount += metrics.responseTime.length;
    }

    this.metrics.totalRequests = totalRequests;
    this.metrics.websocketConnections = this.activeConnections.size;
    this.metrics.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    // Store time series data
    this.metrics.timeSeriesData.push({
      timestamp,
      activeConnections: this.activeConnections.size,
      totalRequests,
      totalWebsocketEvents,
      averageResponseTime: this.metrics.averageResponseTime
    });
  }

  displayProgress(spinner) {
    const elapsed = Date.now() - this.metrics.startTime;
    const remaining = Math.max(0, this.config.simulationDuration - elapsed);
    
    const progress = {
      elapsed: Math.floor(elapsed / 1000),
      remaining: Math.floor(remaining / 1000),
      activeTeams: this.teams.filter(team => team.isActive).length,
      totalRequests: this.metrics.totalRequests,
      websocketConnections: this.metrics.websocketConnections,
      averageResponseTime: Math.round(this.metrics.averageResponseTime)
    };

    spinner.text = `Running simulation... Active: ${progress.activeTeams} teams, ` +
                  `Requests: ${progress.totalRequests}, WS: ${progress.websocketConnections}, ` +
                  `Avg RT: ${progress.averageResponseTime}ms, Time: ${progress.elapsed}s`;
  }

  recordRequest(teamId, responseTime, success = true) {
    const teamMetrics = this.metrics.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.requests++;
      teamMetrics.responseTime.push(responseTime);
      if (!success) {
        teamMetrics.errors++;
      }
    }

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (responseTime > this.metrics.peakResponseTime) {
      this.metrics.peakResponseTime = responseTime;
    }
  }

  recordWebSocketEvent(teamId, eventType, success = true) {
    const teamMetrics = this.metrics.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.websocketEvents++;
      if (!success) {
        teamMetrics.errors++;
      }
    }

    if (success) {
      this.metrics.websocketConnections++;
    } else {
      this.metrics.websocketErrors++;
    }
  }

  recordSubmission(teamId, success = true) {
    const teamMetrics = this.metrics.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.submissions++;
    }

    this.metrics.submissionsSent++;
    if (success) {
      this.metrics.submissionsProcessed++;
    }
  }

  async generateResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const successRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0;

    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        maxConcurrentTeams: this.config.maxConcurrentTeams,
        simulationDuration: this.config.simulationDuration,
        serverUrl: this.config.serverUrl
      },
      summary: {
        duration: `${duration}ms`,
        teamsSimulated: this.teams.length,
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: `${successRate.toFixed(2)}%`,
        averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
        peakResponseTime: `${this.metrics.peakResponseTime}ms`,
        submissionsSent: this.metrics.submissionsSent,
        submissionsProcessed: this.metrics.submissionsProcessed,
        websocketConnections: this.metrics.websocketConnections,
        websocketErrors: this.metrics.websocketErrors
      },
      performance: {
        requestsPerSecond: Math.round(this.metrics.totalRequests / (duration / 1000)),
        submissionsPerSecond: Math.round(this.metrics.submissionsSent / (duration / 1000)),
        averageTeamsActive: Math.round(this.teams.length * 0.8), // Estimate
        peakConcurrentConnections: Math.max(...this.metrics.timeSeriesData.map(d => d.activeConnections))
      },
      teamMetrics: Array.from(this.metrics.teamMetrics.entries()).map(([teamId, metrics]) => ({
        teamId,
        teamName: metrics.teamName,
        behaviorType: metrics.behaviorType,
        requests: metrics.requests,
        submissions: metrics.submissions,
        websocketEvents: metrics.websocketEvents,
        errors: metrics.errors,
        averageResponseTime: metrics.responseTime.length > 0 ? 
          metrics.responseTime.reduce((sum, time) => sum + time, 0) / metrics.responseTime.length : 0
      })),
      timeSeriesData: this.metrics.timeSeriesData,
      errors: this.metrics.errors
    };

    // Save detailed results
    fs.writeFileSync(
      path.join(this.config.resultsPath, 'team-simulation-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate CSV for analysis
    this.generateCSVReport(report);

    // Print summary
    this.printSummary(report);
  }

  generateCSVReport(report) {
    const csvLines = [
      'timestamp,activeConnections,totalRequests,totalWebsocketEvents,averageResponseTime'
    ];

    for (const data of report.timeSeriesData) {
      csvLines.push(
        `${new Date(data.timestamp).toISOString()},${data.activeConnections},${data.totalRequests},${data.totalWebsocketEvents},${data.averageResponseTime}`
      );
    }

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'team-simulation-timeseries.csv'),
      csvLines.join('\n')
    );
  }

  printSummary(report) {
    console.log(chalk.cyan('\n📊 TEAM SIMULATION RESULTS'));
    console.log('='.repeat(50));
    console.log(chalk.white(`Duration: ${report.summary.duration}`));
    console.log(chalk.white(`Teams Simulated: ${report.summary.teamsSimulated}`));
    console.log(chalk.white(`Total Requests: ${report.summary.totalRequests}`));
    console.log(chalk.white(`Success Rate: ${report.summary.successRate}`));
    console.log(chalk.white(`Average Response Time: ${report.summary.averageResponseTime}`));
    console.log(chalk.white(`Peak Response Time: ${report.summary.peakResponseTime}`));
    console.log(chalk.white(`Requests/Second: ${report.performance.requestsPerSecond}`));
    console.log(chalk.white(`Submissions Sent: ${report.summary.submissionsSent}`));
    console.log(chalk.white(`WebSocket Connections: ${report.summary.websocketConnections}`));

    if (report.errors.length > 0) {
      console.log(chalk.yellow(`\n⚠️ Errors Encountered: ${report.errors.length}`));
    }

    console.log(chalk.green(`\n📁 Results saved to: ${this.config.resultsPath}`));
  }

  async cleanup() {
    const spinner = ora('Cleaning up simulation...').start();
    
    try {
      // Stop all teams
      await Promise.all(this.teams.map(team => team.stop()));
      
      // Close all WebSocket connections
      for (const [teamId, connection] of this.activeConnections.entries()) {
        if (connection.readyState === WebSocket.OPEN) {
          connection.close();
        }
      }
      this.activeConnections.clear();
      
      spinner.succeed('Cleanup completed');
    } catch (error) {
      spinner.fail('Cleanup failed');
      console.error(error);
    }
  }
}

class VirtualTeam {
  constructor(config) {
    this.id = config.id;
    this.teamName = config.teamName;
    this.token = config.token;
    this.contestId = config.contestId;
    this.problems = config.problems;
    this.codeSamples = config.codeSamples;
    this.serverUrl = config.serverUrl;
    this.wsUrl = config.wsUrl;
    this.behavior = config.behavior;
    this.behaviorType = config.behaviorType;
    this.simulation = config.simulation;

    this.isActive = false;
    this.websocket = null;
    this.currentProblem = null;
    this.submissionCount = 0;
    this.lastActivity = Date.now();
  }

  async start() {
    this.isActive = true;
    
    try {
      await this.connectWebSocket();
      await this.authenticateWithServer();
      this.runBehaviorLoop();
    } catch (error) {
      console.error(chalk.red(`Team ${this.teamName} startup failed:`), error.message);
      this.isActive = false;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(`${this.wsUrl}?token=${this.token}`);
      
      this.websocket.on('open', () => {
        this.simulation.activeConnections.set(this.id, this.websocket);
        this.simulation.recordWebSocketEvent(this.id, 'connect');
        resolve();
      });

      this.websocket.on('error', (error) => {
        this.simulation.recordWebSocketEvent(this.id, 'error', false);
        reject(error);
      });

      this.websocket.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });

      this.websocket.on('close', () => {
        this.simulation.activeConnections.delete(this.id);
        if (this.isActive) {
          // Attempt reconnection
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      });

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
  }

  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data);
      this.simulation.recordWebSocketEvent(this.id, message.type || 'message');
      
      // Simulate realistic responses to different message types
      switch (message.type) {
        case 'leaderboard_update':
          // Maybe check leaderboard details
          if (Math.random() < 0.3) {
            setTimeout(() => this.checkLeaderboard(), Math.random() * 5000);
          }
          break;
        case 'submission_update':
          // React to submission results
          if (message.teamId === this.id) {
            this.handleSubmissionResult(message);
          }
          break;
        case 'contest_notification':
          // All teams react to contest events
          this.handleContestNotification(message);
          break;
      }
    } catch (error) {
      this.simulation.recordWebSocketEvent(this.id, 'message_parse_error', false);
    }
  }

  async authenticateWithServer() {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.serverUrl}/api/team/status`, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, response.status === 200);
      
      if (response.status !== 200) {
        throw new Error(`Authentication failed: ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, false);
      throw error;
    }
  }

  async runBehaviorLoop() {
    while (this.isActive) {
      try {
        await this.performRandomAction();
        await this.sleep(this.calculateNextActionDelay());
        this.lastActivity = Date.now();
      } catch (error) {
        console.error(`Team ${this.teamName} behavior error:`, error.message);
        await this.sleep(5000); // Wait before retrying
      }
    }
  }

  async performRandomAction() {
    const actions = [
      { action: 'submitSolution', weight: this.behavior.submissionFrequency },
      { action: 'checkLeaderboard', weight: this.behavior.leaderboardCheckRate },
      { action: 'switchProblem', weight: this.behavior.problemSwitchRate },
      { action: 'viewProblem', weight: 0.4 },
      { action: 'checkSubmissions', weight: 0.2 }
    ];

    const selectedAction = this.weightedRandomSelect(actions);
    await this[selectedAction]();
  }

  weightedRandomSelect(actions) {
    const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const action of actions) {
      currentWeight += action.weight;
      if (random <= currentWeight) {
        return action.action;
      }
    }
    
    return actions[0].action; // Fallback
  }

  async submitSolution() {
    if (!this.currentProblem) {
      this.currentProblem = this.selectRandomProblem();
    }

    const language = this.selectRandomLanguage();
    const code = this.getCodeSample(this.currentProblem.problem_letter, language);
    
    const startTime = Date.now();
    try {
      const response = await axios.post(
        `${this.serverUrl}/api/team/submissions`,
        {
          problemId: this.currentProblem.id,
          language,
          sourceCode: code
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, response.status === 201);
      this.simulation.recordSubmission(this.id, response.status === 201);
      this.submissionCount++;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, false);
      this.simulation.recordSubmission(this.id, false);
    }
  }

  async checkLeaderboard() {
    const startTime = Date.now();
    try {
      const response = await axios.get(
        `${this.serverUrl}/api/team/contests/${this.contestId}/leaderboard`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 10000
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, response.status === 200);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, false);
    }
  }

  async switchProblem() {
    this.currentProblem = this.selectRandomProblem();
    await this.viewProblem();
  }

  async viewProblem() {
    if (!this.currentProblem) {
      this.currentProblem = this.selectRandomProblem();
    }

    const startTime = Date.now();
    try {
      const response = await axios.get(
        `${this.serverUrl}/api/team/contests/${this.contestId}/problems/${this.currentProblem.id}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 10000
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, response.status === 200);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, false);
    }
  }

  async checkSubmissions() {
    const startTime = Date.now();
    try {
      const response = await axios.get(
        `${this.serverUrl}/api/team/submissions`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 10000
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, response.status === 200);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.simulation.recordRequest(this.id, responseTime, false);
    }
  }

  selectRandomProblem() {
    return this.problems[Math.floor(Math.random() * this.problems.length)];
  }

  selectRandomLanguage() {
    const languages = Object.keys(this.codeSamples);
    return languages[Math.floor(Math.random() * languages.length)];
  }

  getCodeSample(problemLetter, language) {
    const samples = this.codeSamples[language];
    if (!samples) return '// No sample available';

    // Select appropriate code sample (sometimes wrong for testing)
    const sampleKeys = Object.keys(samples);
    const shouldBeWrong = Math.random() < 0.1; // 10% wrong submissions
    
    if (shouldBeWrong && samples.wrong_answer) {
      return samples.wrong_answer;
    }
    
    // Try to match problem type
    const problemMap = {
      'A': 'addition',
      'B': 'array_max',
      'C': 'string_reverse',
      'D': 'binary_search',
      'E': 'dynamic_programming',
      'F': 'graph_traversal'
    };
    
    const targetSample = problemMap[problemLetter];
    if (samples[targetSample]) {
      return samples[targetSample];
    }
    
    // Fallback to random sample
    const randomSample = sampleKeys[Math.floor(Math.random() * sampleKeys.length)];
    return samples[randomSample];
  }

  calculateNextActionDelay() {
    const { min, max } = this.behavior.idleTime;
    return (min + Math.random() * (max - min)) * 1000;
  }

  handleSubmissionResult(message) {
    // React to submission results (maybe retry on error)
    if (message.verdict === 'Wrong Answer' && Math.random() < 0.5) {
      // 50% chance to resubmit
      setTimeout(() => this.submitSolution(), Math.random() * 30000);
    }
  }

  handleContestNotification(message) {
    // React to contest events
    switch (message.event) {
      case 'contest_started':
        // Increase activity
        this.behavior.submissionFrequency *= 1.5;
        break;
      case 'time_warning':
        // Panic mode - more submissions
        this.behavior.submissionFrequency *= 2;
        break;
      case 'contest_ended':
        this.stop();
        break;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isActive = false;
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
    }
  }
}

// Run simulation if called directly
if (require.main === module) {
  const config = {
    maxConcurrentTeams: process.env.MAX_TEAMS ? parseInt(process.env.MAX_TEAMS) : 50,
    simulationDuration: process.env.DURATION ? parseInt(process.env.DURATION) : 300000,
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    wsUrl: process.env.WS_URL || 'ws://localhost:3000'
  };

  const simulation = new TeamSimulation(config);
  simulation.startSimulation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Simulation failed:'), error);
      process.exit(1);
    });
}

module.exports = TeamSimulation;