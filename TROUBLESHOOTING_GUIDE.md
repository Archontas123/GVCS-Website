# Troubleshooting Guide

## Table of Contents
1. [Connection Problems](#connection-problems)
2. [Submission Failures](#submission-failures)
3. [Judge System Issues](#judge-system-issues)
4. [Performance Problems](#performance-problems)
5. [Authentication Issues](#authentication-issues)
6. [Database Problems](#database-problems)
7. [System Recovery](#system-recovery)
8. [Emergency Procedures](#emergency-procedures)

## Connection Problems

### Teams Cannot Access the Platform

**Symptoms:**
- Website not loading
- Connection timeout errors
- "This site can't be reached" messages
- Intermittent connectivity

**Diagnostic Steps:**
```bash
# Check server status
systemctl status nginx
docker-compose ps

# Check network connectivity
ping [server-ip]
netstat -tlnp | grep :80
netstat -tlnp | grep :3000

# Check firewall settings
iptables -L
ufw status
```

**Solutions:**
1. **Server Down**
   ```bash
   # Restart web server
   sudo systemctl restart nginx
   
   # Restart application
   docker-compose restart
   ```

2. **Network Issues**
   ```bash
   # Check network interface
   ip addr show
   
   # Restart network service
   sudo systemctl restart networking
   ```

3. **Firewall Blocking**
   ```bash
   # Allow HTTP traffic
   sudo ufw allow 80
   sudo ufw allow 3000
   
   # Check iptables rules
   sudo iptables -L
   ```

### Slow Page Loading

**Symptoms:**
- Pages take long time to load
- Timeouts during peak usage
- Unresponsive interface

**Diagnostic Steps:**
```bash
# Check server load
htop
uptime
iostat 1 5

# Check application logs
docker-compose logs nginx
docker-compose logs web

# Check network bandwidth
iftop
nethogs
```

**Solutions:**
1. **High Server Load**
   ```bash
   # Scale application instances
   docker-compose up -d --scale web=3
   
   # Optimize database queries
   # Check slow query log
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   
   # Restart services to free memory
   docker-compose restart
   ```

## Submission Failures

### Code Submissions Not Processing

**Symptoms:**
- Submissions stuck in "Pending" status
- "Submission failed" errors
- Code editor not responding

**Diagnostic Steps:**
```bash
# Check judge queue
redis-cli llen bull:judge:waiting
redis-cli llen bull:judge:active
redis-cli llen bull:judge:failed

# Check judge worker logs
docker-compose logs judge-worker

# Check submission table
psql -d contest_db -c "SELECT COUNT(*) FROM submissions WHERE status='pending';"
```

**Solutions:**
1. **Judge Queue Stuck**
   ```bash
   # Restart judge workers
   docker-compose restart judge-worker
   
   # Clear failed jobs
   redis-cli del bull:judge:failed
   
   # Scale workers
   docker-compose up -d --scale judge-worker=5
   ```

2. **Docker Issues**
   ```bash
   # Check Docker status
   docker ps
   docker system df
   
   # Clean up containers
   docker system prune -f
   
   # Restart Docker service
   sudo systemctl restart docker
   ```

### Compilation Errors Not Showing

**Symptoms:**
- CE verdict without error details
- Generic error messages
- Missing compiler output

**Diagnostic Steps:**
```bash
# Check compilation logs
docker-compose logs judge-worker | grep -i compile

# Test compilation manually
docker run --rm -v /tmp:/tmp judge-environment g++ -o /tmp/test /tmp/solution.cpp
```

**Solutions:**
1. **Compiler Output Capture**
   - Check judge service configuration
   - Verify error output handling
   - Test with known compilation errors

2. **Judge Container Issues**
   ```bash
   # Rebuild judge container
   docker-compose build judge-environment
   
   # Update compiler version
   # Check Dockerfile for compiler setup
   ```

### Wrong Answer with Correct Solutions

**Symptoms:**
- Known correct solutions getting WA
- Inconsistent judging results
- Output format issues

**Diagnostic Steps:**
```bash
# Check test cases
psql -d contest_db -c "SELECT input, expected_output FROM test_cases WHERE problem_id=[id];"

# Test solution manually
echo "sample_input" | docker run --rm -i judge-environment ./solution

# Compare outputs character by character
diff expected_output actual_output | hexdump -C
```

**Solutions:**
1. **Output Format Issues**
   - Check for trailing whitespace
   - Verify newline characters
   - Compare expected vs actual outputs exactly

2. **Test Case Problems**
   - Validate test case correctness
   - Check for special characters
   - Verify input/output encoding

## Judge System Issues

### Judge Queue Backup

**Symptoms:**
- Long waiting times for verdicts
- Queue length continuously increasing
- Workers not processing submissions

**Diagnostic Steps:**
```bash
# Monitor queue status
while true; do
  echo "Waiting: $(redis-cli llen bull:judge:waiting)"
  echo "Active: $(redis-cli llen bull:judge:active)"
  echo "Failed: $(redis-cli llen bull:judge:failed)"
  sleep 5
done

# Check worker processes
docker-compose ps judge-worker
docker-compose logs judge-worker --tail=50
```

**Solutions:**
1. **Scale Workers**
   ```bash
   # Increase worker count
   docker-compose up -d --scale judge-worker=10
   
   # Monitor resource usage
   docker stats
   ```

2. **Clear Stuck Jobs**
   ```bash
   # Clear all queues (emergency only)
   redis-cli flushdb
   
   # Restart judge system
   docker-compose restart judge-worker redis
   ```

### Memory/Time Limit Issues

**Symptoms:**
- All solutions getting TLE/MLE
- Inconsistent resource measurements
- Judge container crashes

**Diagnostic Steps:**
```bash
# Check container resource limits
docker inspect judge-container | grep -i memory
docker inspect judge-container | grep -i cpu

# Monitor resource usage during execution
docker stats judge-container
```

**Solutions:**
1. **Adjust Resource Limits**
   ```yaml
   # In docker-compose.yml
   judge-environment:
     deploy:
       resources:
         limits:
           memory: 512M
           cpus: '1.0'
   ```

2. **Fix Resource Monitoring**
   - Verify cgroup settings
   - Check seccomp profile
   - Update container configuration

## Performance Problems

### Database Slow Queries

**Symptoms:**
- Slow leaderboard updates
- Timeout errors
- High database CPU usage

**Diagnostic Steps:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('contest_db'));
```

**Solutions:**
1. **Optimize Queries**
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_submissions_team_problem 
   ON submissions(team_id, problem_id);
   
   -- Analyze tables
   ANALYZE submissions;
   ANALYZE contest_results;
   ```

2. **Connection Pool Tuning**
   ```javascript
   // In database configuration
   {
     pool: {
       min: 2,
       max: 20,
       acquireTimeoutMillis: 30000,
       idleTimeoutMillis: 600000
     }
   }
   ```

### High Memory Usage

**Symptoms:**
- Server running out of memory
- Application crashes
- Slow response times

**Diagnostic Steps:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -20

# Check container memory usage
docker stats

# Check for memory leaks
valgrind --leak-check=full [application]
```

**Solutions:**
1. **Optimize Application Memory**
   ```bash
   # Restart services to free memory
   docker-compose restart
   
   # Adjust Node.js memory limits
   NODE_OPTIONS="--max-old-space-size=2048" npm start
   ```

2. **Add Swap Space**
   ```bash
   # Create swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Authentication Issues

### Teams Cannot Login

**Symptoms:**
- "Invalid credentials" errors
- Session timeout issues
- Authentication tokens expired

**Diagnostic Steps:**
```bash
# Check authentication logs
docker-compose logs web | grep -i auth

# Verify team exists in database
psql -d contest_db -c "SELECT team_name FROM teams WHERE team_name='[team-name]';"

# Check JWT configuration
# Verify JWT_SECRET is set correctly
```

**Solutions:**
1. **Reset Team Credentials**
   ```sql
   -- Reset team session token
   UPDATE teams SET session_token = NULL WHERE team_name = '[team-name]';
   ```

2. **Fix JWT Issues**
   ```bash
   # Regenerate JWT secret
   export JWT_SECRET=$(openssl rand -base64 32)
   
   # Restart application with new secret
   docker-compose restart web
   ```

### Admin Cannot Access Dashboard

**Symptoms:**
- Admin login failures
- Permission denied errors
- Session expires immediately

**Diagnostic Steps:**
```bash
# Check admin table
psql -d contest_db -c "SELECT username, role FROM admins;"

# Check password hash
# Verify bcrypt configuration
```

**Solutions:**
1. **Reset Admin Password**
   ```javascript
   // Create new admin password
   const bcrypt = require('bcrypt');
   const hash = bcrypt.hashSync('new-password', 10);
   // Update in database
   ```

2. **Fix Admin Permissions**
   ```sql
   -- Update admin role
   UPDATE admins SET role = 'super_admin' WHERE username = '[admin-username]';
   ```

## Database Problems

### Database Connection Failures

**Symptoms:**
- "Connection refused" errors
- Database not responding
- Connection timeout errors

**Diagnostic Steps:**
```bash
# Check database container
docker-compose ps database
docker-compose logs database

# Test connection manually
psql -h localhost -U postgres -d contest_db

# Check database processes
ps aux | grep postgres
```

**Solutions:**
1. **Restart Database**
   ```bash
   # Restart database container
   docker-compose restart database
   
   # Check database startup logs
   docker-compose logs database -f
   ```

2. **Fix Configuration**
   ```bash
   # Check PostgreSQL configuration
   # Verify connection limits
   # Check listen_addresses setting
   ```

### Data Corruption Issues

**Symptoms:**
- Inconsistent leaderboard data
- Missing submissions
- Corrupted scores

**Diagnostic Steps:**
```sql
-- Check data consistency
SELECT COUNT(*) FROM submissions WHERE status = 'accepted' 
AND id NOT IN (SELECT submission_id FROM contest_results);

-- Verify score calculations
SELECT team_id, COUNT(*) as problems_solved, 
       SUM(penalty_time) as total_penalty
FROM contest_results 
GROUP BY team_id;
```

**Solutions:**
1. **Recalculate Scores**
   ```bash
   # Run score recalculation script
   NODE_ENV=production node scripts/recalculate-scores.js [contest-id]
   ```

2. **Restore from Backup**
   ```bash
   # Restore database from backup
   docker-compose stop database
   docker-compose run database psql -U postgres < backup.sql
   docker-compose start database
   ```

## System Recovery

### Complete System Failure

**Emergency Response:**
1. **Immediate Actions**
   ```bash
   # Stop all services
   docker-compose down
   
   # Create emergency backup
   cp -r /var/lib/docker/volumes /backup/emergency-$(date +%Y%m%d_%H%M%S)
   
   # Check system status
   systemctl status docker
   systemctl status postgresql
   ```

2. **System Recovery**
   ```bash
   # Start core services first
   docker-compose up -d database redis
   
   # Wait for database to be ready
   sleep 30
   
   # Start application services
   docker-compose up -d web judge-worker
   
   # Verify all services are running
   docker-compose ps
   ```

### Contest Data Recovery

**Recovery Procedures:**
1. **From Database Backup**
   ```bash
   # Restore database
   docker-compose stop
   docker volume rm contest_db_data
   docker-compose up -d database
   cat backup.sql | docker-compose exec -T database psql -U postgres
   ```

2. **Partial Data Recovery**
   ```sql
   -- Recover submissions from logs
   INSERT INTO submissions (team_id, problem_id, code, language, submission_time)
   SELECT ...;
   
   -- Recalculate results
   DELETE FROM contest_results WHERE contest_id = [id];
   -- Run recalculation script
   ```

## Emergency Procedures

### Contest Extension Protocol

**When to Extend:**
- System downtime > 10 minutes
- Major judging issues
- Network connectivity problems
- Security incidents

**Extension Process:**
1. **Immediate Actions**
   ```sql
   -- Stop contest timer
   UPDATE contests SET status = 'paused' WHERE id = [contest-id];
   ```

2. **Calculate Extension**
   ```bash
   # Calculate downtime
   DOWNTIME_MINUTES=[calculated_downtime]
   
   # Update contest end time
   NEW_END_TIME=$(date -d "+${DOWNTIME_MINUTES} minutes" '+%Y-%m-%d %H:%M:%S')
   ```

3. **Communicate to Teams**
   - Send immediate announcement
   - Explain reason for extension
   - Provide new end time
   - Update contest timer display

### Data Integrity Emergency

**Rapid Response:**
1. **Immediate Isolation**
   ```bash
   # Stop all write operations
   docker-compose stop web judge-worker
   
   # Create immediate backup
   pg_dump contest_db > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Assessment**
   ```sql
   -- Check critical tables
   SELECT COUNT(*) FROM teams;
   SELECT COUNT(*) FROM submissions;
   SELECT COUNT(*) FROM contest_results;
   
   -- Verify data consistency
   ```

3. **Recovery Plan**
   - Identify corruption scope
   - Plan recovery strategy
   - Communicate with stakeholders
   - Execute recovery procedure

### Contact Information

**Emergency Contacts:**
- **System Administrator**: [Phone/Email]
- **Database Administrator**: [Phone/Email]
- **Network Support**: [Phone/Email]
- **Contest Director**: [Phone/Email]

**Escalation Path:**
1. Technical support team member
2. System administrator
3. Contest director
4. Institution IT department

**24/7 Support:**
- Emergency hotline: [Phone Number]
- Emergency email: [Email Address]
- Backup communication: [Method]

---

## Quick Reference Commands

```bash
# Service Management
docker-compose ps                    # Check service status
docker-compose logs [service]        # View service logs
docker-compose restart [service]     # Restart specific service
docker-compose up -d --scale web=3   # Scale service

# Database Commands
psql -d contest_db -c "SELECT ..."   # Run SQL query
pg_dump contest_db > backup.sql      # Create backup
docker-compose exec database psql -U postgres  # Connect to DB

# System Monitoring
htop                                 # System resources
docker stats                        # Container resources
redis-cli monitor                    # Redis operations
tail -f /var/log/nginx/error.log     # Web server errors

# Emergency Recovery
docker-compose down                  # Stop all services
docker system prune -f              # Clean Docker resources
systemctl restart docker            # Restart Docker daemon
```

Remember: **Always create backups before making changes during emergencies!**