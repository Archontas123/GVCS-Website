# Admin User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Contest Management](#contest-management)
3. [Problem Management](#problem-management)
4. [Team Administration](#team-administration)
5. [System Monitoring](#system-monitoring)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Admin Panel

1. **Login Process**
   - Navigate to `http://[server-address]/admin/login`
   - Enter your admin username and password
   - Click "Login" to access the admin dashboard

2. **First-Time Setup**
   - Change default admin password immediately
   - Configure system settings
   - Test all major functions before first contest

### Admin Dashboard Overview

The admin dashboard provides:
- **Contest Overview**: Active and upcoming contests
- **System Status**: Judge queue, database health, server resources
- **Quick Actions**: Start contest, create problems, manage teams
- **Live Statistics**: Submissions per minute, active teams, system load

## Contest Management

### Creating a New Contest

1. **Basic Contest Information**
   - Click "Create Contest" from the dashboard
   - Fill in required fields:
     - **Contest Name**: Clear, descriptive name
     - **Description**: Brief contest overview
     - **Start Time**: Exact start date and time
     - **Duration**: Contest length in minutes (typically 180-240)
     - **Freeze Time**: Minutes before end to freeze leaderboard (default: 60)

2. **Advanced Settings**
   - **Registration Settings**:
     - Generate unique registration code
     - Set registration deadline
     - Enable/disable team self-registration
   - **Scoring Settings**:
     - ICPC scoring (default)
     - Penalty time configuration
     - Balloon system settings

3. **Contest Validation**
   - Verify all settings are correct
   - Test registration code
   - Confirm start time and timezone
   - Save contest configuration

### Managing Existing Contests

1. **Contest List View**
   - View all contests (past, current, future)
   - Filter by status: Draft, Active, Completed
   - Sort by date, name, or participant count
   - Quick actions: Edit, Delete, Clone

2. **Contest Details**
   - View full contest information
   - See registered team count
   - Monitor submission statistics
   - Access contest-specific logs

3. **Contest Control**
   - **Start Contest**: Begin accepting submissions
   - **Freeze Leaderboard**: Hide rankings before final results
   - **End Contest**: Stop accepting submissions
   - **Emergency Stop**: Immediate contest termination

### Contest States

- **Draft**: Contest created but not yet active
- **Registration Open**: Teams can register but contest hasn't started
- **Running**: Contest is active, accepting submissions
- **Frozen**: Leaderboard frozen, contest still running
- **Ended**: Contest completed, final results available

## Problem Management

### Adding Problems to a Contest

1. **Problem Creation**
   - Navigate to contest → Problems section
   - Click "Add Problem"
   - Fill in problem details:
     - **Problem Letter**: Auto-assigned (A, B, C, etc.)
     - **Title**: Clear, concise problem title
     - **Description**: Full problem statement with examples
     - **Input Format**: Detailed input specifications
     - **Output Format**: Expected output format
     - **Constraints**: Input size and other limitations
     - **Time Limit**: Execution time limit (milliseconds)
     - **Memory Limit**: Memory usage limit (MB)

2. **Problem Statement Formatting**
   - Use Markdown for formatting
   - Include LaTeX for mathematical formulas: `$formula$` or `$$formula$$`
   - Add code blocks with syntax highlighting
   - Include images if necessary (upload via interface)

3. **Sample Test Cases**
   - Add at least 2-3 sample test cases
   - Mark test cases as "Sample" (visible to teams)
   - Ensure samples cover different scenarios
   - Verify sample outputs are correct

### Test Case Management

1. **Individual Test Case Addition**
   - Navigate to Problem → Test Cases
   - Click "Add Test Case"
   - Enter input data exactly as expected
   - Enter expected output exactly as required
   - Mark as Sample or Hidden

2. **Bulk Test Case Upload**
   - Prepare CSV file with columns: `input`, `expected_output`, `is_sample`
   - Click "Upload CSV"
   - Select file and upload
   - Review imported test cases
   - Correct any formatting issues

3. **Test Case Validation**
   - Test with known correct solution
   - Verify edge cases are covered
   - Check for trailing whitespace issues
   - Ensure deterministic outputs

### Problem Templates

Use these templates for common problem types:

1. **Algorithm Problem Template**
   ```markdown
   # Problem A: [Title]
   
   ## Description
   [Problem description with context]
   
   ## Input
   [Input format specification]
   
   ## Output
   [Output format specification]
   
   ## Constraints
   - [Constraint 1]
   - [Constraint 2]
   
   ## Sample Input
   ```
   [Input data]
   ```
   
   ## Sample Output
   ```
   [Expected output]
   ```
   
   ## Explanation
   [Optional explanation of sample]
   ```

## Team Administration

### Team Registration Management

1. **Monitoring Registrations**
   - View real-time registration feed
   - Check team name appropriateness
   - Verify registration completeness
   - Handle duplicate registrations

2. **Manual Team Management**
   - Add teams manually if needed
   - Edit team information
   - Reset team passwords/tokens
   - Deactivate problematic teams

3. **Registration Issues**
   - **Duplicate Names**: Help teams choose unique names
   - **Technical Problems**: Assist with browser/network issues
   - **Late Registration**: Add teams manually if policy allows

### Team Monitoring During Contest

1. **Active Team Status**
   - View all registered teams
   - Monitor last activity timestamps
   - Check submission patterns
   - Identify inactive teams

2. **Team Support**
   - Reset session tokens if needed
   - Assist with login problems
   - Handle submission issues
   - Provide technical support

## System Monitoring

### Judge System Status

1. **Queue Monitoring**
   - **Pending Submissions**: Number waiting to be judged
   - **Active Judges**: Currently processing submissions
   - **Processing Time**: Average time per submission
   - **Error Rate**: Failed judgments requiring attention

2. **Judge Performance**
   - Monitor processing times by language
   - Check for stuck submissions
   - Scale judge workers if needed
   - Review error patterns

### Database Health

1. **Connection Status**
   - Active connections count
   - Connection pool utilization
   - Query performance metrics
   - Slow query identification

2. **Data Integrity**
   - Verify scoring calculations
   - Check leaderboard consistency
   - Monitor submission data
   - Validate test case integrity

### Server Resources

1. **System Resources**
   - CPU utilization
   - Memory usage
   - Disk space availability
   - Network bandwidth usage

2. **Application Performance**
   - Response times
   - Error rates
   - WebSocket connections
   - Concurrent user count

## Advanced Features

### Leaderboard Management

1. **Freeze Control**
   - Manual freeze option
   - Automatic freeze before contest end
   - Unfreeze for final results
   - Freeze notifications to teams

2. **Ranking Display**
   - Real-time updates during contest
   - Frozen state display
   - Final results generation
   - Export capabilities

### Announcement System

1. **Contest Announcements**
   - Broadcast messages to all teams
   - Problem clarifications
   - Technical updates
   - Emergency notifications

2. **Communication Tools**
   - Target specific teams
   - Schedule announcements
   - Track delivery status
   - Archive communications

### Data Export and Reporting

1. **Result Exports**
   - Final standings (CSV, PDF)
   - Detailed submission reports
   - Team performance analysis
   - Statistical summaries

2. **Code Archives**
   - Export all submission code
   - Organize by team/problem
   - Include judgment details
   - Create downloadable archives

## Troubleshooting

### Common Issues and Solutions

1. **Slow Judge Processing**
   - **Symptoms**: Submissions stuck in "Judging" state
   - **Solutions**: 
     - Restart judge workers
     - Scale up worker count
     - Check Docker container health
     - Review system resources

2. **Database Connection Errors**
   - **Symptoms**: "Database connection failed" errors
   - **Solutions**:
     - Check database container status
     - Verify connection credentials
     - Restart database service
     - Check network connectivity

3. **Teams Cannot Submit**
   - **Symptoms**: Submission failures, authentication errors
   - **Solutions**:
     - Verify contest is running
     - Check team authentication tokens
     - Confirm problem configuration
     - Test submission process manually

4. **Incorrect Scoring**
   - **Symptoms**: Wrong leaderboard rankings
   - **Solutions**:
     - Recalculate scores manually
     - Verify test case correctness
     - Check submission timestamps
     - Review penalty calculations

### Emergency Procedures

1. **Contest Extension**
   - Access contest control panel
   - Adjust end time
   - Notify all participants
   - Document extension reason

2. **Problem Correction**
   - Update problem statement
   - Add clarification announcement
   - Consider rejudging affected submissions
   - Communicate changes clearly

3. **System Recovery**
   - Create immediate data backup
   - Identify failure cause
   - Implement fix
   - Verify system integrity
   - Resume contest operations

### Getting Help

- **System Logs**: Check `/logs` directory for detailed error information
- **Admin Console**: Use browser developer tools for frontend issues
- **Command Line Tools**: SSH access for advanced troubleshooting
- **Documentation**: Refer to technical documentation for detailed procedures

## Best Practices

1. **Before Contest**
   - Test complete system 24 hours in advance
   - Verify all problems with sample solutions
   - Prepare backup plans for critical failures
   - Train additional staff on basic operations

2. **During Contest**
   - Monitor system continuously
   - Respond to issues promptly
   - Maintain clear communication
   - Document all problems and solutions

3. **After Contest**
   - Archive all contest data
   - Generate comprehensive reports
   - Collect feedback from participants
   - Plan improvements for future contests

4. **Security**
   - Change default passwords
   - Limit admin access appropriately
   - Monitor for suspicious activity
   - Keep system updated and patched