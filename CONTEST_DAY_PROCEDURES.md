# Contest Day Procedures

## Pre-Contest Checklist

### System Startup (30-60 minutes before contest)

1. **Server Health Check**
   ```bash
   # Check system resources
   htop
   df -h
   free -h
   
   # Verify Docker is running
   docker ps
   docker-compose ps
   ```

2. **Database Verification**
   ```bash
   # Test database connection
   NODE_ENV=production npm run db:status
   
   # Run any pending migrations
   NODE_ENV=production npm run db:migrate
   ```

3. **Judge System Validation**
   ```bash
   # Test code execution environment
   docker run --rm judge-environment echo "Judge system operational"
   
   # Verify queue system
   redis-cli ping
   ```

4. **Application Startup**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Verify all containers are running
   docker-compose ps
   
   # Check application logs
   docker-compose logs -f --tail=50
   ```

### Contest Creation Steps (15-30 minutes before contest)

1. **Login to Admin Panel**
   - Navigate to `/admin/login`
   - Use admin credentials
   - Verify admin dashboard loads correctly

2. **Create New Contest**
   - Click "Create Contest"
   - Fill in contest details:
     - Contest Name: e.g., "GVHS Hackathon 2024"
     - Description: Brief contest description
     - Start Time: Exact contest start time
     - Duration: Contest length in minutes (typically 180-240)
     - Freeze Time: Minutes before end to freeze leaderboard (typically 60)
   - Generate registration code (save this!)
   - Save contest

3. **Add Problems**
   - Navigate to contest problems section
   - For each problem:
     - Add problem letter (A, B, C, etc.)
     - Enter problem title and description
     - Set time and memory limits
     - Upload test cases (CSV format or individual)
     - Verify sample test cases are marked correctly
   - Test at least one problem with a sample submission

4. **Verify Contest Setup**
   - Check all problems are visible
   - Verify test cases are loaded
   - Test team registration with the registration code
   - Ensure leaderboard initializes correctly

### Team Registration Process (30 minutes before contest)

1. **Announce Registration**
   - Share registration code with teams
   - Provide registration URL: `http://[server-ip]/register`
   - Explain team name requirements (3-50 characters, unique)

2. **Monitor Registrations**
   - Watch admin dashboard for new registrations
   - Verify team names are appropriate
   - Handle duplicate registration issues
   - Assist teams with technical difficulties

3. **Pre-Contest Briefing**
   - Explain contest rules and format
   - Demonstrate problem submission process
   - Show leaderboard and ranking system
   - Answer questions about platform usage

## During Contest Procedures

### Monitoring Guidelines

1. **System Health Monitoring**
   - Check server resources every 30 minutes
   - Monitor judge queue status
   - Watch for error patterns in logs
   - Track submission processing times

2. **Judge System Monitoring**
   ```bash
   # Monitor judge queue
   docker-compose logs judge-worker -f
   
   # Check Redis queue status
   redis-cli llen bull:judge:waiting
   redis-cli llen bull:judge:active
   ```

3. **Database Performance**
   - Monitor connection count
   - Check for slow queries
   - Verify backup processes
   - Watch disk space usage

### Issue Resolution Steps

1. **Slow Judge Response**
   - Check judge queue length
   - Restart judge workers if needed:
     ```bash
     docker-compose restart judge-worker
     ```
   - Scale workers if necessary:
     ```bash
     docker-compose up -d --scale judge-worker=3
     ```

2. **Database Connection Issues**
   - Check database container status
   - Restart database if needed:
     ```bash
     docker-compose restart database
     ```
   - Verify connection pool settings

3. **Team Access Issues**
   - Verify team authentication tokens
   - Check for session timeouts
   - Assist with browser cache clearing
   - Provide alternative access methods

4. **Problem Submission Failures**
   - Check specific error messages
   - Verify code compilation locally if needed
   - Ensure test cases are correct
   - Check time/memory limits are reasonable

### Emergency Procedures

1. **Contest Extension**
   - Navigate to contest control panel
   - Update contest end time
   - Announce extension to all teams
   - Document reason for extension

2. **Problem Clarifications**
   - Post clarifications via admin announcement system
   - Ensure all teams receive notification
   - Update problem statement if necessary
   - Log all clarifications for record

3. **System Failure Recovery**
   - Stop current contest timer
   - Backup current database state
   - Identify and fix system issue
   - Resume contest with time adjustment
   - Verify all data integrity

### Communication Protocols

1. **Team Communication**
   - Use announcement system for all teams
   - Respond to clarifications promptly
   - Maintain neutral tone in all communications
   - Document all significant interactions

2. **Technical Support**
   - Designate technical support personnel
   - Establish escalation procedures
   - Maintain contact with system administrator
   - Have backup communication methods ready

## Post-Contest Procedures

### Result Generation

1. **Final Rankings**
   - Allow final submissions to complete judging
   - Verify leaderboard accuracy
   - Generate final standings report
   - Calculate awards and rankings

2. **Data Export**
   ```bash
   # Export final results
   NODE_ENV=production node scripts/export-results.js [contest-id]
   
   # Generate submission reports
   NODE_ENV=production node scripts/export-submissions.js [contest-id]
   ```

### Data Archival

1. **Database Backup**
   ```bash
   # Create contest-specific backup
   pg_dump contest_db > contest_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Log Archival**
   ```bash
   # Archive contest logs
   tar -czf contest_logs_$(date +%Y%m%d).tar.gz logs/
   ```

3. **Code Submission Archive**
   ```bash
   # Export all submission code
   NODE_ENV=production node scripts/archive-submissions.js [contest-id]
   ```

### System Cleanup

1. **Container Cleanup**
   ```bash
   # Remove unused containers
   docker system prune -f
   
   # Clean judge execution containers
   docker container prune -f
   ```

2. **Log Rotation**
   ```bash
   # Rotate application logs
   logrotate /etc/logrotate.d/contest-platform
   ```

### Feedback Collection

1. **Team Feedback**
   - Send feedback survey to participants
   - Collect improvement suggestions
   - Document technical issues encountered
   - Gather user experience feedback

2. **Performance Analysis**
   - Review system performance metrics
   - Analyze judge processing times
   - Identify bottlenecks
   - Document lessons learned

## Emergency Contacts

- **System Administrator**: [Contact Information]
- **Database Administrator**: [Contact Information]  
- **Network Support**: [Contact Information]
- **Contest Director**: [Contact Information]

## Quick Reference Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Scale judge workers
docker-compose up -d --scale judge-worker=[number]

# Database backup
pg_dump contest_db > backup.sql

# Check system status
docker-compose ps
```

## Important Notes

- Always test the complete system 24 hours before the actual contest
- Have backup plans for critical system failures
- Maintain clear communication with all participants
- Document all issues and resolutions for future reference
- Keep contest data secure and confidential
- Follow institution policies for data handling and privacy