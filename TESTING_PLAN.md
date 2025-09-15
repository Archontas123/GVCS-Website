# Comprehensive Solo Testing Plan for CS Club Programming Contest Platform

## Pre-Testing Setup Requirements

**Environment Setup:**
1. Start both backend and frontend servers
2. Set up PostgreSQL database with test data
3. Start Redis server for queue management
4. Ensure Docker is running for code execution
5. Create multiple test team accounts and admin accounts
6. Prepare test code files in C++, Java, and Python

## Phase 1: Authentication & Authorization Testing (30 mins)

### **Team Authentication - Specific Test Scenarios:**

**Team Registration Test Data:**
- **Team 1:**
  - Team Name: "AlgorithmAces"
  - Contest Code: "SPRING2024"
  - Email: "aces@university.edu"
  - Password: "SecurePass123!"

- **Team 2:**
  - Team Name: "CodeWarriors"  
  - Contest Code: "SPRING2024"
  - Email: "warriors@college.edu"
  - Password: "StrongPassword456!"

- **Team 3:**
  - Team Name: "ByteBusters"
  - Contest Code: "SPRING2024"  
  - Email: "busters@school.edu"
  - Password: "MyPassword789!"

**Invalid Registration Tests:**
- **Duplicate Team Name:** Try registering "AlgorithmAces" again
- **Invalid Contest Code:** Use "INVALID2024" instead of "SPRING2024"
- **Weak Password:** Try "123" or "password"
- **Invalid Email:** Use "notanemail" or "test@"
- **Empty Fields:** Submit form with missing team name or email

**Login Test Scenarios:**
- **Valid Login:** Use "aces@university.edu" / "SecurePass123!"
- **Invalid Password:** Use "aces@university.edu" / "WrongPassword"
- **Non-existent Email:** Use "fake@email.com" / "AnyPassword"
- **Empty Credentials:** Submit empty login form
- **SQL Injection Attempt:** Try "' OR '1'='1" in email field

**Session Management Tests:**
- Login successfully, refresh page - should stay logged in
- Login, close browser tab, reopen - test session persistence
- Login, wait for session timeout (if configured), verify auto-logout
- Login on multiple tabs - test concurrent session handling

### **Admin Authentication - Specific Test Data:**

**Admin Test Accounts:**
- **Super Admin:**
  - Email: "superadmin@csclub.edu"
  - Password: "AdminPass123!"
  - Role: "super_admin"

- **Regular Admin:**
  - Email: "admin@csclub.edu"  
  - Password: "AdminPass456!"
  - Role: "admin"

**Admin Authorization Tests:**
- **Super Admin Access:** Should access all admin features
- **Regular Admin Limits:** Test restricted access to certain features
- **Team Account Admin Access:** Regular team account should NOT access admin routes
- **Direct URL Access:** Try accessing "/admin" without admin credentials

## Phase 2: Contest Management Testing (45 mins)

### **Contest Creation - Specific Form Inputs:**

**Basic Contest Information:**
- **Contest Name:** "CS Club Spring Programming Contest 2024"
- **Contest Description:** 
  ```
  Welcome to our spring programming contest! This contest features 5 algorithmic problems 
  of varying difficulty. You'll have 3 hours to solve as many problems as possible.
  
  Contest Rules:
  - Teams of 1-3 members
  - C++, Java, and Python allowed
  - ICPC-style scoring with penalty time
  - Questions allowed during first hour
  ```
- **Contest Code:** "SPRING2024" (for team registration)
- **Max Team Size:** 3
- **Contest Type:** "ICPC" or "IOI"

**Contest Timing:**
- **Start Date:** "2024-04-15" 
- **Start Time:** "14:00" (2:00 PM)
- **Duration:** 180 (minutes)
- **Freeze Time:** 60 (minutes before end - so leaderboard freezes at 2:00 remaining)
- **Time Zone:** "America/New_York" or system default

**Contest Settings:**
- **Registration Required:** ✓ (checked)
- **Allow Late Registration:** ✗ (unchecked)
- **Show Leaderboard:** ✓ (checked)  
- **Allow Clarifications:** ✓ (checked)
- **Penalty per Wrong Submission:** 20 (minutes)

**Contest Status Options to Test:**
- **Draft:** Contest being created, not visible to teams
- **Upcoming:** Published but not yet started  
- **Active:** Currently running
- **Frozen:** Leaderboard frozen, contest still active
- **Ended:** Contest completed
- **Cancelled:** Contest cancelled

### **Team Registration - Specific Form Inputs:**

**Team Registration Form:**
- **Team Name:** "CodeCrusaders" 
- **Contest Access Code:** "SPRING2024"
- **Institution/School:** "University of Example"
- **Team Leader Email:** "leader@example.edu"
- **Team Leader Name:** "John Smith"

**Team Member Details:**
- **Member 1 Name:** "John Smith" (Team Leader)
- **Member 1 Email:** "john.smith@example.edu"
- **Member 1 Student ID:** "12345678"

- **Member 2 Name:** "Jane Doe"  
- **Member 2 Email:** "jane.doe@example.edu"
- **Member 2 Student ID:** "87654321"

- **Member 3 Name:** "Bob Johnson"
- **Member 3 Email:** "bob.johnson@example.edu" 
- **Member 3 Student ID:** "11223344"

**Registration Scenarios to Test:**
- Valid registration with all fields completed
- Registration with invalid contest code "INVALID2024"
- Duplicate team name registration attempt
- Registration after contest has started
- Registration with missing required fields
- Registration with invalid email formats
- Team size exceeding contest maximum

### **Contest Control Panel Testing:**
- **Manual Contest Start:** Click "Start Contest Now" button
- **Contest Timeline Override:** Extend contest by 30 minutes
- **Leaderboard Freeze:** Click "Freeze Leaderboard" during active contest
- **Leaderboard Unfreeze:** Click "Unfreeze Leaderboard" 
- **Emergency Stop:** Click "End Contest Now" button
- **Contest Settings Update:** Modify freeze time from 60 to 30 minutes mid-contest

## Phase 3: Problem & Test Case Management (40 mins)

### **Problem Creation - Specific Form Inputs:**

**Basic Problem Details:**
- **Title:** "Two Sum Problem"
- **Problem ID:** "two_sum_001" 
- **Points:** 100
- **Time Limit:** 2000 (milliseconds)
- **Memory Limit:** 256 (MB)
- **Difficulty:** "Easy" / "Medium" / "Hard"

**Problem Description (Rich Text):**
```
Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.
```

**Function Signatures by Language:**

*C++ Function Signature:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
}
```

*Java Function Signature:*
```java
public int[] twoSum(int[] nums, int target) {
    // Your code here
}
```

*Python Function Signature:*
```python
def two_sum(nums, target):
    # Your code here
    pass
```

**Problem Tags:** ["Array", "Hash Table", "Two Pointers"]
**Contest Assignment:** Select contest from dropdown
**Visibility:** "Hidden" until contest starts

### **Test Case Creation - Specific Examples:**

**Sample Test Case 1 (Visible to participants):**
- **Input:** 
  ```
  [2, 7, 11, 15]
  9
  ```
- **Expected Output:** 
  ```
  [0, 1]
  ```
- **Points:** 20
- **Is Sample:** ✓ (checked)
- **Description:** "Basic example from problem statement"

**Hidden Test Case 1:**
- **Input:** 
  ```
  [3, 2, 4]
  6
  ```
- **Expected Output:** 
  ```
  [1, 2]
  ```
- **Points:** 20
- **Is Sample:** ✗ (unchecked)
- **Description:** "Second example case"

**Hidden Test Case 2 (Edge Case):**
- **Input:** 
  ```
  [3, 3]
  6
  ```
- **Expected Output:** 
  ```
  [0, 1]
  ```
- **Points:** 30
- **Is Sample:** ✗ (unchecked)
- **Description:** "Duplicate numbers edge case"

**Hidden Test Case 3 (Large Input):**
- **Input:** 
  ```
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  19
  ```
- **Expected Output:** 
  ```
  [3, 14]
  ```
- **Points:** 30
- **Is Sample:** ✗ (unchecked)  
- **Description:** "Large array test case"

**Test Case Management Tasks:**
- Create 1-2 sample test cases (visible to teams)
- Create 5-8 hidden test cases for comprehensive judging
- Test input/output format validation with malformed data
- Create problems with partial scoring (distribute 100 points across test cases)
- Test bulk test case import/export functionality
- Verify test case execution order (samples first, then hidden)

## Phase 4: Core Judging System Testing (60 mins)

### **Test Code Examples for Each Verdict Type:**

**✅ Accepted (AC) Solutions:**

*C++ Correct Solution:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> mp;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (mp.count(complement)) {
            return {mp[complement], i};
        }
        mp[nums[i]] = i;
    }
    return {};
}
```

*Java Correct Solution:*
```java
public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }
        map.put(nums[i], i);
    }
    return new int[]{};
}
```

*Python Correct Solution:*
```python
def two_sum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []
```

**❌ Wrong Answer (WA) Solutions:**

*Returns wrong indices:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    return {0, 1}; // Always returns [0,1] regardless of input
}
```

*Incorrect algorithm:*
```python
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if nums[i] + nums[j] == target:
                return [j, i]  # Wrong order - should be [i, j]
    return []
```

**⏰ Time Limit Exceeded (TLE) Solutions:**

*Infinite loop:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    while(true) {
        // Infinite loop to test TLE
    }
    return {};
}
```

*Inefficient algorithm:*
```java
public int[] twoSum(int[] nums, int target) {
    // O(n^3) solution to cause TLE on large inputs
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            for (int k = 0; k < 1000000; k++) { // Unnecessary loop
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
    }
    return new int[]{};
}
```

**💾 Memory Limit Exceeded (MLE) Solution:**
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    vector<int> massive_array(100000000); // Allocate ~400MB
    // Rest of correct logic
    unordered_map<int, int> mp;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (mp.count(complement)) {
            return {mp[complement], i};
        }
        mp[nums[i]] = i;
    }
    return {};
}
```

**🔧 Compilation Error (CE) Solutions:**

*C++ Syntax Error:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> mp
    // Missing semicolon above
    return {};
}
```

*Java Syntax Error:*
```java
public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>()
    // Missing semicolon above
    return new int[]{};
}
```

*Python Syntax Error:*
```python
def two_sum(nums, target)
    # Missing colon above
    return []
```

**💥 Runtime Error (RE) Solutions:**

*Array index out of bounds:*
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    return {nums[1000], nums[2000]}; // Accessing invalid indices
}
```

*Null pointer/Division by zero:*
```java
public int[] twoSum(int[] nums, int target) {
    int x = 5 / 0; // Division by zero
    return new int[]{};
}
```

### **Judging Queue Test Scenarios:**

**Rapid Submission Testing:**
1. Submit 10 solutions simultaneously from different teams
2. Monitor queue position updates in real-time  
3. Verify FIFO processing order
4. Check queue status display updates

**Queue Priority Testing:**
- Submit from Team A, Team B, Team C in rapid succession
- Verify each team sees their correct queue position
- Test queue processing during high load periods

**Execution Time Monitoring:**
- Monitor execution times for each solution type:
  - AC solutions: Should be under 100ms
  - TLE solutions: Should timeout at configured limit (2000ms)
  - Compilation: Should be under 5 seconds

## Phase 5: Real-Time Features Testing (45 mins)

**WebSocket Connection Testing:**
- Open multiple browser tabs/windows for different teams
- Test WebSocket authentication and room assignment
- Test connection persistence and reconnection
- Test connection cleanup on logout

**Real-Time Leaderboard:**
- Submit solutions and verify immediate leaderboard updates
- Test leaderboard with multiple teams simultaneously
- Verify problem status matrix updates
- Test leaderboard during freeze/unfreeze
- Test leaderboard with different scoring scenarios

**Real-Time Notifications:**
- Monitor submission status updates in real-time
- Test verdict notifications to correct teams only
- Test contest event notifications (start/end/freeze)
- Test queue position updates
- Test notification delivery during network interruptions

## Phase 6: Leaderboard & Scoring Testing (30 mins)

**ICPC Scoring Validation:**
- Create scenarios with different numbers of problems solved
- Test penalty time calculations
- Test wrong answer penalty accumulation
- Test submission time tracking accuracy
- Verify ranking algorithm correctness

**Leaderboard Display:**
- Test leaderboard with various team counts
- Verify problem solve matrix accuracy
- Test score calculations in real-time
- Test leaderboard export functionality
- Test historical leaderboard access

## Phase 7: Admin Dashboard Testing (40 mins)

**System Monitoring:**
- Access admin dashboard with different admin roles
- Monitor system statistics and metrics
- Test performance monitoring displays
- Check system health indicators
- Review system logs and filtering

**Contest Administration:**
- Use contest control panel during active contests
- Monitor live contest statistics
- Track team registration and approval workflow
- Monitor judge system performance
- Test administrative override capabilities

**Team Management:**
- Review team registration requests
- Test team approval/rejection workflow
- Monitor team activity and submissions
- Access team performance analytics

## Phase 8: Security & Edge Case Testing (35 mins)

**Input Validation Testing:**
- Test SQL injection attempts on all forms
- Test XSS attempts in text fields
- Test file upload security (if applicable)
- Test rate limiting with rapid requests
- Test authentication bypass attempts

**Execution Security:**
- Submit malicious code attempts (file access, network calls)
- Test resource exhaustion attempts
- Test container escape attempts
- Verify execution environment isolation

**Session Security:**
- Test session hijacking scenarios
- Test concurrent login limitations
- Test session timeout enforcement
- Test cross-site request forgery protection

## Phase 9: Performance & Load Testing (25 mins)

**Submission Load Testing:**
- Submit multiple solutions simultaneously
- Test system behavior with queue backlog
- Monitor response times under load
- Test database performance with concurrent operations

**Real-Time Feature Load:**
- Open many WebSocket connections
- Test leaderboard updates with high activity
- Monitor memory usage during extended testing
- Test system recovery after stress

## Phase 10: Integration & End-to-End Testing (45 mins)

**Complete Contest Simulation:**
- Set up full contest with multiple problems
- Register multiple teams
- Run complete contest lifecycle (start → solve → freeze → end)
- Test all features working together seamlessly

**Cross-Browser Testing:**
- Test in Chrome, Firefox, Edge
- Test responsive design on different screen sizes
- Test WebSocket compatibility across browsers
- Test file download/export features

**Data Persistence Testing:**
- Test database integrity after various operations
- Test data recovery scenarios
- Verify audit trail and logging
- Test backup and restore procedures (if implemented)

## Testing Tools & Documentation

**Required Tools:**
- Multiple browser windows/incognito tabs
- Network throttling tools for connection testing
- Browser developer tools for debugging
- Postman/curl for API testing
- Database client for data verification

**Documentation During Testing:**
- Record all bugs found with reproduction steps
- Note performance bottlenecks
- Document user experience issues
- Track feature completeness
- Log system behavior under various conditions

## Total Estimated Testing Time: 6.5 hours

**Recommended Schedule:**
- **Day 1 (3 hours):** Phases 1-4 (Core functionality)
- **Day 2 (2 hours):** Phases 5-7 (Real-time and admin features)  
- **Day 3 (1.5 hours):** Phases 8-10 (Security, performance, integration)

This plan ensures comprehensive coverage of all features while being manageable for solo testing. Each phase builds on the previous one, allowing you to catch integration issues early.

---

## 📋 Quick Reference: All Form Fields & Test Data

### **Contest Creation Form**
```
Contest Name: "CS Club Spring Programming Contest 2024"
Contest Code: "SPRING2024"  
Start Date: "2024-04-15"
Start Time: "14:00"
Duration: 180 (minutes)
Freeze Time: 60 (minutes)
Max Team Size: 3
Contest Type: "ICPC"
Registration Required: ✓
Allow Late Registration: ✗
Penalty per Wrong Submission: 20
```

### **Problem Creation Form**
```
Title: "Two Sum Problem"
Problem ID: "two_sum_001"
Points: 100
Time Limit: 2000 (ms)
Memory Limit: 256 (MB)
Difficulty: "Easy"
Tags: ["Array", "Hash Table", "Two Pointers"]
```

### **Test Case Creation**
```
Sample Test Case:
Input: [2, 7, 11, 15]\n9
Expected Output: [0, 1]
Points: 20
Is Sample: ✓

Hidden Test Case:
Input: [3, 2, 4]\n6
Expected Output: [1, 2] 
Points: 20
Is Sample: ✗
```

### **Team Registration Form**
```
Team Name: "AlgorithmAces"
Contest Code: "SPRING2024"
Institution: "University of Example"
Team Leader: "John Smith"
Leader Email: "leader@example.edu"
Member 2: "Jane Doe" (jane.doe@example.edu)
Member 3: "Bob Johnson" (bob.johnson@example.edu)
```

### **Login Credentials for Testing**
```
Team Login: "aces@university.edu" / "SecurePass123!"
Admin Login: "admin@csclub.edu" / "AdminPass456!"
Super Admin: "superadmin@csclub.edu" / "AdminPass123!"
```

### **Function Signatures Templates**
```cpp
// C++
vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
}
```
```java
// Java  
public int[] twoSum(int[] nums, int target) {
    // Your code here
}
```
```python
# Python
def two_sum(nums, target):
    # Your code here
    pass
```

## Feature Categories Covered

### 1. Authentication & Authorization Features
- Team registration, login, session management
- Admin authentication and role-based access control
- Contest access validation

### 2. Contest Management Features  
- Contest CRUD operations, control (start/freeze/end)
- Team registration for contests
- Contest timeline enforcement

### 3. Problem Management Features
- Problem creation with descriptions and constraints
- Function signatures for multiple languages
- Problem visibility controls

### 4. Test Case Management Features
- Sample and hidden test case creation
- Partial scoring configuration
- Test case validation and execution

### 5. Code Execution & Judging System
- Multi-language support (C++, Java, Python)
- Docker-based secure execution
- Comprehensive verdict system (AC, WA, TLE, MLE, CE, RE)
- Queue management with Redis

### 6. Submission Management Features
- Code submission processing and storage
- Submission history and analytics
- Team-specific submission tracking

### 7. Real-Time Features (WebSocket)
- Live leaderboard updates
- Real-time submission notifications
- Contest event broadcasting
- Queue position tracking

### 8. Leaderboard & Scoring Features
- ICPC-style ranking system
- Penalty time calculations
- Problem solve matrix display
- Score export functionality

### 9. Admin Dashboard Features
- System monitoring and health checks
- Contest administration tools
- Team management and approval workflow
- Performance analytics

### 10. Team Management Features
- Team registration workflow
- Member information management
- Contest participation tracking
- Performance analytics

### 11. Security Features
- Input validation and SQL injection prevention
- Container isolation and execution security
- Session management and JWT validation
- Rate limiting and CORS protection

### 12. Performance & Monitoring Features
- Execution time and resource tracking
- Queue performance monitoring
- System analytics and reporting
- Database performance optimization