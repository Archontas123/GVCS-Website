const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const performanceStatsStorage = require('./performanceStatsStorage');

/**
 * Execution Monitor Service for resource tracking and security enforcement
 * Monitors container executions, tracks performance metrics, and enforces security policies
 */
class ExecutionMonitor {
  /**
   * Initialize execution monitor with performance tracking and security configuration
   */
  constructor() {
    this.activeExecutions = new Map();
    this.performanceStats = {
      totalExecutions: 0,
      totalExecutionTime: 0,
      totalMemoryUsed: 0,
      languageStats: new Map(),
      errorRates: new Map(),
      averageExecutionTime: 0,
      peakMemoryUsage: 0,
      containerOverhead: {
        startupTime: 0,
        memoryOverhead: 0,
        samples: 0
      }
    };
    this.securityConfig = {
      allowedSystemCalls: [
        'read', 'write', 'close', 'mmap', 'munmap', 'brk', 'exit',
        'exit_group', 'rt_sigaction', 'rt_sigprocmask', 'fstat', 'access'
      ],
      blockedPaths: [
        '/etc', '/usr', '/bin', '/sbin', '/root', '/home',
        '/proc', '/sys', '/dev', '/tmp'
      ],
      maxFileSize: 1024 * 1024, // 1MB
      maxOpenFiles: 10,
      networkBlocked: true
    };
    
    this.resourceLimits = {
      defaultTimeLimit: 5000,      // 5 seconds
      defaultMemoryLimit: 256,     // 256 MB
      maxTimeLimit: 60000,         // 60 seconds max
      maxMemoryLimit: 1024,        // 1 GB max
      maxProcesses: 1,
      maxThreads: 16
    };
  }

  /**
   * Monitor code execution with resource and security constraints
   * Enhanced with container overhead accounting and performance statistics
   */
  async monitorExecution(executionId, command, args, options = {}) {
    const {
      timeLimit = this.resourceLimits.defaultTimeLimit,
      memoryLimit = this.resourceLimits.defaultMemoryLimit,
      workingDir = os.tmpdir(),
      input = '',
      securityLevel = 'high',
      language = 'unknown',
      isContainerized = false
    } = options;

    // Validate resource limits
    const validatedLimits = this.validateResourceLimits({
      timeLimit,
      memoryLimit
    });

    const monitoring = {
      executionId,
      language,
      startTime: Date.now(),
      hrStartTime: process.hrtime(), // High-resolution timing
      containerStartTime: null,
      containerStartupOverhead: 0,
      maxMemory: 0,
      peakMemory: 0,
      baselineMemory: 0, // Memory before user code execution
      cpuTime: 0,
      wallTime: 0,
      netExecutionTime: 0, // Execution time minus overhead
      ioOperations: 0,
      systemCalls: 0,
      securityViolations: [],
      resourceViolations: [],
      isKilled: false,
      exitCode: null,
      signal: null,
      isContainerized,
      performanceMetrics: {
        actualCpuTime: 0,
        ioWaitTime: 0,
        contextSwitches: 0,
        pageFaults: 0
      }
    };

    try {
      // Apply security restrictions
      const secureEnv = this.createSecureEnvironment(securityLevel);
      
      // Measure container startup overhead if containerized
      if (isContainerized) {
        monitoring.containerStartTime = process.hrtime();
      }

      // Start monitored process
      const process = spawn(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: secureEnv,
        detached: false,
        uid: securityLevel === 'high' ? this.getRestrictedUserId() : undefined,
        gid: securityLevel === 'high' ? this.getRestrictedGroupId() : undefined
      });

      this.activeExecutions.set(executionId, {
        process,
        monitoring,
        limits: validatedLimits
      });

      // Set up monitoring
      const result = await this.runWithMonitoring(
        process, 
        monitoring, 
        validatedLimits, 
        input
      );

      // Update performance statistics
      this.updatePerformanceStats(monitoring, result);

      this.activeExecutions.delete(executionId);
      return result;

    } catch (error) {
      this.activeExecutions.delete(executionId);
      monitoring.error = error.message;
      monitoring.verdict = 'System Error';
      return this.buildResult(monitoring, '', error.message);
    }
  }

  /**
   * Run process with comprehensive monitoring
   */
  async runWithMonitoring(process, monitoring, limits, input) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let memoryCheckInterval;
      let killTimer;

      // Set up timeout
      killTimer = setTimeout(() => {
        monitoring.isKilled = true;
        monitoring.resourceViolations.push('Time limit exceeded');
        this.killProcess(process, monitoring.executionId);
      }, limits.timeLimit);

      // Memory monitoring
      memoryCheckInterval = setInterval(() => {
        this.checkMemoryUsage(process.pid, monitoring, limits);
      }, 100); // Check every 100ms

      // Handle stdout
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        monitoring.ioOperations++;
        
        // Prevent excessive output
        if (stdout.length > 1024 * 1024) { // 1MB limit
          monitoring.resourceViolations.push('Output limit exceeded');
          this.killProcess(process, monitoring.executionId);
        }
      });

      // Handle stderr
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        monitoring.ioOperations++;
        
        // Check for security violations in error output
        this.detectSecurityViolations(data.toString(), monitoring);
      });

      // Send input if provided
      if (input) {
        try {
          process.stdin.write(input);
          process.stdin.end();
        } catch (error) {
          // Process might have already exited
        }
      } else {
        process.stdin.end();
      }

      // Handle process exit
      process.on('close', (code, signal) => {
        clearTimeout(killTimer);
        clearInterval(memoryCheckInterval);

        monitoring.exitCode = code;
        monitoring.signal = signal;
        
        // Calculate precise timing with high-resolution timer
        const hrEndTime = process.hrtime(monitoring.hrStartTime);
        monitoring.wallTime = hrEndTime[0] * 1000 + hrEndTime[1] / 1000000; // Convert to milliseconds
        
        // Calculate container startup overhead if applicable
        if (monitoring.isContainerized && monitoring.containerStartTime) {
          const containerOverhead = process.hrtime(monitoring.containerStartTime);
          monitoring.containerStartupOverhead = containerOverhead[0] * 1000 + containerOverhead[1] / 1000000;
          
          // Net execution time excludes container startup overhead
          monitoring.netExecutionTime = Math.max(0, monitoring.wallTime - monitoring.containerStartupOverhead);
          
          // Update global container overhead statistics
          this.updateContainerOverheadStats(monitoring.containerStartupOverhead);
        } else {
          monitoring.netExecutionTime = monitoring.wallTime;
        }

        // Get additional performance metrics if available (Linux)
        if (process.platform === 'linux' && process.pid) {
          this.collectAdditionalMetrics(process.pid, monitoring);
        }

        // Determine verdict
        let verdict = this.determineVerdict(monitoring, code, signal);
        
        resolve(this.buildResult(monitoring, stdout, stderr, verdict));
      });

      // Handle spawn errors
      process.on('error', (error) => {
        clearTimeout(killTimer);
        clearInterval(memoryCheckInterval);
        
        monitoring.error = error.message;
        resolve(this.buildResult(monitoring, stdout, stderr, 'System Error'));
      });

      // Monitor system calls if available (Linux-specific)
      if (process.platform === 'linux') {
        this.monitorSystemCalls(process.pid, monitoring);
      }
    });
  }

  /**
   * Check memory usage of process
   */
  async checkMemoryUsage(pid, monitoring, limits) {
    try {
      if (process.platform === 'linux') {
        const statm = await fs.readFile(`/proc/${pid}/statm`, 'utf8');
        const parts = statm.trim().split(' ');
        const memoryKB = parseInt(parts[0]) * 4; // pages to KB (assuming 4KB pages)
        const memoryMB = memoryKB / 1024;
        
        monitoring.peakMemory = Math.max(monitoring.peakMemory, memoryMB);
        monitoring.maxMemory = memoryMB;

        if (memoryMB > limits.memoryLimit) {
          monitoring.resourceViolations.push('Memory limit exceeded');
          this.killProcess(pid, monitoring.executionId);
        }
      } else {
        // Fallback for non-Linux systems
        monitoring.maxMemory = 0;
        monitoring.peakMemory = 0;
      }
    } catch (error) {
      // Process might have exited or /proc unavailable
    }
  }

  /**
   * Monitor system calls (Linux-specific)
   */
  monitorSystemCalls(pid, monitoring) {
    if (process.platform !== 'linux') return;

    // Use strace to monitor system calls (if available)
    try {
      const strace = spawn('strace', ['-p', pid.toString(), '-c'], {
        stdio: ['ignore', 'pipe', 'ignore']
      });

      strace.stdout.on('data', (data) => {
        const output = data.toString();
        // Parse strace output for system call analysis
        monitoring.systemCalls += this.parseStraceOutput(output);
      });

      strace.on('error', () => {
        // strace not available, continue without system call monitoring
      });

    } catch (error) {
      // strace monitoring failed, continue without it
    }
  }

  /**
   * Parse strace output for system call counting
   */
  parseStraceOutput(output) {
    const lines = output.split('\n');
    let callCount = 0;
    
    for (const line of lines) {
      if (line.includes('calls') && line.includes('errors')) {
        const match = line.match(/(\d+)\s+calls/);
        if (match) {
          callCount += parseInt(match[1]);
        }
      }
    }
    
    return callCount;
  }

  /**
   * Detect security violations in error output
   */
  detectSecurityViolations(errorOutput, monitoring) {
    const violations = [
      { pattern: /permission denied/i, type: 'Permission violation' },
      { pattern: /operation not permitted/i, type: 'Operation violation' },
      { pattern: /network unreachable/i, type: 'Network access violation' },
      { pattern: /file not found.*\/etc/i, type: 'System file access violation' },
      { pattern: /file not found.*\/root/i, type: 'Root access violation' },
      { pattern: /bad system call/i, type: 'Invalid system call' }
    ];

    for (const violation of violations) {
      if (violation.pattern.test(errorOutput)) {
        monitoring.securityViolations.push(violation.type);
      }
    }
  }

  /**
   * Create secure execution environment
   */
  createSecureEnvironment(securityLevel) {
    const baseEnv = {
      PATH: '/usr/bin:/bin',
      HOME: '/tmp',
      USER: 'executor',
      SHELL: '/bin/sh'
    };

    if (securityLevel === 'high') {
      // Remove potentially dangerous environment variables
      const secureEnv = { ...baseEnv };
      delete secureEnv.LD_LIBRARY_PATH;
      delete secureEnv.LD_PRELOAD;
      delete secureEnv.PYTHONPATH;
      delete secureEnv.CLASSPATH;
      
      return secureEnv;
    }

    return { ...process.env, ...baseEnv };
  }

  /**
   * Get restricted user ID for high security execution
   */
  getRestrictedUserId() {
    // In production, this would return a restricted user ID
    // For now, return current user ID
    return process.getuid ? process.getuid() : undefined;
  }

  /**
   * Get restricted group ID for high security execution
   */
  getRestrictedGroupId() {
    // In production, this would return a restricted group ID
    // For now, return current group ID
    return process.getgid ? process.getgid() : undefined;
  }

  /**
   * Kill process safely
   */
  killProcess(processOrPid, executionId) {
    try {
      if (typeof processOrPid === 'number') {
        process.kill(processOrPid, 'SIGKILL');
      } else {
        processOrPid.kill('SIGKILL');
      }
      
      console.log(`Killed process for execution ${executionId}`);
    } catch (error) {
      console.error(`Failed to kill process for execution ${executionId}:`, error.message);
    }
  }

  /**
   * Validate and adjust resource limits
   */
  validateResourceLimits(limits) {
    return {
      timeLimit: Math.min(
        Math.max(limits.timeLimit, 100), 
        this.resourceLimits.maxTimeLimit
      ),
      memoryLimit: Math.min(
        Math.max(limits.memoryLimit, 16), 
        this.resourceLimits.maxMemoryLimit
      )
    };
  }

  /**
   * Determine execution verdict based on monitoring data
   */
  determineVerdict(monitoring, exitCode, signal) {
    if (monitoring.isKilled) {
      if (monitoring.resourceViolations.includes('Time limit exceeded')) {
        return 'Time Limit Exceeded';
      }
      if (monitoring.resourceViolations.includes('Memory limit exceeded')) {
        return 'Memory Limit Exceeded';
      }
      return 'Runtime Error';
    }

    if (monitoring.securityViolations.length > 0) {
      return 'Security Violation';
    }

    if (signal === 'SIGSEGV') {
      return 'Runtime Error';
    }

    if (signal === 'SIGABRT') {
      return 'Runtime Error';
    }

    if (exitCode === 0) {
      return 'Success';
    }

    if (exitCode !== 0) {
      return 'Runtime Error';
    }

    return 'Unknown';
  }

  /**
   * Build execution result object
   */
  buildResult(monitoring, stdout, stderr, verdict) {
    return {
      success: verdict === 'Success',
      verdict,
      output: stdout,
      error: stderr,
      executionTime: monitoring.wallTime,
      netExecutionTime: monitoring.netExecutionTime,
      memoryUsed: monitoring.peakMemory,
      exitCode: monitoring.exitCode,
      signal: monitoring.signal,
      language: monitoring.language,
      monitoring: {
        cpuTime: monitoring.cpuTime,
        actualCpuTime: monitoring.performanceMetrics.actualCpuTime,
        ioOperations: monitoring.ioOperations,
        systemCalls: monitoring.systemCalls,
        securityViolations: monitoring.securityViolations,
        resourceViolations: monitoring.resourceViolations,
        containerOverhead: monitoring.containerStartupOverhead,
        isContainerized: monitoring.isContainerized,
        performanceMetrics: monitoring.performanceMetrics
      }
    };
  }

  /**
   * Get system resource information
   */
  getSystemResources() {
    const totalMem = os.totalmem() / (1024 * 1024 * 1024); // GB
    const freeMem = os.freemem() / (1024 * 1024 * 1024);   // GB
    const usedMem = totalMem - freeMem;
    
    return {
      // Memory usage information
      totalMemory: totalMem,
      freeMemory: freeMem,
      memoryUsage: usedMem, // This was missing - needed for functional tests
      memoryUsagePercentage: (usedMem / totalMem) * 100,
      
      // CPU information  
      cpuCount: os.cpus().length,
      cpuUsage: this.getCurrentCpuUsage(), // This was missing - needed for functional tests
      loadAverage: os.loadavg(),
      
      // System information
      platform: os.platform(),
      architecture: os.arch(), 
      uptime: os.uptime(),
      
      // Additional metrics for performance monitoring
      processes: this.activeExecutions.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current CPU usage percentage
   */
  getCurrentCpuUsage() {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (let type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      return Math.max(0, Math.min(100, usage)); // Ensure 0-100 range
    } catch (error) {
      console.error('Error calculating CPU usage:', error);
      return 0; // Return 0 if calculation fails
    }
  }

  /**
   * Kill all active executions (emergency cleanup)
   */
  killAllExecutions() {
    console.log('Performing emergency cleanup of all executions...');
    
    for (const [executionId, execution] of this.activeExecutions) {
      try {
        execution.process.kill('SIGKILL');
        console.log(`Killed execution: ${executionId}`);
      } catch (error) {
        console.error(`Failed to kill execution ${executionId}:`, error.message);
      }
    }
    
    this.activeExecutions.clear();
    console.log('Emergency cleanup completed');
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const stats = {
      activeExecutions: this.activeExecutions.size,
      totalViolations: 0,
      securityViolations: 0,
      resourceViolations: 0,
      systemResources: this.getSystemResources()
    };

    for (const [, execution] of this.activeExecutions) {
      stats.securityViolations += execution.monitoring.securityViolations.length;
      stats.resourceViolations += execution.monitoring.resourceViolations.length;
    }

    stats.totalViolations = stats.securityViolations + stats.resourceViolations;

    return stats;
  }

  /**
   * Update container overhead statistics
   */
  updateContainerOverheadStats(overheadMs) {
    const overhead = this.performanceStats.containerOverhead;
    overhead.samples++;
    overhead.startupTime = ((overhead.startupTime * (overhead.samples - 1)) + overheadMs) / overhead.samples;
  }

  /**
   * Collect additional performance metrics (Linux-specific)
   */
  async collectAdditionalMetrics(pid, monitoring) {
    try {
      // Read process status information
      const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
      const statParts = stat.trim().split(' ');
      
      if (statParts.length >= 52) {
        // Extract CPU time (user + system time in clock ticks)
        const userTime = parseInt(statParts[13]) || 0;
        const systemTime = parseInt(statParts[14]) || 0;
        const clockTicks = os.constants?.SCHED_OTHER || 100; // Default to 100 Hz
        monitoring.performanceMetrics.actualCpuTime = ((userTime + systemTime) / clockTicks) * 1000; // Convert to ms
        
        // Extract context switches and page faults
        monitoring.performanceMetrics.contextSwitches = parseInt(statParts[34]) || 0;
        monitoring.performanceMetrics.pageFaults = parseInt(statParts[11]) || 0;
      }
      
      // Read I/O statistics if available
      try {
        const io = await fs.readFile(`/proc/${pid}/io`, 'utf8');
        const ioLines = io.trim().split('\n');
        for (const line of ioLines) {
          if (line.startsWith('syscr:') || line.startsWith('syscw:')) {
            monitoring.ioOperations += parseInt(line.split(' ')[1]) || 0;
          }
        }
      } catch (ioError) {
        // I/O stats not available, continue without them
      }
    } catch (error) {
      // Process might have exited or /proc unavailable
    }
  }

  /**
   * Update performance statistics with execution results
   */
  updatePerformanceStats(monitoring, result) {
    const stats = this.performanceStats;
    
    // Store performance metrics in database
    try {
      performanceStatsStorage.storeExecutionMetrics({
        language: monitoring.language,
        submissionId: monitoring.executionId,
        executionTime: monitoring.wallTime,
        netExecutionTime: monitoring.netExecutionTime,
        containerOverhead: monitoring.containerStartupOverhead,
        cpuTime: monitoring.performanceMetrics.actualCpuTime,
        memoryUsed: monitoring.peakMemory,
        ioOperations: monitoring.ioOperations,
        systemCalls: monitoring.systemCalls,
        verdict: result.verdict,
        success: result.success,
        additionalMetrics: {
          contextSwitches: monitoring.performanceMetrics.contextSwitches,
          pageFaults: monitoring.performanceMetrics.pageFaults,
          ioWaitTime: monitoring.performanceMetrics.ioWaitTime,
          securityViolations: monitoring.securityViolations,
          resourceViolations: monitoring.resourceViolations
        }
      }).catch(error => {
        console.error('Failed to store execution performance metrics:', error);
      });
    } catch (error) {
      // Don't fail the execution if metrics storage fails
      console.error('Performance metrics storage error:', error);
    }
    
    // Update total counts
    stats.totalExecutions++;
    stats.totalExecutionTime += monitoring.netExecutionTime || monitoring.wallTime;
    stats.totalMemoryUsed += monitoring.peakMemory;
    
    // Update peak memory usage
    stats.peakMemoryUsage = Math.max(stats.peakMemoryUsage, monitoring.peakMemory);
    
    // Update average execution time
    stats.averageExecutionTime = stats.totalExecutionTime / stats.totalExecutions;
    
    // Update language-specific statistics
    if (!stats.languageStats.has(monitoring.language)) {
      stats.languageStats.set(monitoring.language, {
        executions: 0,
        totalTime: 0,
        totalMemory: 0,
        successCount: 0,
        errorCount: 0,
        averageTime: 0,
        averageMemory: 0,
        errorRate: 0
      });
    }
    
    const langStats = stats.languageStats.get(monitoring.language);
    langStats.executions++;
    langStats.totalTime += monitoring.netExecutionTime || monitoring.wallTime;
    langStats.totalMemory += monitoring.peakMemory;
    
    if (result.success) {
      langStats.successCount++;
    } else {
      langStats.errorCount++;
    }
    
    // Update averages and error rate
    langStats.averageTime = langStats.totalTime / langStats.executions;
    langStats.averageMemory = langStats.totalMemory / langStats.executions;
    langStats.errorRate = (langStats.errorCount / langStats.executions) * 100;
    
    // Update global error rates by language
    stats.errorRates.set(monitoring.language, langStats.errorRate);
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats() {
    const stats = {
      ...this.performanceStats,
      languageStats: Object.fromEntries(this.performanceStats.languageStats),
      errorRates: Object.fromEntries(this.performanceStats.errorRates),
      systemResources: this.getSystemResources(),
      timestamp: new Date().toISOString()
    };
    
    return stats;
  }

  /**
   * Get performance statistics for a specific language
   */
  getLanguagePerformanceStats(language) {
    const langStats = this.performanceStats.languageStats.get(language);
    if (!langStats) {
      return null;
    }
    
    return {
      language,
      ...langStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats() {
    this.performanceStats = {
      totalExecutions: 0,
      totalExecutionTime: 0,
      totalMemoryUsed: 0,
      languageStats: new Map(),
      errorRates: new Map(),
      averageExecutionTime: 0,
      peakMemoryUsage: 0,
      containerOverhead: {
        startupTime: 0,
        memoryOverhead: 0,
        samples: 0
      }
    };
  }
}

module.exports = ExecutionMonitor;