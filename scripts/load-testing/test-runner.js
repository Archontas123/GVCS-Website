/**
 * CS Club Hackathon Platform - Load Test Runner
 * Phase 6.1: Comprehensive load testing orchestrator
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { spawn } = require('child_process');

// Import test modules
const TestEnvironmentSetup = require('./setup-test-environment');
const TeamSimulation = require('./team-simulation');
const SubmissionStressTest = require('./submission-stress-test');
const DatabaseLoadTest = require('./database-load-test');
const PerformanceMonitor = require('./performance-monitor');

class LoadTestRunner {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      wsUrl: config.wsUrl || 'ws://localhost:3000',
      testSuites: config.testSuites || ['setup', 'team-simulation', 'submission-stress', 'database-load', 'performance-monitor'],
      maxConcurrentTeams: config.maxConcurrentTeams || 50,
      submissionRate: config.submissionRate || 10,
      testDuration: config.testDuration || 300000, // 5 minutes
      resultsPath: config.resultsPath || path.join(__dirname, 'results'),
      parallel: config.parallel || false,
      generateReport: config.generateReport !== false,
      ...config
    };

    this.results = {
      startTime: null,
      endTime: null,
      testResults: new Map(),
      overallSuccess: false,
      errors: [],
      summary: {}
    };

    this.testModules = {
      'setup': TestEnvironmentSetup,
      'team-simulation': TeamSimulation,
      'submission-stress': SubmissionStressTest,
      'database-load': DatabaseLoadTest,
      'performance-monitor': PerformanceMonitor
    };
  }

  async runLoadTests() {
    console.log(chalk.blue.bold('🚀 Starting Comprehensive Load Testing Suite\n'));
    this.results.startTime = Date.now();

    try {
      await this.validateConfiguration();
      await this.prepareEnvironment();

      if (this.config.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }

      this.results.endTime = Date.now();
      this.calculateOverallResults();

      if (this.config.generateReport) {
        await this.generateComprehensiveReport();
      }

      console.log(chalk.green.bold('\n✅ Load testing suite completed!'));
      return this.results.overallSuccess;

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Load testing suite failed:'), error.message);
      this.results.errors.push({
        phase: 'runner',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async validateConfiguration() {
    const spinner = ora('Validating test configuration...').start();

    try {
      // Check if results directory exists
      if (!fs.existsSync(this.config.resultsPath)) {
        fs.mkdirSync(this.config.resultsPath, { recursive: true });
      }

      // Validate test suites
      for (const testSuite of this.config.testSuites) {
        if (!this.testModules[testSuite]) {
          throw new Error(`Unknown test suite: ${testSuite}`);
        }
      }

      // Validate server availability (for non-setup tests)
      if (this.config.testSuites.some(suite => suite !== 'setup')) {
        try {
          const axios = require('axios');
          await axios.get(`${this.config.serverUrl}/api/health`, { timeout: 5000 });
        } catch (error) {
          console.log(chalk.yellow('\n⚠️ Warning: Server not accessible. Some tests may fail.'));
        }
      }

      spinner.succeed('Configuration validated');
    } catch (error) {
      spinner.fail('Configuration validation failed');
      throw error;
    }
  }

  async prepareEnvironment() {
    const spinner = ora('Preparing test environment...').start();

    try {
      // Ensure all required directories exist
      const requiredDirs = [
        path.join(this.config.resultsPath, 'performance'),
        path.join(this.config.resultsPath, 'load-tests'),
        path.join(__dirname, 'test-data'),
        path.join(__dirname, 'logs')
      ];

      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Clear any previous test results if requested
      if (this.config.clearPrevious) {
        const resultFiles = fs.readdirSync(this.config.resultsPath)
          .filter(file => file.endsWith('.json') || file.endsWith('.csv'))
          .map(file => path.join(this.config.resultsPath, file));

        for (const file of resultFiles) {
          fs.unlinkSync(file);
        }
      }

      spinner.succeed('Environment prepared');
    } catch (error) {
      spinner.fail('Environment preparation failed');
      throw error;
    }
  }

  async runTestsSequentially() {
    console.log(chalk.cyan('\n📋 Running tests sequentially...\n'));

    for (const testSuite of this.config.testSuites) {
      console.log(chalk.blue(`\n🔄 Running ${testSuite}...`));
      
      const startTime = Date.now();
      try {
        const success = await this.runSingleTest(testSuite);
        const endTime = Date.now();

        this.results.testResults.set(testSuite, {
          success,
          duration: endTime - startTime,
          startTime,
          endTime,
          errors: []
        });

        if (success) {
          console.log(chalk.green(`✅ ${testSuite} completed successfully`));
        } else {
          console.log(chalk.red(`❌ ${testSuite} failed`));
        }

      } catch (error) {
        const endTime = Date.now();
        console.log(chalk.red(`❌ ${testSuite} failed:`, error.message));
        
        this.results.testResults.set(testSuite, {
          success: false,
          duration: endTime - startTime,
          startTime,
          endTime,
          errors: [error.message]
        });
      }
    }
  }

  async runTestsInParallel() {
    console.log(chalk.cyan('\n📋 Running tests in parallel...\n'));

    const testPromises = this.config.testSuites.map(async (testSuite) => {
      const startTime = Date.now();
      
      try {
        const success = await this.runSingleTest(testSuite);
        const endTime = Date.now();

        this.results.testResults.set(testSuite, {
          success,
          duration: endTime - startTime,
          startTime,
          endTime,
          errors: []
        });

        return { testSuite, success };
      } catch (error) {
        const endTime = Date.now();
        
        this.results.testResults.set(testSuite, {
          success: false,
          duration: endTime - startTime,
          startTime,
          endTime,
          errors: [error.message]
        });

        return { testSuite, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(testPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { testSuite, success, error } = result.value;
        if (success) {
          console.log(chalk.green(`✅ ${testSuite} completed successfully`));
        } else {
          console.log(chalk.red(`❌ ${testSuite} failed${error ? ': ' + error : ''}`));
        }
      } else {
        console.log(chalk.red(`❌ Test promise rejected:`, result.reason));
      }
    }
  }

  async runSingleTest(testSuite) {
    const TestClass = this.testModules[testSuite];
    
    const testConfig = this.getTestConfig(testSuite);
    const testInstance = new TestClass(testConfig);

    switch (testSuite) {
      case 'setup':
        return await testInstance.setupEnvironment();
      case 'team-simulation':
        return await testInstance.startSimulation();
      case 'submission-stress':
        return await testInstance.startStressTest();
      case 'database-load':
        return await testInstance.startLoadTest();
      case 'performance-monitor':
        return await testInstance.startMonitoring();
      default:
        throw new Error(`Unknown test suite: ${testSuite}`);
    }
  }

  getTestConfig(testSuite) {
    const baseConfig = {
      serverUrl: this.config.serverUrl,
      wsUrl: this.config.wsUrl,
      resultsPath: this.config.resultsPath,
      testDataPath: path.join(__dirname, 'test-data')
    };

    switch (testSuite) {
      case 'team-simulation':
        return {
          ...baseConfig,
          maxConcurrentTeams: this.config.maxConcurrentTeams,
          simulationDuration: this.config.testDuration
        };
      
      case 'submission-stress':
        return {
          ...baseConfig,
          submissionsPerSecond: this.config.submissionRate,
          testDuration: Math.min(this.config.testDuration, 120000), // Cap at 2 minutes for stress test
          workerCount: 4
        };
      
      case 'database-load':
        return {
          ...baseConfig,
          testDuration: Math.min(this.config.testDuration, 120000), // Cap at 2 minutes
          concurrentConnections: 20
        };
      
      case 'performance-monitor':
        return {
          ...baseConfig,
          monitoringDuration: this.config.testDuration,
          monitoringInterval: 5000
        };
      
      default:
        return baseConfig;
    }
  }

  calculateOverallResults() {
    const totalTests = this.results.testResults.size;
    const successfulTests = Array.from(this.results.testResults.values())
      .filter(result => result.success).length;

    this.results.overallSuccess = successfulTests === totalTests;
    
    this.results.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) + '%' : '0%',
      totalDuration: this.results.endTime - this.results.startTime,
      averageTestDuration: Array.from(this.results.testResults.values())
        .reduce((sum, result) => sum + result.duration, 0) / totalTests
    };
  }

  async generateComprehensiveReport() {
    const spinner = ora('Generating comprehensive report...').start();

    try {
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          testSuite: 'CS Club Hackathon Platform Load Testing',
          version: '6.1.0',
          environment: {
            serverUrl: this.config.serverUrl,
            wsUrl: this.config.wsUrl,
            nodeVersion: process.version,
            platform: process.platform
          }
        },
        configuration: this.config,
        summary: this.results.summary,
        testResults: this.convertMapToObject(this.results.testResults),
        overallSuccess: this.results.overallSuccess,
        errors: this.results.errors,
        recommendations: await this.generateRecommendations(),
        detailedResults: await this.loadDetailedResults()
      };

      // Save comprehensive report
      fs.writeFileSync(
        path.join(this.config.resultsPath, 'comprehensive-load-test-report.json'),
        JSON.stringify(report, null, 2)
      );

      // Generate HTML report
      await this.generateHTMLReport(report);

      // Generate executive summary
      await this.generateExecutiveSummary(report);

      spinner.succeed('Comprehensive report generated');
      
      console.log(chalk.green(`\n📊 Reports generated:`));
      console.log(chalk.white(`• comprehensive-load-test-report.json`));
      console.log(chalk.white(`• load-test-executive-summary.json`));
      console.log(chalk.white(`• load-test-report.html`));

    } catch (error) {
      spinner.fail('Report generation failed');
      console.error(error);
    }
  }

  convertMapToObject(map) {
    const obj = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  async loadDetailedResults() {
    const detailedResults = {};

    const resultFiles = {
      'setup': 'setup-report.json',
      'team-simulation': 'team-simulation-results.json',
      'submission-stress': 'submission-stress-test-results.json',
      'database-load': 'database-load-test-results.json',
      'performance-monitor': 'performance-monitoring-results.json'
    };

    for (const [testSuite, fileName] of Object.entries(resultFiles)) {
      const filePath = path.join(this.config.resultsPath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          detailedResults[testSuite] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.warn(`Warning: Could not load detailed results for ${testSuite}`);
        }
      }
    }

    return detailedResults;
  }

  async generateRecommendations() {
    const recommendations = [];

    // Analyze test results and generate recommendations
    for (const [testSuite, result] of this.results.testResults.entries()) {
      if (!result.success) {
        recommendations.push({
          category: 'Test Failures',
          priority: 'high',
          test: testSuite,
          issue: `${testSuite} test failed`,
          recommendation: `Review ${testSuite} test logs and address identified issues`,
          impact: 'System may not handle production load effectively'
        });
      }
    }

    // Performance-based recommendations
    if (this.results.testResults.has('performance-monitor')) {
      const perfResult = this.results.testResults.get('performance-monitor');
      if (perfResult.success) {
        try {
          const perfData = JSON.parse(fs.readFileSync(
            path.join(this.config.resultsPath, 'performance-monitoring-results.json'), 'utf8'
          ));
          
          recommendations.push(...(perfData.recommendations || []));
        } catch (error) {
          // Ignore if can't read performance data
        }
      }
    }

    // General recommendations based on configuration
    if (this.config.maxConcurrentTeams > 100) {
      recommendations.push({
        category: 'Scalability',
        priority: 'medium',
        test: 'configuration',
        issue: 'High concurrent user configuration',
        recommendation: 'Consider implementing horizontal scaling and load balancing for production',
        impact: 'Better handling of peak loads and improved reliability'
      });
    }

    // Add success-based recommendations
    if (this.results.overallSuccess) {
      recommendations.push({
        category: 'Success',
        priority: 'low',
        test: 'overall',
        issue: 'All tests passed successfully',
        recommendation: 'System appears ready for production deployment. Continue monitoring in production',
        impact: 'Maintain current performance levels and reliability'
      });
    }

    return recommendations;
  }

  async generateHTMLReport(report) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CS Club Hackathon Platform - Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .test-success { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .test-failure { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 8px; border-left: 3px solid #ffc107; background: #fffbf0; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 CS Club Hackathon Platform</h1>
            <h2>Load Testing Report</h2>
            <p class="timestamp">Generated: ${report.metadata.timestamp}</p>
            <p class="timestamp">Test Suite Version: ${report.metadata.version}</p>
        </div>

        <div class="metric-grid">
            <div class="metric-card">
                <h3>Overall Success</h3>
                <p class="${report.overallSuccess ? 'success' : 'failure'}">
                    ${report.overallSuccess ? '✅ PASSED' : '❌ FAILED'}
                </p>
            </div>
            <div class="metric-card">
                <h3>Success Rate</h3>
                <p class="info">${report.summary.successRate}</p>
            </div>
            <div class="metric-card">
                <h3>Total Duration</h3>
                <p class="info">${Math.round(report.summary.totalDuration / 1000)}s</p>
            </div>
            <div class="metric-card">
                <h3>Tests Run</h3>
                <p class="info">${report.summary.totalTests}</p>
            </div>
        </div>

        <h3>Test Results</h3>
        ${Object.entries(report.testResults).map(([testName, result]) => `
            <div class="test-result ${result.success ? 'test-success' : 'test-failure'}">
                <strong>${testName}</strong> - ${result.success ? '✅ PASSED' : '❌ FAILED'}
                <br>Duration: ${Math.round(result.duration / 1000)}s
                ${result.errors && result.errors.length > 0 ? `<br>Errors: ${result.errors.join(', ')}` : ''}
            </div>
        `).join('')}

        <div class="recommendations">
            <h3>📝 Recommendations</h3>
            ${report.recommendations.map(rec => `
                <div class="recommendation">
                    <strong>[${rec.priority.toUpperCase()}] ${rec.category}:</strong> ${rec.recommendation}
                    ${rec.impact ? `<br><small><em>Impact: ${rec.impact}</em></small>` : ''}
                </div>
            `).join('')}
        </div>

        <h3>Configuration</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(report.configuration, null, 2)}
        </pre>

        <div class="timestamp">
            <p><em>Report generated by CS Club Hackathon Platform Load Testing Suite v${report.metadata.version}</em></p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'load-test-report.html'),
      htmlTemplate
    );
  }

  async generateExecutiveSummary(report) {
    const executiveSummary = {
      title: 'CS Club Hackathon Platform - Load Testing Executive Summary',
      timestamp: report.metadata.timestamp,
      overallAssessment: {
        status: report.overallSuccess ? 'READY FOR PRODUCTION' : 'REQUIRES ATTENTION',
        confidence: report.overallSuccess ? 'HIGH' : 'LOW',
        successRate: report.summary.successRate
      },
      keyFindings: [
        {
          finding: `${report.summary.successfulTests} out of ${report.summary.totalTests} tests passed`,
          impact: report.overallSuccess ? 'Positive' : 'Negative'
        }
      ],
      criticalIssues: report.recommendations
        .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
        .map(rec => ({
          issue: rec.issue || rec.recommendation,
          priority: rec.priority,
          category: rec.category
        })),
      performanceHighlights: this.extractPerformanceHighlights(report),
      nextSteps: this.generateNextSteps(report),
      testConfiguration: {
        maxConcurrentTeams: report.configuration.maxConcurrentTeams,
        testDuration: `${report.configuration.testDuration / 1000}s`,
        submissionRate: `${report.configuration.submissionRate}/s`,
        serverUrl: report.configuration.serverUrl
      }
    };

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'load-test-executive-summary.json'),
      JSON.stringify(executiveSummary, null, 2)
    );
  }

  extractPerformanceHighlights(report) {
    const highlights = [];

    // Extract from detailed results if available
    if (report.detailedResults['performance-monitor']) {
      const perfData = report.detailedResults['performance-monitor'];
      highlights.push({
        metric: 'CPU Usage',
        value: perfData.summary.avgCpuUsage,
        status: parseFloat(perfData.summary.avgCpuUsage) < 70 ? 'Good' : 'Concerning'
      });
      highlights.push({
        metric: 'Memory Usage',
        value: perfData.summary.avgMemoryUsage,
        status: parseFloat(perfData.summary.avgMemoryUsage) < 75 ? 'Good' : 'Concerning'
      });
      highlights.push({
        metric: 'Response Time',
        value: perfData.summary.avgResponseTime,
        status: parseFloat(perfData.summary.avgResponseTime) < 500 ? 'Good' : 'Concerning'
      });
    }

    if (report.detailedResults['submission-stress']) {
      const stressData = report.detailedResults['submission-stress'];
      highlights.push({
        metric: 'Submission Processing',
        value: `${stressData.performance.submissionsPerSecond}/s`,
        status: stressData.performance.submissionsPerSecond >= stressData.performance.targetRate ? 'Good' : 'Below Target'
      });
    }

    return highlights;
  }

  generateNextSteps(report) {
    const nextSteps = [];

    if (report.overallSuccess) {
      nextSteps.push('✅ System ready for production deployment');
      nextSteps.push('📊 Set up production monitoring and alerting');
      nextSteps.push('🔄 Schedule regular load testing cycles');
    } else {
      nextSteps.push('🔧 Address failed test issues before production deployment');
      nextSteps.push('📋 Review detailed test logs for specific failure causes');
      nextSteps.push('⚡ Implement performance optimizations based on recommendations');
    }

    const criticalIssues = report.recommendations.filter(rec => rec.priority === 'critical').length;
    if (criticalIssues > 0) {
      nextSteps.unshift(`🚨 URGENT: Address ${criticalIssues} critical issues immediately`);
    }

    return nextSteps;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--server-url':
        config.serverUrl = args[++i];
        break;
      case '--ws-url':
        config.wsUrl = args[++i];
        break;
      case '--max-teams':
        config.maxConcurrentTeams = parseInt(args[++i]);
        break;
      case '--submission-rate':
        config.submissionRate = parseInt(args[++i]);
        break;
      case '--duration':
        config.testDuration = parseInt(args[++i]) * 1000; // Convert seconds to milliseconds
        break;
      case '--parallel':
        config.parallel = true;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--tests':
        config.testSuites = args[++i].split(',');
        break;
      case '--clear-previous':
        config.clearPrevious = true;
        break;
      case '--help':
        console.log(`
CS Club Hackathon Platform Load Test Runner

Usage: node test-runner.js [options]

Options:
  --server-url <url>      Server URL (default: http://localhost:3000)
  --ws-url <url>          WebSocket URL (default: ws://localhost:3000)
  --max-teams <number>    Maximum concurrent teams (default: 50)
  --submission-rate <n>   Submissions per second (default: 10)
  --duration <seconds>    Test duration in seconds (default: 300)
  --parallel              Run tests in parallel
  --no-report             Skip comprehensive report generation
  --tests <list>          Comma-separated list of tests to run
                          (setup,team-simulation,submission-stress,database-load,performance-monitor)
  --clear-previous        Clear previous test results
  --help                  Show this help message

Examples:
  node test-runner.js
  node test-runner.js --max-teams 100 --duration 600 --parallel
  node test-runner.js --tests setup,team-simulation --no-report
        `);
        process.exit(0);
        break;
    }
  }

  const runner = new LoadTestRunner(config);
  runner.runLoadTests()
    .then(success => {
      if (success) {
        console.log(chalk.green('\n🎉 All load tests completed successfully!'));
        console.log(chalk.white('The system appears ready for production deployment.'));
      } else {
        console.log(chalk.red('\n⚠️ Some load tests failed.'));
        console.log(chalk.white('Please review the results and address issues before production.'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Load test runner failed:'), error);
      process.exit(1);
    });
}

module.exports = LoadTestRunner;