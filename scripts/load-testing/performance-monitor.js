/**
 * CS Club Hackathon Platform - Performance Monitor
 * Phase 6.1, Task 5: System monitoring and performance optimization
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { performance } = require('perf_hooks');
const pidusage = require('pidusage');
const si = require('systeminformation');

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      monitoringInterval: config.monitoringInterval || 5000, // 5 seconds
      monitoringDuration: config.monitoringDuration || 300000, // 5 minutes
      alertThresholds: {
        cpuUsage: 80, // Percentage
        memoryUsage: 85, // Percentage
        responseTime: 2000, // Milliseconds
        errorRate: 10, // Percentage
        diskUsage: 90, // Percentage
        ...config.alertThresholds
      },
      resultsPath: config.resultsPath || path.join(__dirname, 'results'),
      logPath: config.logPath || path.join(__dirname, 'logs'),
      ...config
    };

    this.metrics = {
      startTime: null,
      endTime: null,
      systemMetrics: [],
      serverMetrics: [],
      alerts: [],
      summary: {
        avgCpuUsage: 0,
        peakCpuUsage: 0,
        avgMemoryUsage: 0,
        peakMemoryUsage: 0,
        avgResponseTime: 0,
        peakResponseTime: 0,
        totalRequests: 0,
        totalErrors: 0,
        uptime: 0
      },
      recommendations: []
    };

    this.serverProcess = null;
    this.isMonitoring = false;
  }

  async startMonitoring() {
    console.log(chalk.blue.bold('📊 Starting Performance Monitoring\n'));
    this.metrics.startTime = performance.now();

    try {
      await this.validateEnvironment();
      await this.detectServerProcess();
      await this.runMonitoring();
      
      this.metrics.endTime = performance.now();
      await this.generateResults();
      
      console.log(chalk.green.bold('\n✅ Performance monitoring completed!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Monitoring failed:'), error.message);
      return false;
    }
  }

  async validateEnvironment() {
    const spinner = ora('Validating monitoring environment...').start();
    
    try {
      // Check server availability
      const response = await axios.get(`${this.config.serverUrl}/api/health`, {
        timeout: 5000
      });

      if (response.status !== 200) {
        throw new Error('Server health check failed');
      }

      // Create necessary directories
      if (!fs.existsSync(this.config.resultsPath)) {
        fs.mkdirSync(this.config.resultsPath, { recursive: true });
      }
      if (!fs.existsSync(this.config.logPath)) {
        fs.mkdirSync(this.config.logPath, { recursive: true });
      }

      spinner.succeed('Environment validation passed');
    } catch (error) {
      spinner.fail('Environment validation failed');
      throw error;
    }
  }

  async detectServerProcess() {
    const spinner = ora('Detecting server process...').start();
    
    try {
      const processes = await si.processes();
      
      // Look for Node.js processes that might be our server
      const nodeProcesses = processes.list.filter(proc => 
        proc.command && 
        (proc.command.includes('node') || proc.command.includes('nodejs')) &&
        (proc.command.includes('server') || proc.command.includes('app') || proc.command.includes('index'))
      );

      if (nodeProcesses.length > 0) {
        // Take the first one (or implement better detection logic)
        this.serverProcess = nodeProcesses[0];
        spinner.succeed(`Server process detected: PID ${this.serverProcess.pid}`);
      } else {
        spinner.warn('Server process not detected - will monitor system-wide metrics only');
      }
    } catch (error) {
      spinner.warn('Process detection failed - continuing with system monitoring');
    }
  }

  async runMonitoring() {
    const spinner = ora('Starting performance monitoring...').start();
    
    this.isMonitoring = true;
    const endTime = Date.now() + this.config.monitoringDuration;
    let sampleCount = 0;

    while (this.isMonitoring && Date.now() < endTime) {
      try {
        const timestamp = Date.now();
        
        // Collect system metrics
        const systemMetrics = await this.collectSystemMetrics();
        
        // Collect server-specific metrics
        const serverMetrics = await this.collectServerMetrics();
        
        // Store metrics
        this.metrics.systemMetrics.push({ timestamp, ...systemMetrics });
        this.metrics.serverMetrics.push({ timestamp, ...serverMetrics });
        
        // Check for alerts
        this.checkAlertThresholds(systemMetrics, serverMetrics);
        
        // Update display
        sampleCount++;
        this.updateDisplay(spinner, sampleCount, systemMetrics, serverMetrics);
        
        // Wait for next sample
        await new Promise(resolve => setTimeout(resolve, this.config.monitoringInterval));
        
      } catch (error) {
        console.error(chalk.red('Monitoring error:'), error.message);
        await new Promise(resolve => setTimeout(resolve, this.config.monitoringInterval));
      }
    }
    
    spinner.succeed('Performance monitoring completed');
    this.calculateSummary();
  }

  async collectSystemMetrics() {
    const cpuInfo = await si.currentLoad();
    const memInfo = await si.mem();
    const diskInfo = await si.fsSize();
    const networkStats = await si.networkStats();
    const osInfo = await si.osInfo();

    // Get primary disk usage
    const primaryDisk = diskInfo.length > 0 ? diskInfo[0] : { used: 0, size: 1 };
    const diskUsagePercent = (primaryDisk.used / primaryDisk.size) * 100;

    // Get primary network interface stats
    const primaryNetwork = networkStats.length > 0 ? networkStats[0] : { rx_bytes: 0, tx_bytes: 0, rx_sec: 0, tx_sec: 0 };

    return {
      cpu: {
        usage: cpuInfo.currentload,
        user: cpuInfo.currentload_user,
        system: cpuInfo.currentload_system,
        idle: cpuInfo.currentload_idle,
        cores: os.cpus().length
      },
      memory: {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
        usagePercent: (memInfo.used / memInfo.total) * 100,
        available: memInfo.available
      },
      disk: {
        total: primaryDisk.size,
        used: primaryDisk.used,
        free: primaryDisk.size - primaryDisk.used,
        usagePercent: diskUsagePercent
      },
      network: {
        rxBytes: primaryNetwork.rx_bytes,
        txBytes: primaryNetwork.tx_bytes,
        rxRate: primaryNetwork.rx_sec || 0,
        txRate: primaryNetwork.tx_sec || 0
      },
      system: {
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
        platform: osInfo.platform,
        distro: osInfo.distro
      }
    };
  }

  async collectServerMetrics() {
    const metrics = {
      processStats: null,
      apiResponseTime: null,
      apiStatus: 'unknown',
      errorRate: 0,
      activeConnections: 0
    };

    try {
      // Get server process stats if available
      if (this.serverProcess) {
        const processStats = await pidusage(this.serverProcess.pid);
        metrics.processStats = {
          cpu: processStats.cpu,
          memory: processStats.memory,
          ppid: processStats.ppid,
          pid: processStats.pid,
          ctime: processStats.ctime,
          elapsed: processStats.elapsed,
          timestamp: processStats.timestamp
        };
      }

      // Test API response time
      const apiStartTime = performance.now();
      try {
        const response = await axios.get(`${this.config.serverUrl}/api/health`, {
          timeout: 10000
        });
        metrics.apiResponseTime = performance.now() - apiStartTime;
        metrics.apiStatus = response.status === 200 ? 'healthy' : 'degraded';
      } catch (error) {
        metrics.apiResponseTime = performance.now() - apiStartTime;
        metrics.apiStatus = 'error';
        metrics.errorRate = 100;
      }

      // Try to get additional server metrics from a metrics endpoint if available
      try {
        const metricsResponse = await axios.get(`${this.config.serverUrl}/api/metrics`, {
          timeout: 5000
        });
        
        if (metricsResponse.data) {
          metrics.activeConnections = metricsResponse.data.activeConnections || 0;
          metrics.requestCount = metricsResponse.data.requestCount || 0;
          metrics.errorCount = metricsResponse.data.errorCount || 0;
        }
      } catch (error) {
        // Metrics endpoint not available - continue with basic monitoring
      }

    } catch (error) {
      metrics.processStats = null;
      metrics.apiStatus = 'error';
    }

    return metrics;
  }

  checkAlertThresholds(systemMetrics, serverMetrics) {
    const alerts = [];
    const timestamp = new Date().toISOString();

    // CPU usage alert
    if (systemMetrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'HIGH_CPU_USAGE',
        severity: 'warning',
        message: `CPU usage at ${systemMetrics.cpu.usage.toFixed(1)}% (threshold: ${this.config.alertThresholds.cpuUsage}%)`,
        value: systemMetrics.cpu.usage,
        threshold: this.config.alertThresholds.cpuUsage,
        timestamp
      });
    }

    // Memory usage alert
    if (systemMetrics.memory.usagePercent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        message: `Memory usage at ${systemMetrics.memory.usagePercent.toFixed(1)}% (threshold: ${this.config.alertThresholds.memoryUsage}%)`,
        value: systemMetrics.memory.usagePercent,
        threshold: this.config.alertThresholds.memoryUsage,
        timestamp
      });
    }

    // Disk usage alert
    if (systemMetrics.disk.usagePercent > this.config.alertThresholds.diskUsage) {
      alerts.push({
        type: 'HIGH_DISK_USAGE',
        severity: 'critical',
        message: `Disk usage at ${systemMetrics.disk.usagePercent.toFixed(1)}% (threshold: ${this.config.alertThresholds.diskUsage}%)`,
        value: systemMetrics.disk.usagePercent,
        threshold: this.config.alertThresholds.diskUsage,
        timestamp
      });
    }

    // API response time alert
    if (serverMetrics.apiResponseTime && serverMetrics.apiResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'HIGH_RESPONSE_TIME',
        severity: 'warning',
        message: `API response time at ${serverMetrics.apiResponseTime.toFixed(0)}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        value: serverMetrics.apiResponseTime,
        threshold: this.config.alertThresholds.responseTime,
        timestamp
      });
    }

    // Server error alert
    if (serverMetrics.apiStatus === 'error') {
      alerts.push({
        type: 'SERVER_ERROR',
        severity: 'critical',
        message: 'Server API is not responding or returning errors',
        value: serverMetrics.errorRate,
        threshold: 0,
        timestamp
      });
    }

    // Add new alerts to the list
    this.metrics.alerts.push(...alerts);

    // Log critical alerts immediately
    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        console.log(chalk.red(`\n🚨 CRITICAL ALERT: ${alert.message}`));
      }
    }
  }

  updateDisplay(spinner, sampleCount, systemMetrics, serverMetrics) {
    const elapsed = Math.floor((Date.now() - (this.metrics.startTime + performance.timeOrigin)) / 1000);
    const remaining = Math.max(0, Math.floor((this.config.monitoringDuration - elapsed * 1000) / 1000));

    const cpuUsage = systemMetrics.cpu.usage.toFixed(1);
    const memUsage = systemMetrics.memory.usagePercent.toFixed(1);
    const apiResponse = serverMetrics.apiResponseTime ? `${serverMetrics.apiResponseTime.toFixed(0)}ms` : 'N/A';
    const apiStatus = serverMetrics.apiStatus === 'healthy' ? '✅' : 
                     serverMetrics.apiStatus === 'error' ? '❌' : '⚠️';

    spinner.text = `Monitoring... CPU: ${cpuUsage}%, RAM: ${memUsage}%, API: ${apiResponse} ${apiStatus}, ` +
                  `Samples: ${sampleCount}, Time: ${elapsed}s (${remaining}s remaining)`;
  }

  calculateSummary() {
    if (this.metrics.systemMetrics.length === 0) return;

    // Calculate CPU statistics
    const cpuUsages = this.metrics.systemMetrics.map(m => m.cpu.usage);
    this.metrics.summary.avgCpuUsage = cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length;
    this.metrics.summary.peakCpuUsage = Math.max(...cpuUsages);

    // Calculate memory statistics
    const memUsages = this.metrics.systemMetrics.map(m => m.memory.usagePercent);
    this.metrics.summary.avgMemoryUsage = memUsages.reduce((sum, usage) => sum + usage, 0) / memUsages.length;
    this.metrics.summary.peakMemoryUsage = Math.max(...memUsages);

    // Calculate response time statistics
    const responseTimes = this.metrics.serverMetrics
      .filter(m => m.apiResponseTime !== null)
      .map(m => m.apiResponseTime);
    
    if (responseTimes.length > 0) {
      this.metrics.summary.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      this.metrics.summary.peakResponseTime = Math.max(...responseTimes);
    }

    // Calculate error statistics
    const errorCount = this.metrics.serverMetrics.filter(m => m.apiStatus === 'error').length;
    this.metrics.summary.totalErrors = errorCount;

    // System uptime
    this.metrics.summary.uptime = this.metrics.systemMetrics.length > 0 ? 
      this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1].system.uptime : 0;

    // Generate performance recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];

    // CPU recommendations
    if (this.metrics.summary.avgCpuUsage > 70) {
      recommendations.push({
        category: 'CPU',
        priority: 'high',
        issue: `High average CPU usage: ${this.metrics.summary.avgCpuUsage.toFixed(1)}%`,
        recommendation: 'Consider scaling horizontally with load balancing or optimize CPU-intensive operations',
        impact: 'Performance degradation under load'
      });
    }

    if (this.metrics.summary.peakCpuUsage > 90) {
      recommendations.push({
        category: 'CPU',
        priority: 'critical',
        issue: `Peak CPU usage reached: ${this.metrics.summary.peakCpuUsage.toFixed(1)}%`,
        recommendation: 'Immediate scaling required. Investigate CPU bottlenecks in application code',
        impact: 'System may become unresponsive during peak load'
      });
    }

    // Memory recommendations
    if (this.metrics.summary.avgMemoryUsage > 75) {
      recommendations.push({
        category: 'Memory',
        priority: 'high',
        issue: `High average memory usage: ${this.metrics.summary.avgMemoryUsage.toFixed(1)}%`,
        recommendation: 'Monitor for memory leaks, consider increasing available memory or implementing caching strategies',
        impact: 'Potential out-of-memory errors and system instability'
      });
    }

    // Response time recommendations
    if (this.metrics.summary.avgResponseTime > 1000) {
      recommendations.push({
        category: 'Performance',
        priority: 'high',
        issue: `Slow average response time: ${this.metrics.summary.avgResponseTime.toFixed(0)}ms`,
        recommendation: 'Optimize database queries, implement caching, or consider CDN for static assets',
        impact: 'Poor user experience and potential timeout errors'
      });
    }

    // Alert-based recommendations
    const criticalAlerts = this.metrics.alerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push({
        category: 'Stability',
        priority: 'critical',
        issue: `${criticalAlerts.length} critical alerts triggered during monitoring`,
        recommendation: 'Address critical issues immediately. Review system resources and application health',
        impact: 'System instability and potential service outages'
      });
    }

    // Process-specific recommendations
    if (this.serverProcess && this.metrics.serverMetrics.some(m => m.processStats && m.processStats.cpu > 80)) {
      recommendations.push({
        category: 'Application',
        priority: 'high',
        issue: 'Server process consuming excessive CPU',
        recommendation: 'Profile application code for CPU hotspots, consider code optimization or clustering',
        impact: 'Degraded performance and poor scalability'
      });
    }

    // General recommendations if no issues found
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'General',
        priority: 'low',
        issue: 'System performance within normal parameters',
        recommendation: 'Continue monitoring. Consider implementing automated alerts for production deployment',
        impact: 'Maintain current performance levels'
      });
    }

    this.metrics.recommendations = recommendations;
  }

  async generateResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        monitoringInterval: this.config.monitoringInterval,
        monitoringDuration: this.config.monitoringDuration,
        serverUrl: this.config.serverUrl,
        alertThresholds: this.config.alertThresholds
      },
      summary: {
        duration: `${duration.toFixed(2)}ms`,
        sampleCount: this.metrics.systemMetrics.length,
        avgCpuUsage: `${this.metrics.summary.avgCpuUsage.toFixed(2)}%`,
        peakCpuUsage: `${this.metrics.summary.peakCpuUsage.toFixed(2)}%`,
        avgMemoryUsage: `${this.metrics.summary.avgMemoryUsage.toFixed(2)}%`,
        peakMemoryUsage: `${this.metrics.summary.peakMemoryUsage.toFixed(2)}%`,
        avgResponseTime: `${this.metrics.summary.avgResponseTime.toFixed(2)}ms`,
        peakResponseTime: `${this.metrics.summary.peakResponseTime.toFixed(2)}ms`,
        totalErrors: this.metrics.summary.totalErrors,
        alertsTriggered: this.metrics.alerts.length
      },
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCores: os.cpus().length,
        totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`,
        hostname: os.hostname()
      },
      performance: {
        cpuEfficiency: this.metrics.summary.avgCpuUsage < 50 ? 'good' : 
                      this.metrics.summary.avgCpuUsage < 80 ? 'fair' : 'poor',
        memoryEfficiency: this.metrics.summary.avgMemoryUsage < 60 ? 'good' : 
                         this.metrics.summary.avgMemoryUsage < 85 ? 'fair' : 'poor',
        responseTimeRating: this.metrics.summary.avgResponseTime < 200 ? 'excellent' :
                           this.metrics.summary.avgResponseTime < 500 ? 'good' :
                           this.metrics.summary.avgResponseTime < 1000 ? 'fair' : 'poor'
      },
      alerts: this.metrics.alerts,
      recommendations: this.metrics.recommendations,
      detailedMetrics: {
        systemMetrics: this.metrics.systemMetrics,
        serverMetrics: this.metrics.serverMetrics
      }
    };

    // Save detailed results
    fs.writeFileSync(
      path.join(this.config.resultsPath, 'performance-monitoring-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate CSV for time series analysis
    this.generateCSVReport(report);

    // Generate performance charts data
    this.generateChartData(report);

    // Print summary
    this.printSummary(report);
  }

  generateCSVReport(report) {
    const csvLines = [
      'timestamp,cpuUsage,memoryUsage,diskUsage,apiResponseTime,apiStatus'
    ];

    for (let i = 0; i < report.detailedMetrics.systemMetrics.length; i++) {
      const systemData = report.detailedMetrics.systemMetrics[i];
      const serverData = report.detailedMetrics.serverMetrics[i] || {};
      
      csvLines.push([
        new Date(systemData.timestamp).toISOString(),
        systemData.cpu.usage.toFixed(2),
        systemData.memory.usagePercent.toFixed(2),
        systemData.disk.usagePercent.toFixed(2),
        serverData.apiResponseTime || 0,
        serverData.apiStatus || 'unknown'
      ].join(','));
    }

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'performance-monitoring-timeseries.csv'),
      csvLines.join('\n')
    );
  }

  generateChartData(report) {
    const chartData = {
      cpu: report.detailedMetrics.systemMetrics.map(m => ({
        timestamp: m.timestamp,
        usage: m.cpu.usage,
        user: m.cpu.user,
        system: m.cpu.system
      })),
      memory: report.detailedMetrics.systemMetrics.map(m => ({
        timestamp: m.timestamp,
        used: m.memory.used,
        total: m.memory.total,
        usagePercent: m.memory.usagePercent
      })),
      responseTime: report.detailedMetrics.serverMetrics
        .filter(m => m.apiResponseTime !== null)
        .map(m => ({
          timestamp: m.timestamp,
          responseTime: m.apiResponseTime
        }))
    };

    fs.writeFileSync(
      path.join(this.config.resultsPath, 'performance-monitoring-charts.json'),
      JSON.stringify(chartData, null, 2)
    );
  }

  printSummary(report) {
    console.log(chalk.cyan('\n📊 PERFORMANCE MONITORING RESULTS'));
    console.log('='.repeat(50));
    console.log(chalk.white(`Duration: ${report.summary.duration}`));
    console.log(chalk.white(`Samples Collected: ${report.summary.sampleCount}`));
    console.log(chalk.white(`Average CPU Usage: ${report.summary.avgCpuUsage}`));
    console.log(chalk.white(`Peak CPU Usage: ${report.summary.peakCpuUsage}`));
    console.log(chalk.white(`Average Memory Usage: ${report.summary.avgMemoryUsage}`));
    console.log(chalk.white(`Peak Memory Usage: ${report.summary.peakMemoryUsage}`));
    console.log(chalk.white(`Average Response Time: ${report.summary.avgResponseTime}`));
    console.log(chalk.white(`Peak Response Time: ${report.summary.peakResponseTime}`));

    console.log(chalk.cyan('\n⚡ Performance Ratings:'));
    console.log(chalk.white(`CPU Efficiency: ${report.performance.cpuEfficiency}`));
    console.log(chalk.white(`Memory Efficiency: ${report.performance.memoryEfficiency}`));
    console.log(chalk.white(`Response Time: ${report.performance.responseTimeRating}`));

    if (report.alerts.length > 0) {
      console.log(chalk.yellow(`\n🚨 Alerts Triggered: ${report.alerts.length}`));
      
      const criticalAlerts = report.alerts.filter(alert => alert.severity === 'critical');
      const warningAlerts = report.alerts.filter(alert => alert.severity === 'warning');
      
      if (criticalAlerts.length > 0) {
        console.log(chalk.red(`  Critical: ${criticalAlerts.length}`));
      }
      if (warningAlerts.length > 0) {
        console.log(chalk.yellow(`  Warning: ${warningAlerts.length}`));
      }
    }

    console.log(chalk.cyan('\n💡 Recommendations:'));
    for (const rec of report.recommendations) {
      const priorityColor = rec.priority === 'critical' ? chalk.red :
                           rec.priority === 'high' ? chalk.yellow :
                           chalk.green;
      console.log(priorityColor(`  [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.recommendation}`));
    }

    console.log(chalk.green(`\n📁 Results saved to: ${this.config.resultsPath}`));
    console.log(chalk.white('Generated files:'));
    console.log(chalk.white('  • performance-monitoring-results.json - Detailed metrics'));
    console.log(chalk.white('  • performance-monitoring-timeseries.csv - Time series data'));
    console.log(chalk.white('  • performance-monitoring-charts.json - Chart visualization data'));
  }
}

// Run performance monitoring if called directly
if (require.main === module) {
  const config = {
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
    monitoringInterval: process.env.MONITOR_INTERVAL ? parseInt(process.env.MONITOR_INTERVAL) : 5000,
    monitoringDuration: process.env.MONITOR_DURATION ? parseInt(process.env.MONITOR_DURATION) : 300000,
    alertThresholds: {
      cpuUsage: process.env.CPU_THRESHOLD ? parseFloat(process.env.CPU_THRESHOLD) : 80,
      memoryUsage: process.env.MEMORY_THRESHOLD ? parseFloat(process.env.MEMORY_THRESHOLD) : 85,
      responseTime: process.env.RESPONSE_THRESHOLD ? parseInt(process.env.RESPONSE_THRESHOLD) : 2000
    }
  };

  const monitor = new PerformanceMonitor(config);
  monitor.startMonitoring()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Performance monitoring failed:'), error);
      process.exit(1);
    });
}

module.exports = PerformanceMonitor;