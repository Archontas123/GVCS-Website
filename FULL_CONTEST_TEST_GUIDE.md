# Complete Contest Testing Guide

## Overview
This guide provides a comprehensive step-by-step process to test the entire contest workflow from setup to completion. Use this guide to ensure all systems are working perfectly before running an actual contest.

## Prerequisites
- System properly installed and configured
- All dependencies installed (`npm run install:all`)
- Database migrations completed
- Docker environment set up for code execution

## Phase 1: System Setup and Verification

### 1.1 Database Setup
```bash
# Navigate to project root
cd /mnt/c/Users/Tavuc/Documents/Workspace/Web/CSCLUBWebsite

# Install dependencies first
npm install

# Start database (if using Docker)
npm run docker:up

# Alternative: Start services manually from backend directory
cd backend
npm run db:setup

# Run migrations (from backend directory)
npm run db:migrate

# Seed initial data (from backend directory)
npm run db:seed

# Test database connection (from backend directory)
NODE_ENV=development node -e "const {testConnection} = require('./src/utils/db'); testConnection().then(() => console.log('✅ DB connection OK')).catch(err => console.error('❌ DB Error:', err.message))"
```

**Expected Results:**
- ✅ Database starts successfully
- ✅ All migrations run without errors
- ✅ Seed data loads correctly
- ✅ Database connection test passes

### 1.2 Application Startup
```bash
# From project root - Start both backend and frontend
npm run dev

# Alternative: Start services separately
# Terminal 1: Backend (from project root)
npm run dev:backend

# Terminal 2: Frontend (from project root)
npm run dev:frontend

# Manual startup:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && GENERATE_SOURCEMAP=false npm start
```

**Expected Results:**
- ✅ Backend starts on port 3000
- ✅ Frontend starts on port 3001 (or next available)
- ✅ No compilation errors
- ✅ Both services respond to health checks

### 1.3 Judge System Verification
```bash
# Test code execution environment
cd backend
npm run judge:build

# Test judge system
npm run judge:test
```

**Expected Results:**
- ✅ Judge Docker containers build successfully
- ✅ Code execution environment is functional
- ✅ All supported languages (C++, Java, Python) work correctly

## Phase 2: Admin Setup and Contest Creation

### 2.1 Admin Login
1. **Access Admin Panel**
   - Navigate to `http://localhost:3001/admin/login`
   - Enter admin credentials:
     - Username: `admin`
     - Password: `password123` (or configured password)
   - Click "Login"

**Expected Results:**
- ✅ Admin login page loads correctly
- ✅ Authentication succeeds
- ✅ Admin dashboard displays

### 2.2 Create Test Contest
1. **Contest Creation**
   - Click "Create Contest" from dashboard
   - Fill in contest details:
     ```
     Contest Name: "Test Contest 2024"
     Description: "Full system test contest"
     Start Time: [Current time + 10 minutes]
     Duration: 120 (minutes)
     Freeze Time: 30 (minutes before end)
     ```
   - Click "Generate Registration Code" 
   - **Save the registration code** (e.g., "ABC123XY")
   - Click "Create Contest"

**Expected Results:**
- ✅ Contest creation form works
- ✅ Contest saves successfully
- ✅ Registration code is generated
- ✅ Contest appears in admin dashboard

### 2.3 Add Test Problems
For each problem (A, B, C), follow these steps:

#### Problem A: Simple Addition
1. **Problem Details**
   ```
   Title: "Simple Addition"
   Description: "Given two integers, output their sum."
   Time Limit: 1000ms
   Memory Limit: 256MB
   ```

2. **Problem Statement**
   ```markdown
   # Problem A: Simple Addition
   
   ## Description
   Given two integers A and B, calculate and output their sum.
   
   ## Input
   Two integers A and B separated by a space (-1000 ≤ A, B ≤ 1000)
   
   ## Output
   Output A + B
   
   ## Sample Input
   ```
   3 5
   ```
   
   ## Sample Output
   ```
   8
   ```
   ```

3. **Test Cases**
   Add these test cases:
   ```
   Input: "3 5", Output: "8", Sample: Yes
   Input: "0 0", Output: "0", Sample: No
   Input: "-5 3", Output: "-2", Sample: No
   Input: "1000 -1000", Output: "0", Sample: No
   ```

#### Problem B: Array Maximum
1. **Problem Details**
   ```
   Title: "Array Maximum"
   Description: "Find the maximum element in an array."
   Time Limit: 2000ms
   Memory Limit: 256MB
   ```

2. **Problem Statement**
   ```markdown
   # Problem B: Array Maximum
   
   ## Description
   Given an array of N integers, find and output the maximum element.
   
   ## Input
   First line: integer N (1 ≤ N ≤ 100)
   Second line: N integers separated by spaces (-1000 ≤ each element ≤ 1000)
   
   ## Output
   Output the maximum element
   
   ## Sample Input
   ```
   5
   3 1 4 1 5
   ```
   
   ## Sample Output
   ```
   5
   ```
   ```

3. **Test Cases**
   ```
   Input: "5\n3 1 4 1 5", Output: "5", Sample: Yes
   Input: "1\n42", Output: "42", Sample: No
   Input: "3\n-5 -2 -8", Output: "-2", Sample: No
   Input: "4\n1000 999 998 1000", Output: "1000", Sample: No
   ```

#### Problem C: String Reversal
1. **Problem Details**
   ```
   Title: "String Reversal"
   Description: "Reverse a given string."
   Time Limit: 1000ms
   Memory Limit: 256MB
   ```

2. **Problem Statement**
   ```markdown
   # Problem C: String Reversal
   
   ## Description
   Given a string, output the string reversed.
   
   ## Input
   A single line containing a string (1 ≤ length ≤ 100, contains only lowercase letters)
   
   ## Output
   Output the reversed string
   
   ## Sample Input
   ```
   hello
   ```
   
   ## Sample Output
   ```
   olleh
   ```
   ```

3. **Test Cases**
   ```
   Input: "hello", Output: "olleh", Sample: Yes
   Input: "a", Output: "a", Sample: No
   Input: "abcd", Output: "dcba", Sample: No
   Input: "programming", Output: "gnimmargorp", Sample: No
   ```

**Expected Results for Each Problem:**
- ✅ Problem saves successfully
- ✅ Test cases upload correctly
- ✅ Sample test cases are marked properly
- ✅ Problems appear in contest problem list

## Phase 3: Team Registration Testing

### 3.1 Team Registration Process
Test with 3 different teams:

#### Team 1: "AlgoMasters"
1. Navigate to `http://localhost:3001/register`
2. Fill in registration form:
   ```
   Team Name: "AlgoMasters"
   Registration Code: [Use code from Phase 2.2]
   Team Member 1: "Alice Johnson"
   Team Member 2: "Bob Smith"
   Team Member 3: "Carol Wilson"
   ```
3. Click "Register Team"
4. **Save the team credentials** provided

#### Team 2: "CodeCrusaders"
1. Use same process with different team name: "CodeCrusaders"
2. Different member names: "Dave Brown", "Eve Davis", "Frank Miller"

#### Team 3: "BugHunters"
1. Use same process with different team name: "BugHunters"
2. Different member names: "Grace Lee", "Henry Taylor", "Ivy Chen"

**Expected Results:**
- ✅ Registration page loads correctly
- ✅ Form validation works (try invalid codes)
- ✅ Teams register successfully
- ✅ Team credentials are provided
- ✅ Teams appear in admin dashboard

### 3.2 Team Login Testing
For each registered team:
1. Navigate to `http://localhost:3001/team/login`
2. Enter team credentials
3. Click "Login"
4. Verify access to contest interface

**Expected Results:**
- ✅ Team login page works
- ✅ Authentication succeeds for all teams
- ✅ Contest interface loads correctly
- ✅ Problems are visible (but submissions disabled until contest starts)

## Phase 4: Contest Execution Testing

### 4.1 Start the Contest
1. **Admin Action**
   - Go to admin dashboard
   - Find the test contest
   - Click "Start Contest"
   - Verify contest status changes to "Running"

**Expected Results:**
- ✅ Contest starts successfully
- ✅ Status updates in admin dashboard
- ✅ Teams can now submit solutions
- ✅ Timer begins counting down

### 4.2 Submit Test Solutions

#### Team 1 (AlgoMasters) - Submit to Problem A
1. Login as AlgoMasters
2. Navigate to Problem A
3. Read problem statement
4. Submit correct solution:

**C++ Solution:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
```

**Expected Results:**
- ✅ Code editor works correctly
- ✅ Submission processes successfully
- ✅ Result shows "Accepted"
- ✅ Leaderboard updates

#### Team 1 - Submit Incorrect Solution to Problem B
Submit an intentionally wrong solution:

**Python Solution (Wrong):**
```python
n = int(input())
arr = list(map(int, input().split()))
print(min(arr))  # Wrong: should be max, not min
```

**Expected Results:**
- ✅ Submission processes
- ✅ Result shows "Wrong Answer"
- ✅ No points awarded
- ✅ Penalty time applied

#### Team 2 (CodeCrusaders) - Submit to Problem A
Submit correct solution in Java:

**Java Solution:**
```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
        sc.close();
    }
}
```

**Expected Results:**
- ✅ Java compilation works
- ✅ Solution executes correctly
- ✅ Result shows "Accepted"
- ✅ Team appears on leaderboard

#### Team 2 - Submit to Problem B
Submit correct solution:

**Python Solution:**
```python
n = int(input())
arr = list(map(int, input().split()))
print(max(arr))
```

**Expected Results:**
- ✅ Python execution works
- ✅ Solution accepted
- ✅ Leaderboard updates correctly

#### Team 3 (BugHunters) - Submit to Problem C
Submit correct solution:

**C++ Solution:**
```cpp
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s;
    cin >> s;
    reverse(s.begin(), s.end());
    cout << s << endl;
    return 0;
}
```

**Expected Results:**
- ✅ String manipulation works
- ✅ Solution accepted
- ✅ Leaderboard shows all teams

### 4.3 Test Error Conditions

#### Compilation Error Test
Submit code with syntax error:

**C++ with Error:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl  // Missing semicolon
    return 0;
}
```

**Expected Results:**
- ✅ Compilation fails appropriately
- ✅ Error message is shown
- ✅ No points awarded

#### Time Limit Exceeded Test
Submit intentionally slow solution:

**Python TLE Solution:**
```python
import time
n = int(input())
arr = list(map(int, input().split()))
time.sleep(5)  # Force timeout
print(max(arr))
```

**Expected Results:**
- ✅ Execution times out
- ✅ Result shows "Time Limit Exceeded"
- ✅ Proper error handling

### 4.4 Real-time Features Testing

#### WebSocket Connectivity
1. **Leaderboard Updates**
   - Keep leaderboard open in browser
   - Make submissions from different teams
   - Verify real-time updates

2. **Submission Feed**
   - Monitor admin dashboard
   - Verify submissions appear immediately
   - Check status updates in real-time

**Expected Results:**
- ✅ Leaderboard updates automatically
- ✅ No need to refresh pages
- ✅ All changes propagate immediately

#### Multiple Concurrent Submissions
1. Have all three teams submit simultaneously
2. Monitor judge queue in admin dashboard
3. Verify all submissions process correctly

**Expected Results:**
- ✅ Queue handles multiple submissions
- ✅ No submissions are lost
- ✅ Processing order is maintained

## Phase 5: Advanced Features Testing

### 5.1 Leaderboard Freeze Testing
1. **Manual Freeze** (test before auto-freeze)
   - Go to admin contest control
   - Click "Freeze Leaderboard"
   - Make new submissions
   - Verify leaderboard doesn't update for teams

2. **Automatic Freeze** (wait for freeze time)
   - Let contest reach freeze time (30 min before end)
   - Verify automatic freeze occurs
   - Test continued submissions

**Expected Results:**
- ✅ Manual freeze works correctly
- ✅ Automatic freeze triggers on time
- ✅ Teams can still submit but don't see ranking changes
- ✅ Admin can still see all updates

### 5.2 Contest End Testing
1. **Let Contest Run to Completion**
   - Monitor until contest end time
   - Verify automatic contest ending
   - Check final leaderboard generation

2. **Manual Contest End** (if testing)
   - Use admin control to end contest early
   - Verify submissions stop being accepted

**Expected Results:**
- ✅ Contest ends automatically at scheduled time
- ✅ No more submissions accepted after end
- ✅ Final results are calculated correctly
- ✅ Leaderboard unfreezes showing final standings

### 5.3 Data Export Testing
1. **Export Results**
   - Go to admin dashboard
   - Export final standings
   - Verify CSV/PDF generation

2. **Export Submissions**
   - Export all submission data
   - Verify code archive creation

**Expected Results:**
- ✅ Export functions work correctly
- ✅ Data is complete and accurate
- ✅ Files download successfully

## Phase 6: System Performance Testing

### 6.1 Load Testing (Optional)
```bash
# Use load testing scripts if available
cd scripts/load-testing
npm install
npm run test:basic
```

### 6.2 Resource Monitoring
Monitor during testing:
- CPU usage
- Memory consumption
- Database performance
- Judge queue efficiency

**Expected Results:**
- ✅ System remains responsive under load
- ✅ No memory leaks detected
- ✅ Database queries perform adequately
- ✅ Judge processing stays within reasonable times

## Phase 7: Error Recovery Testing

### 7.1 Service Restart Testing
1. **Database Restart**
   ```bash
   docker-compose restart database
   ```
   - Verify graceful recovery
   - Test that contests continue properly

2. **Backend Restart**
   ```bash
   # Stop backend
   # Restart backend
   npm run dev:backend
   ```
   - Verify WebSocket reconnection
   - Test contest state preservation

**Expected Results:**
- ✅ Services recover gracefully
- ✅ No data loss occurs
- ✅ User sessions restore properly

### 7.2 Network Interruption Testing
1. Temporarily disable network
2. Verify error handling
3. Test reconnection behavior

**Expected Results:**
- ✅ Graceful error messages
- ✅ Automatic reconnection
- ✅ State synchronization after reconnection

## Phase 8: Security Testing

### 8.1 Authentication Testing
1. **Invalid Login Attempts**
   - Try wrong passwords
   - Test SQL injection attempts
   - Verify rate limiting

2. **Session Security**
   - Test session timeout
   - Verify token validation
   - Check authorization controls

**Expected Results:**
- ✅ Authentication is secure
- ✅ No unauthorized access possible
- ✅ Rate limiting works correctly

### 8.2 Input Validation Testing
1. **Code Submission Security**
   - Try submitting malicious code
   - Test file system access attempts
   - Verify sandbox isolation

2. **Form Input Validation**
   - Test XSS attempts in team names
   - Try oversized inputs
   - Verify input sanitization

**Expected Results:**
- ✅ All inputs are properly validated
- ✅ No security vulnerabilities found
- ✅ Sandbox properly isolates code execution

## Phase 9: Final Verification Checklist

### 9.1 Complete System Check
- [ ] All services start without errors
- [ ] Database migrations complete successfully
- [ ] Admin can create and manage contests
- [ ] Teams can register and login
- [ ] All programming languages work (C++, Java, Python)
- [ ] Submissions are judged correctly
- [ ] Leaderboard updates in real-time
- [ ] Contest timing works accurately
- [ ] Freeze functionality operates correctly
- [ ] Data export features work
- [ ] Error handling is appropriate
- [ ] Security measures are effective

### 9.2 Performance Benchmarks
- [ ] Page load times < 2 seconds
- [ ] Submission judging < 10 seconds per test case
- [ ] WebSocket responses < 500ms
- [ ] Database queries < 100ms average
- [ ] System handles 50+ concurrent users

### 9.3 User Experience Check
- [ ] Interface is intuitive and responsive
- [ ] Error messages are clear and helpful
- [ ] Navigation flows logically
- [ ] Mobile compatibility works
- [ ] Accessibility standards met

## Troubleshooting Common Issues

### Database Connection Problems
```bash
# Check database status
docker-compose ps database

# Restart database
docker-compose restart database

# Test connection manually
NODE_ENV=development node -e "const {testConnection} = require('./backend/src/utils/db'); testConnection().then(() => console.log('✅ DB OK')).catch(err => console.error('❌ DB Error:', err.message))"
```

### Judge System Issues
```bash
# Rebuild judge environment
cd backend && npm run judge:build

# Check Docker status
docker ps | grep judge

# Restart judge services
docker-compose restart judge-worker
```

### Frontend Build Problems
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build
```

### Performance Issues
```bash
# Monitor system resources
htop
docker stats

# Check logs for errors
docker-compose logs -f
```

## Success Criteria

A successful full contest test should demonstrate:

1. **Functionality**: All features work as designed
2. **Reliability**: System remains stable throughout test
3. **Performance**: Response times meet requirements
4. **Security**: No vulnerabilities discovered
5. **Usability**: Interface is intuitive and efficient
6. **Scalability**: System handles expected load
7. **Recovery**: Graceful handling of errors and failures

## Post-Test Actions

After completing the test:

1. **Document Issues**: Record any problems found
2. **Performance Metrics**: Save performance measurements
3. **Cleanup**: Reset database and clear test data
4. **Improvements**: Plan fixes for identified issues
5. **Backup**: Create system backup before live contest

## Conclusion

This comprehensive test guide ensures all aspects of the contest platform are thoroughly validated. Complete all phases successfully before conducting a live contest to guarantee the best experience for participants.

For additional support or troubleshooting, refer to:
- `TROUBLESHOOTING_GUIDE.md`
- `ADMIN_USER_MANUAL.md`
- `CONTEST_DAY_PROCEDURES.md`
- System logs in `/logs` directory