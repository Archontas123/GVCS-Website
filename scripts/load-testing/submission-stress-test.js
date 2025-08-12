/**
 * CS Club Hackathon Platform - Submission Stress Test
 * Phase 6.1, Task 3: High-volume submission testing
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class SubmissionStressTest {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      maxConcurrentSubmissions: config.maxConcurrentSubmissions || 100,
      submissionsPerSecond: config.submissionsPerSecond || 10,
      testDuration: config.testDuration || 120000, // 2 minutes
      workerCount: config.workerCount || 4,
      testDataPath: config.testDataPath || path.join(__dirname, 'test-data'),
      resultsPath: config.resultsPath || path.join(__dirname, 'results'),
      ...config
    };

    this.workers = [];
    this.metrics = {
      startTime: null,
      endTime: null,
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      processingTimeouts: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      minResponseTime: Infinity,
      responseTimeDistribution: {
        '<100ms': 0,
        '100-500ms': 0,
        '500ms-1s': 0,
        '1s-5s': 0,
        '>5s': 0
      },
      verdictDistribution: {
        'Accepted': 0,
        'Wrong Answer': 0,
        'Time Limit Exceeded': 0,
        'Runtime Error': 0,
        'Compile Error': 0,
        'Pending': 0,
        'Judging': 0
      },
      languageDistribution: {},
      problemDistribution: {},
      errors: [],
      timeSeriesData: [],
      workerMetrics: new Map()
    };

    this.loadTestData();
  }

  loadTestData() {
    try {
      const credentialsPath = path.join(this.config.testDataPath, 'team-credentials.json');
      const contestPath = path.join(this.config.testDataPath, 'contest-info.json');
      const samplesPath = path.join(this.config.testDataPath, 'code-samples.json');

      this.teamCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      this.contestInfo = JSON.parse(fs.readFileSync(contestPath, 'utf8'));
      this.codeSamples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));

      console.log(chalk.green(`✅ Loaded test data for ${this.teamCredentials.length} teams`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to load test data:'), error.message);
      process.exit(1);
    }
  }

  async startStressTest() {
    console.log(chalk.blue.bold('🚀 Starting Submission Stress Test\n'));
    this.metrics.startTime = Date.now();

    try {
      await this.validateEnvironment();
      await this.spawnWorkers();
      await this.runStressTest();
      
      this.metrics.endTime = Date.now();
      await this.generateResults();
      
      console.log(chalk.green.bold('\n✅ Submission stress test completed!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Stress test failed:'), error.message);
      this.metrics.errors.push({
        phase: 'stress-test',
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
      const healthResponse = await axios.get(`${this.config.serverUrl}/api/health`, {
        timeout: 5000
      });

      if (healthResponse.status !== 200) {
        throw new Error('Server health check failed');
      }

      // Test single submission to ensure endpoints work
      const testTeam = this.teamCredentials[0];
      const testProblem = this.contestInfo.problems[0];
      const testCode = this.codeSamples.cpp.addition;

      const testResponse = await axios.post(
        `${this.config.serverUrl}/api/team/submissions`,
        {
          problemId: testProblem.id,
          language: 'cpp',
          sourceCode: testCode
        },
        {
          headers: {
            Authorization: `Bearer ${testTeam.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (testResponse.status !== 201) {
        throw new Error('Test submission failed');
      }

      spinner.succeed('Environment validation passed');
    } catch (error) {
      spinner.fail('Environment validation failed');
      throw error;
    }
  }

  async spawnWorkers() {
    const spinner = ora('Spawning submission workers...').start();
    
    for (let i = 0; i < this.config.workerCount; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          serverUrl: this.config.serverUrl,
          teamCredentials: this.teamCredentials,
          contestInfo: this.contestInfo,
          codeSamples: this.codeSamples,
          submissionsPerWorker: Math.ceil(this.config.submissionsPerSecond / this.config.workerCount),
          testDuration: this.config.testDuration
        }
      });

      worker.on('message', (data) => {
        this.handleWorkerMessage(i, data);
      });

      worker.on('error', (error) => {
        console.error(chalk.red(`Worker ${i} error:`), error);
        this.metrics.errors.push({
          phase: 'worker',
          workerId: i,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`Worker ${i} exited with code ${code}`));
        }
      });

      this.workers.push(worker);
      this.metrics.workerMetrics.set(i, {
        submissions: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimesSum: 0
      });
    }
    
    spinner.succeed(`${this.config.workerCount} submission workers spawned`);
  }

  handleWorkerMessage(workerId, data) {
    const workerMetrics = this.metrics.workerMetrics.get(workerId);
    
    switch (data.type) {
      case 'submission_completed':
        this.recordSubmissionResult(workerId, data);
        break;
      case 'submission_failed':
        this.recordSubmissionFailure(workerId, data);
        break;
      case 'worker_stats':
        this.updateWorkerStats(workerId, data);
        break;
      case 'metrics_update':
        this.collectWorkerMetrics(workerId, data);
        break;
    }
  }

  recordSubmissionResult(workerId, data) {
    const workerMetrics = this.metrics.workerMetrics.get(workerId);
    
    workerMetrics.submissions++;
    workerMetrics.successful++;
    workerMetrics.responseTimesSum += data.responseTime;
    workerMetrics.averageResponseTime = workerMetrics.responseTimesSum / workerMetrics.submissions;

    this.metrics.totalSubmissions++;
    this.metrics.successfulSubmissions++;
    
    // Update response time metrics
    if (data.responseTime > this.metrics.peakResponseTime) {
      this.metrics.peakResponseTime = data.responseTime;
    }
    if (data.responseTime < this.metrics.minResponseTime) {
      this.metrics.minResponseTime = data.responseTime;
    }

    // Update response time distribution
    this.updateResponseTimeDistribution(data.responseTime);

    // Update verdict distribution
    if (data.verdict) {
      this.metrics.verdictDistribution[data.verdict] = 
        (this.metrics.verdictDistribution[data.verdict] || 0) + 1;
    }

    // Update language distribution
    if (data.language) {
      this.metrics.languageDistribution[data.language] = 
        (this.metrics.languageDistribution[data.language] || 0) + 1;
    }

    // Update problem distribution
    if (data.problemId) {
      this.metrics.problemDistribution[data.problemId] = 
        (this.metrics.problemDistribution[data.problemId] || 0) + 1;
    }
  }

  recordSubmissionFailure(workerId, data) {
    const workerMetrics = this.metrics.workerMetrics.get(workerId);
    
    workerMetrics.submissions++;
    workerMetrics.failed++;

    this.metrics.totalSubmissions++;
    this.metrics.failedSubmissions++;

    this.metrics.errors.push({
      phase: 'submission',
      workerId,
      error: data.error,
      timestamp: new Date().toISOString()
    });
  }

  updateResponseTimeDistribution(responseTime) {
    if (responseTime < 100) {
      this.metrics.responseTimeDistribution['<100ms']++;
    } else if (responseTime < 500) {
      this.metrics.responseTimeDistribution['100-500ms']++;
    } else if (responseTime < 1000) {
      this.metrics.responseTimeDistribution['500ms-1s']++;
    } else if (responseTime < 5000) {
      this.metrics.responseTimeDistribution['1s-5s']++;
    } else {
      this.metrics.responseTimeDistribution['>5s']++;
    }
  }

  collectWorkerMetrics(workerId, data) {
    this.metrics.timeSeriesData.push({
      timestamp: Date.now(),
      workerId,
      ...data
    });
  }

  async runStressTest() {
    const spinner = ora('Running submission stress test...').start();
    
    // Start all workers
    this.workers.forEach(worker => {
      worker.postMessage({ command: 'start' });
    });

    // Monitor progress
    const monitorInterval = setInterval(() => {
      this.displayProgress(spinner);
    }, 2000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration));

    // Stop all workers
    this.workers.forEach(worker => {
      worker.postMessage({ command: 'stop' });
    });

    // Wait for workers to finish
    await new Promise(resolve => setTimeout(resolve, 5000));

    clearInterval(monitorInterval);
    spinner.succeed('Stress test completed');
  }

  displayProgress(spinner) {
    const elapsed = Date.now() - this.metrics.startTime;
    const remaining = Math.max(0, this.config.testDuration - elapsed);
    
    const submissionsPerSecond = elapsed > 0 ? 
      Math.round(this.metrics.totalSubmissions / (elapsed / 1000)) : 0;
    
    const successRate = this.metrics.totalSubmissions > 0 ? 
      Math.round((this.metrics.successfulSubmissions / this.metrics.totalSubmissions) * 100) : 0;

    spinner.text = `Running stress test... Submissions: ${this.metrics.totalSubmissions}, ` +
                  `Rate: ${submissionsPerSecond}/s, Success: ${successRate}%, ` +
                  `Time: ${Math.floor(elapsed / 1000)}s`;
  }

  async generateResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const successRate = this.metrics.totalSubmissions > 0 ? 
      (this.metrics.successfulSubmissions / this.metrics.totalSubmissions) * 100 : 0;

    // Calculate average response time across all workers
    let totalResponseTime = 0;
    let totalSubmissions = 0;
    
    for (const [workerId, metrics] of this.metrics.workerMetrics.entries()) {
      totalResponseTime += metrics.responseTimesSum;
      totalSubmissions += metrics.submissions;
    }
    
    this.metrics.averageResponseTime = totalSubmissions > 0 ? 
      totalResponseTime / totalSubmissions : 0;

    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        maxConcurrentSubmissions: this.config.maxConcurrentSubmissions,
        submissionsPerSecond: this.config.submissionsPerSecond,
        testDuration: this.config.testDuration,
        workerCount: this.config.workerCount,
        serverUrl: this.config.serverUrl
      },
      summary: {
        duration: `${duration}ms`,
        totalSubmissions: this.metrics.totalSubmissions,
        successfulSubmissions: this.metrics.successfulSubmissions,
        failedSubmissions: this.metrics.failedSubmissions,
        successRate: `${successRate.toFixed(2)}%`,
        averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
        peakResponseTime: `${this.metrics.peakResponseTime}ms`,
        minResponseTime: this.metrics.minResponseTime === Infinity ? 0 : `${this.metrics.minResponseTime}ms`
      },
      performance: {
        submissionsPerSecond: Math.round(this.metrics.totalSubmissions / (duration / 1000)),
        actualRate: Math.round(this.metrics.totalSubmissions / (duration / 1000)),
        targetRate: this.config.submissionsPerSecond,
        rateAchievement: `${Math.round((this.metrics.totalSubmissions / (duration / 1000)) / this.config.submissionsPerSecond * 100)}%`
      },
      distributions: {
        responseTime: this.metrics.responseTimeDistribution,
        verdict: this.metrics.verdictDistribution,
        language: this.metrics.languageDistribution,
        problem: this.metrics.problemDistribution
      },
      workerMetrics: Array.from(this.metrics.workerMetrics.entries()).map(([workerId, metrics]) => ({
        workerId,
        submissions: metrics.submissions,
        successful: metrics.successful,
        failed: metrics.failed,
        successRate: metrics.submissions > 0 ? `${(metrics.successful / metrics.submissions * 100).toFixed(2)}%` : '0%',
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`
      })),
      timeSeriesData: this.metrics.timeSeriesData,
      errors: this.metrics.errors
    };

    // Save detailed results
    fs.writeFileSync(
      path.join(this.config.resultsPath, 'submission-stress-test-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate CSV for analysis
    this.generateCSVReport(report);

    // Print summary
    this.printSummary(report);
  }

  generateCSVReport(report) {
    const csvLines = [
      'timestamp,workerId,submissions,successful,failed,averageResponseTime'
    ];

    for (const workerData of report.workerMetrics) {
      csvLines.push(
        `${report.timestamp},${workerData.workerId},${workerData.submissions},${workerData.successful},${workerData.failed},${workerData.averageResponseTime}`
      );
    }

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'submission-stress-test-workers.csv'),
      csvLines.join('\n')
    );
  }

  printSummary(report) {
    console.log(chalk.cyan('\n📊 SUBMISSION STRESS TEST RESULTS'));
    console.log('='.repeat(50));
    console.log(chalk.white(`Duration: ${report.summary.duration}`));
    console.log(chalk.white(`Total Submissions: ${report.summary.totalSubmissions}`));
    console.log(chalk.white(`Successful: ${report.summary.successfulSubmissions}`));
    console.log(chalk.white(`Failed: ${report.summary.failedSubmissions}`));
    console.log(chalk.white(`Success Rate: ${report.summary.successRate}`));
    console.log(chalk.white(`Average Response Time: ${report.summary.averageResponseTime}`));
    console.log(chalk.white(`Peak Response Time: ${report.summary.peakResponseTime}`));
    console.log(chalk.white(`Actual Rate: ${report.performance.submissionsPerSecond}/s`));
    console.log(chalk.white(`Target Rate: ${report.performance.targetRate}/s`));
    console.log(chalk.white(`Rate Achievement: ${report.performance.rateAchievement}`));

    console.log(chalk.cyan('\n📈 Response Time Distribution:'));
    for (const [range, count] of Object.entries(report.distributions.responseTime)) {
      console.log(chalk.white(`  ${range}: ${count}`));
    }

    console.log(chalk.cyan('\n🎯 Verdict Distribution:'));
    for (const [verdict, count] of Object.entries(report.distributions.verdict)) {
      if (count > 0) {
        console.log(chalk.white(`  ${verdict}: ${count}`));
      }
    }

    if (report.errors.length > 0) {
      console.log(chalk.yellow(`\n⚠️ Errors Encountered: ${report.errors.length}`));
    }

    console.log(chalk.green(`\n📁 Results saved to: ${this.config.resultsPath}`));
  }

  async cleanup() {
    const spinner = ora('Cleaning up workers...').start();
    
    try {
      // Terminate all workers
      await Promise.all(this.workers.map(worker => worker.terminate()));
      this.workers = [];
      
      spinner.succeed('Cleanup completed');
    } catch (error) {
      spinner.fail('Cleanup failed');
      console.error(error);
    }
  }
}

// Worker thread code
if (!isMainThread) {
  const { workerId, serverUrl, teamCredentials, contestInfo, codeSamples, submissionsPerWorker, testDuration } = workerData;
  
  class SubmissionWorker {
    constructor() {
      this.isRunning = false;
      this.submissionCount = 0;
      this.successCount = 0;
      this.failCount = 0;
    }

    async start() {
      this.isRunning = true;
      const endTime = Date.now() + testDuration;
      
      while (this.isRunning && Date.now() < endTime) {
        try {
          await this.submitSolution();
          
          // Control submission rate
          const delay = 1000 / submissionsPerWorker;
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (error) {
          parentPort.postMessage({
            type: 'submission_failed',
            error: error.message,
            timestamp: Date.now()
          });
          this.failCount++;
        }
      }
    }

    async submitSolution() {
      const team = this.getRandomTeam();
      const problem = this.getRandomProblem();
      const language = this.getRandomLanguage();
      const code = this.getCodeSample(problem, language);

      const startTime = Date.now();
      
      try {
        const response = await axios.post(
          `${serverUrl}/api/team/submissions`,
          {
            problemId: problem.id,
            language,
            sourceCode: code
          },
          {
            headers: {
              Authorization: `Bearer ${team.token}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const responseTime = Date.now() - startTime;
        
        if (response.status === 201) {
          this.submissionCount++;
          this.successCount++;
          
          parentPort.postMessage({
            type: 'submission_completed',
            responseTime,
            language,
            problemId: problem.id,
            verdict: 'Pending', // Initial verdict
            timestamp: Date.now()
          });
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        parentPort.postMessage({
          type: 'submission_failed',
          error: error.message,
          responseTime,
          language,
          problemId: problem.id,
          timestamp: Date.now()
        });
        
        this.failCount++;
      }
    }

    getRandomTeam() {
      return teamCredentials[Math.floor(Math.random() * teamCredentials.length)];
    }

    getRandomProblem() {
      return contestInfo.problems[Math.floor(Math.random() * contestInfo.problems.length)];
    }

    getRandomLanguage() {
      const languages = Object.keys(codeSamples);
      return languages[Math.floor(Math.random() * languages.length)];
    }

    getCodeSample(problem, language) {
      const samples = codeSamples[language];
      if (!samples) return '// No sample available';

      // Occasionally submit wrong code for testing
      const shouldBeWrong = Math.random() < 0.15; // 15% wrong submissions
      if (shouldBeWrong && samples.wrong_answer) {
        return samples.wrong_answer;
      }

      // Try to match problem
      const problemMap = {
        'A': 'addition',
        'B': 'array_max',
        'C': 'string_reverse',
        'D': 'binary_search',
        'E': 'dynamic_programming',
        'F': 'graph_traversal'
      };

      const targetSample = problemMap[problem.problem_letter];
      if (samples[targetSample]) {
        return samples[targetSample];
      }

      // Fallback to random sample
      const sampleKeys = Object.keys(samples);
      const randomSample = sampleKeys[Math.floor(Math.random() * sampleKeys.length)];
      return samples[randomSample];
    }

    stop() {
      this.isRunning = false;
    }
  }

  const worker = new SubmissionWorker();

  parentPort.on('message', async (message) => {
    switch (message.command) {
      case 'start':
        await worker.start();
        break;
      case 'stop':
        worker.stop();
        break;
    }
  });
}

// Run stress test if called directly
if (require.main === module && isMainThread) {
  const config = {
    maxConcurrentSubmissions: process.env.MAX_CONCURRENT ? parseInt(process.env.MAX_CONCURRENT) : 100,
    submissionsPerSecond: process.env.SUBMISSIONS_PER_SEC ? parseInt(process.env.SUBMISSIONS_PER_SEC) : 10,
    testDuration: process.env.TEST_DURATION ? parseInt(process.env.TEST_DURATION) : 120000,
    workerCount: process.env.WORKER_COUNT ? parseInt(process.env.WORKER_COUNT) : 4,
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000'
  };

  const stressTest = new SubmissionStressTest(config);
  stressTest.startStressTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Stress test failed:'), error);
      process.exit(1);
    });
}

module.exports = SubmissionStressTest;