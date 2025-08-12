# Team Registration Guide

## Quick Start Guide

### Registration Process

1. **Get Registration Information**
   - Obtain the contest registration code from your organizer
   - Make sure you have the contest website URL
   - Prepare a unique team name (3-50 characters)

2. **Register Your Team**
   - Go to the contest website
   - Click "Register" or navigate to the registration page
   - Enter your team name and the registration code
   - Click "Register Team"
   - Save your login credentials securely

3. **Access Team Dashboard**
   - Use your team name and registration code to log in
   - Bookmark the dashboard page
   - Familiarize yourself with the interface

## Detailed Registration Instructions

### Step 1: Getting Started

1. **System Requirements**
   - Modern web browser (Chrome, Firefox, Safari, Edge)
   - Stable internet connection
   - JavaScript enabled
   - Cookies enabled

2. **Before Registration**
   - Choose a unique, appropriate team name
   - Ensure team name is 3-50 characters long
   - Avoid special characters or offensive language
   - Have the registration code ready

### Step 2: Team Registration

1. **Navigate to Registration**
   - Open your web browser
   - Go to the contest website URL provided by organizers
   - Click "Register Team" or "Sign Up"

2. **Fill Registration Form**
   - **Team Name**: Enter your chosen team name
     - Must be unique across all teams
     - 3-50 characters only
     - Letters, numbers, spaces, and basic punctuation allowed
   - **Registration Code**: Enter the code provided by organizers
     - Code is case-sensitive
     - Must match exactly
   - Click "Register" to submit

3. **Registration Confirmation**
   - You'll receive a confirmation message
   - Your team credentials will be displayed
   - **Important**: Save these credentials securely
   - You'll be automatically logged in

### Step 3: First Login

1. **Login Process**
   - If not automatically logged in, click "Login"
   - Enter your team name and registration code
   - Click "Sign In"

2. **Dashboard Overview**
   - Contest information and timer
   - Problem list (when contest starts)
   - Team statistics
   - Submission history

## Dashboard Navigation

### Main Dashboard Elements

1. **Header Information**
   - Contest name and status
   - Time remaining (during contest)
   - Your team name
   - Logout option

2. **Problem Grid**
   - List of contest problems (A, B, C, etc.)
   - Status indicators for each problem:
     - 🟢 **Green**: Solved correctly
     - 🔴 **Red**: Attempted but incorrect
     - ⚪ **Gray**: Not attempted yet
     - 🟡 **Yellow**: Compilation error
   - Number of attempts shown for each problem

3. **Team Statistics**
   - Problems solved
   - Total attempts
   - Current ranking
   - Penalty time

4. **Navigation Menu**
   - Dashboard (home)
   - Individual problem pages
   - Leaderboard
   - Submission history

### Problem Pages

1. **Problem Statement**
   - Full problem description
   - Input and output format specifications
   - Constraints and limits
   - Sample input/output examples

2. **Code Editor**
   - Syntax highlighting
   - Language selection (C++, Java, Python)
   - Template code (optional)
   - Full-screen editing mode

3. **Submission Interface**
   - Language dropdown
   - Submit button
   - Submission history for this problem

## Problem Submission Process

### Step-by-Step Submission

1. **Select a Problem**
   - Click on problem letter (A, B, C, etc.) from dashboard
   - Read the problem statement carefully
   - Understand input/output requirements
   - Study sample test cases

2. **Write Your Solution**
   - Select programming language from dropdown
   - Write your code in the editor
   - Test with sample inputs mentally or on paper
   - Ensure your code handles edge cases

3. **Submit Your Code**
   - Double-check your language selection
   - Review your code one final time
   - Click "Submit Solution"
   - Confirm submission in dialog box

4. **Check Results**
   - Wait for judging to complete
   - Check verdict on problem page or dashboard
   - Review execution time and memory usage
   - Plan next steps based on result

### Understanding Verdicts

- **✅ Accepted (AC)**: Your solution is correct!
- **❌ Wrong Answer (WA)**: Output doesn't match expected result
- **⏱️ Time Limit Exceeded (TLE)**: Your code ran too slowly
- **💥 Runtime Error (RTE)**: Your program crashed during execution
- **📝 Compilation Error (CE)**: Your code has syntax errors
- **🧠 Memory Limit Exceeded (MLE)**: Your program used too much memory
- **⏳ Pending**: Submission is being judged

### Language-Specific Guidelines

#### C++ Submissions
- Use standard template: `#include <iostream>` etc.
- Main function: `int main() { ... return 0; }`
- Read from `stdin`, write to `stdout`
- Compile flags: `-O2 -std=c++17`

```cpp
#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}
```

#### Java Submissions
- Class name must be `Solution`
- Use `public static void main(String[] args)`
- Read from `System.in`, write to `System.out`

```java
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
    }
}
```

#### Python Submissions
- Use `input()` for reading
- Use `print()` for output
- No special class or function requirements

```python
# Your code here
n = int(input())
print(n)
```

## Real-time Features

### Live Leaderboard

1. **Accessing Leaderboard**
   - Click "Leaderboard" in navigation menu
   - Updates automatically every 30 seconds
   - Shows all team rankings

2. **Understanding Rankings**
   - Ranked by problems solved (most first)
   - Ties broken by penalty time (less is better)
   - Your team highlighted in the list
   - May freeze near contest end

3. **Leaderboard Information**
   - Team names and rankings
   - Problems solved count
   - Penalty time
   - Last submission time
   - Problem status grid

### Real-time Updates

1. **Automatic Updates**
   - Submission verdicts appear automatically
   - Leaderboard updates in real-time
   - Contest timer updates every second
   - Connection status indicator

2. **Notifications**
   - Contest start/end announcements
   - Important clarifications
   - System status updates
   - Emergency notifications

## Tips for Success

### Strategy Tips

1. **Read All Problems First**
   - Quickly scan all problems
   - Identify easier problems
   - Plan your approach
   - Start with problems you're confident about

2. **Time Management**
   - Monitor contest timer constantly
   - Don't spend too long on one problem
   - Save time for debugging and testing
   - Consider partial solutions for hard problems

3. **Submission Strategy**
   - Test thoroughly before submitting
   - Be careful with edge cases
   - Double-check input/output format
   - Don't submit until you're confident

### Technical Tips

1. **Browser Management**
   - Use bookmarks for quick navigation
   - Keep contest page open in dedicated window
   - Refresh page if updates seem slow
   - Have backup browser ready

2. **Code Management**
   - Write clean, readable code
   - Use meaningful variable names
   - Add comments for complex logic
   - Keep code organized

3. **Debugging**
   - Read error messages carefully
   - Test with sample inputs first
   - Check for off-by-one errors
   - Verify input/output format

## Troubleshooting Guide

### Common Issues

1. **Cannot Register**
   - Verify registration code is correct
   - Check team name meets requirements
   - Ensure team name is unique
   - Contact organizers if issues persist

2. **Login Problems**
   - Double-check team name spelling
   - Verify registration code
   - Clear browser cache/cookies
   - Try different browser

3. **Submission Issues**
   - Ensure contest is running
   - Check code compiles locally
   - Verify language selection
   - Contact organizers for technical help

4. **Page Not Loading**
   - Check internet connection
   - Refresh the page
   - Try different browser
   - Clear browser cache

5. **Slow Response**
   - Wait patiently during high traffic
   - Avoid refreshing repeatedly
   - Check system status announcements
   - Use minimal browser tabs

### Getting Help

1. **During Contest**
   - Raise hand for organizer assistance
   - Check announcements for known issues
   - Ask clarifying questions about problems
   - Report technical issues immediately

2. **Contact Information**
   - Contest organizers: [Contact Info]
   - Technical support: [Contact Info]
   - Emergency contact: [Contact Info]

## Contest Rules Reminder

1. **Fair Play**
   - Work only with your team members
   - Don't share solutions with other teams
   - Don't use external communication
   - Follow all contest regulations

2. **Technical Rules**
   - Use only provided computers/accounts
   - Don't access unauthorized websites
   - Don't modify system settings
   - Report any technical issues immediately

3. **Submission Rules**
   - Submit only your own code
   - Follow language restrictions
   - Meet time and memory limits
   - Submit before contest ends

## Quick Reference

### Important URLs
- Contest Homepage: `http://[server]/`
- Team Dashboard: `http://[server]/dashboard`
- Registration: `http://[server]/register`
- Leaderboard: `http://[server]/leaderboard`

### Keyboard Shortcuts
- `Ctrl+Enter`: Submit code (in editor)
- `F11`: Full-screen editor
- `Ctrl+S`: Save code locally (browser feature)
- `Escape`: Exit full-screen mode

### Emergency Actions
- If stuck: Refresh page
- If login fails: Clear cookies and try again
- If submission hangs: Wait 5 minutes, then contact organizers
- If site is down: Contact organizers immediately

---

**Good luck with your contest! Remember to stay calm, read problems carefully, and have fun!**