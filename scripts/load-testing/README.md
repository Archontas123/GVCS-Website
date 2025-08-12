# CS Club Hackathon Platform - Load Testing Suite

## Phase 6.1: Production-Ready Load Testing

This comprehensive load testing suite validates the CS Club Hackathon Platform's performance, scalability, and reliability under production-like conditions.

## 🎯 Overview

The load testing suite consists of five main components:

1. **Test Environment Setup** - Creates production-like test data and environment
2. **Team Simulation** - Simulates realistic user behavior with concurrent teams
3. **Submission Stress Test** - Tests submission system under high load
4. **Database Load Test** - Validates database performance with high query volume
5. **Performance Monitor** - Tracks system resources and provides optimization recommendations

## 📁 File Structure

```
load-testing/
├── setup-test-environment.js     # Test environment and data setup
├── team-simulation.js            # Concurrent team behavior simulation
├── submission-stress-test.js     # High-volume submission testing
├── database-load-test.js         # Database performance testing
├── performance-monitor.js        # System monitoring and analysis
├── test-runner.js               # Main orchestrator script
├── package.json                 # Dependencies and scripts
├── README.md                    # This documentation
├── test-data/                   # Generated test data (auto-created)
│   ├── team-credentials.json
│   ├── contest-info.json
│   ├── code-samples.json
│   └── load-test-config.json
├── results/                     # Test results (auto-created)
│   ├── comprehensive-load-test-report.json
│   ├── load-test-executive-summary.json
│   ├── load-test-report.html
│   └── individual test results...
└── logs/                        # Test logs (auto-created)
```

## 🚀 Quick Start

### Prerequisites

1. **Server Running**: Ensure your hackathon platform server is running on `http://localhost:3000`
2. **Dependencies**: Install load testing dependencies

```bash
cd load-testing
npm install
```

### Basic Usage

Run all tests with default settings:
```bash
npm run test:all
```

Or use the main test runner:
```bash
node test-runner.js
```

### Individual Tests

Run specific test components:

```bash
# Setup test environment and data
npm run setup:env

# Simulate concurrent teams
npm run test:teams

# Stress test submissions
npm run test:submissions

# Test database performance
npm run test:database

# Monitor system performance
npm run test:performance
```

## ⚙️ Configuration Options

### Command Line Arguments

```bash
node test-runner.js [options]

Options:
  --server-url <url>      Server URL (default: http://localhost:3000)
  --ws-url <url>          WebSocket URL (default: ws://localhost:3000)
  --max-teams <number>    Maximum concurrent teams (default: 50)
  --submission-rate <n>   Submissions per second (default: 10)
  --duration <seconds>    Test duration in seconds (default: 300)
  --parallel              Run tests in parallel
  --no-report             Skip comprehensive report generation
  --tests <list>          Comma-separated list of tests to run
  --clear-previous        Clear previous test results
  --help                  Show help message
```

### Environment Variables

```bash
# Server configuration
SERVER_URL=http://localhost:3000
WS_URL=ws://localhost:3000

# Test parameters
MAX_TEAMS=100
SUBMISSIONS_PER_SEC=15
TEST_DURATION=600
WORKER_COUNT=4

# Monitoring thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
RESPONSE_THRESHOLD=2000
```

## 📊 Test Scenarios

### 1. Test Environment Setup

**Purpose**: Creates a production-like test environment with realistic data

**What it does**:
- Creates test contest with 6 problems
- Registers 100 test teams
- Generates code samples in multiple languages
- Sets up test cases and validation data
- Validates server connectivity

**Duration**: 1-2 minutes

### 2. Team Simulation

**Purpose**: Simulates realistic user behavior patterns

**Features**:
- **50+ concurrent teams** with different skill levels
- **Realistic behavior patterns**:
  - Aggressive: High submission rate, frequent activity
  - Moderate: Normal submission rate, balanced activity
  - Conservative: Low submission rate, careful approach
- **WebSocket connections** for real-time features
- **Staggered startup** to avoid thundering herd

**Metrics Tracked**:
- Request response times
- WebSocket connection health
- Submission success rates
- Team behavior patterns

**Duration**: 5 minutes (configurable)

### 3. Submission Stress Test

**Purpose**: Tests submission system under high load

**Features**:
- **Multi-threaded workers** for concurrent submissions
- **Configurable submission rate** (default: 10/second)
- **Multiple programming languages** (C++, Java, Python)
- **Mixed submission types**:
  - Correct solutions (85%)
  - Wrong answers (10%)
  - Compile errors (3%)
  - Timeout scenarios (2%)

**Metrics Tracked**:
- Submissions per second
- Response time distribution
- Verdict accuracy
- Error rates by type

**Duration**: 2 minutes (configurable)

### 4. Database Load Test

**Purpose**: Validates database performance under high query volume

**Features**:
- **20 concurrent connections** (configurable)
- **Realistic query mix**:
  - Leaderboard queries (25%)
  - Submission queries (30%)
  - Problem queries (15%)
  - Complex joins (2%)
  - Insert/Update operations (13%)
- **SQLite optimization testing**
- **Query performance analysis**

**Metrics Tracked**:
- Queries per second
- Query execution times
- Connection efficiency
- Error rates by query type

**Duration**: 2 minutes (configurable)

### 5. Performance Monitor

**Purpose**: Tracks system resources and provides optimization insights

**Features**:
- **Real-time system monitoring**:
  - CPU usage (per core)
  - Memory consumption
  - Disk I/O
  - Network activity
- **Server process tracking**
- **API health monitoring**
- **Automated alert system**
- **Performance recommendations**

**Metrics Tracked**:
- System resource utilization
- API response times
- Process statistics
- Alert triggers

**Duration**: 5 minutes (configurable)

## 📈 Results and Reports

### Generated Reports

1. **Comprehensive Report** (`comprehensive-load-test-report.json`)
   - Complete test results and metrics
   - Detailed performance data
   - Configuration and environment info

2. **Executive Summary** (`load-test-executive-summary.json`)
   - High-level assessment
   - Critical issues and recommendations
   - Production readiness status

3. **HTML Report** (`load-test-report.html`)
   - Visual dashboard with charts
   - Easy-to-read summary
   - Shareable format

4. **CSV Time Series** (various `.csv` files)
   - Time-based performance data
   - Suitable for external analysis
   - Excel/spreadsheet compatible

### Key Metrics

- **Overall Success Rate**: Percentage of tests passed
- **Response Times**: Average, peak, and distribution
- **Throughput**: Requests/submissions per second
- **Resource Usage**: CPU, memory, disk utilization
- **Error Rates**: By test type and severity
- **Scalability**: Performance under increasing load

## 🎯 Success Criteria

### Production Readiness Indicators

✅ **All tests pass** with success rates > 95%

✅ **Response times** average < 500ms, peak < 2s

✅ **CPU usage** average < 70%, peak < 90%

✅ **Memory usage** average < 75%, peak < 85%

✅ **Database queries** > 50 queries/second sustained

✅ **Concurrent users** 50+ teams without degradation

✅ **Submission processing** 10+ submissions/second

✅ **Zero critical errors** during test duration

## 🔧 Troubleshooting

### Common Issues

**Server Not Responding**
```bash
# Check server status
curl http://localhost:3000/api/health

# Restart server if needed
cd ../server && npm start
```

**Database Locked Errors**
```bash
# Ensure no other processes are using the database
# Check for zombie processes
ps aux | grep node
```

**Out of Memory Errors**
```bash
# Reduce concurrent parameters
node test-runner.js --max-teams 25 --submission-rate 5
```

**WebSocket Connection Failures**
```bash
# Verify WebSocket support
node -e "console.log(require('ws'))"

# Check firewall/network settings
netstat -an | grep 3000
```

### Performance Tuning

**For Higher Load Testing**:
```bash
# Increase system limits
ulimit -n 65536

# Use more workers
node test-runner.js --submission-rate 20 --max-teams 100

# Enable parallel execution
node test-runner.js --parallel --duration 600
```

**For Resource-Constrained Systems**:
```bash
# Reduce load parameters
node test-runner.js --max-teams 20 --submission-rate 3 --duration 120

# Run tests individually
npm run test:teams
npm run test:submissions
```

## 📋 Test Validation Checklist

Before running load tests, ensure:

- [ ] Server is running and accessible
- [ ] Database is properly initialized
- [ ] All dependencies are installed
- [ ] Sufficient system resources available
- [ ] Network connectivity to server
- [ ] Write permissions for results directory

After running tests, verify:

- [ ] All test suites completed
- [ ] No critical errors in logs
- [ ] Performance within acceptable thresholds
- [ ] Generated reports are complete
- [ ] Recommendations are reviewed

## 🚀 Production Deployment

### Pre-Production Checklist

Based on load test results:

1. **Performance Validation**
   - [ ] All tests pass with acceptable metrics
   - [ ] No critical performance issues identified
   - [ ] System handles target concurrent load

2. **Resource Planning**
   - [ ] Server resources sized appropriately
   - [ ] Database performance optimized
   - [ ] Monitoring systems configured

3. **Scalability Preparation**
   - [ ] Horizontal scaling strategy defined
   - [ ] Load balancing configured if needed
   - [ ] Auto-scaling rules established

### Ongoing Monitoring

Set up production monitoring based on test thresholds:

- **CPU Usage**: Alert if > 80%
- **Memory Usage**: Alert if > 85%
- **Response Time**: Alert if > 2000ms
- **Error Rate**: Alert if > 5%
- **Database Performance**: Alert if query time > 1s

## 🤝 Contributing

To extend the load testing suite:

1. **Add New Test Scenarios**
   - Create new test files following existing patterns
   - Update `test-runner.js` to include new tests
   - Add configuration options as needed

2. **Enhance Metrics**
   - Extend existing metric collection
   - Add new performance indicators
   - Improve reporting and visualization

3. **Improve Automation**
   - Add CI/CD integration
   - Create automated test scheduling
   - Enhance result notification systems

## 📞 Support

For issues with load testing:

1. Check this README and troubleshooting section
2. Review generated error logs in `logs/` directory
3. Examine detailed test results in `results/` directory
4. Verify server logs for application-specific issues

## 📜 License

This load testing suite is part of the CS Club Hackathon Platform project and follows the same licensing terms.

---

**CS Club Hackathon Platform Load Testing Suite v6.1**  
*Comprehensive performance validation for production deployment*