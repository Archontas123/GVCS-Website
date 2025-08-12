# System Administration Manual

## Table of Contents
1. [Installation Procedures](#installation-procedures)
2. [Configuration Options](#configuration-options)
3. [Backup and Recovery](#backup-and-recovery)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Security Configuration](#security-configuration)
6. [Performance Tuning](#performance-tuning)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)

## Installation Procedures

### System Requirements

**Minimum Requirements:**
- OS: Ubuntu 20.04 LTS or newer, CentOS 8+, or compatible Linux distribution
- CPU: 4 cores, 2.5 GHz
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 1 Gbps connection

**Recommended for 100+ teams:**
- CPU: 8 cores, 3.0 GHz
- RAM: 16 GB
- Storage: 200 GB SSD
- Network: 1 Gbps connection with low latency

### Pre-Installation Setup

1. **System Update**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install curl wget git vim htop -y
   ```

2. **Create Application User**
   ```bash
   sudo adduser contest-admin
   sudo usermod -aG sudo contest-admin
   sudo usermod -aG docker contest-admin
   ```

3. **Configure Firewall**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3000/tcp  # Application port
   ```

### Docker Installation

1. **Install Docker**
   ```bash
   # Remove old versions
   sudo apt remove docker docker-engine docker.io containerd runc
   
   # Install Docker CE
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Install Docker Compose**
   ```bash
   # Install Docker Compose v2
   sudo apt install docker-compose-plugin
   
   # Verify installation
   docker compose version
   ```

3. **Configure Docker**
   ```bash
   # Create daemon configuration
   sudo tee /etc/docker/daemon.json <<EOF
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     },
     "storage-driver": "overlay2"
   }
   EOF
   
   sudo systemctl restart docker
   ```

### Database Setup

1. **PostgreSQL Installation**
   ```bash
   # Install PostgreSQL 14
   sudo apt install postgresql-14 postgresql-client-14 -y
   
   # Start and enable service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Database Configuration**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE contest_db;
   CREATE USER contest_user WITH PASSWORD 'secure_password_here';
   GRANT ALL PRIVILEGES ON DATABASE contest_db TO contest_user;
   \q
   ```

3. **Connection Configuration**
   ```bash
   # Edit postgresql.conf
   sudo vim /etc/postgresql/14/main/postgresql.conf
   
   # Set connection parameters
   listen_addresses = 'localhost'
   max_connections = 200
   shared_buffers = 256MB
   effective_cache_size = 1GB
   ```

### Application Installation

1. **Clone Repository**
   ```bash
   cd /opt
   sudo git clone https://github.com/your-org/contest-platform.git
   sudo chown -R contest-admin:contest-admin contest-platform
   cd contest-platform
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp config/production.env.example config/production.env
   
   # Edit configuration
   vim config/production.env
   ```

3. **Build and Start Services**
   ```bash
   # Build Docker images
   docker compose build
   
   # Start services
   docker compose up -d
   
   # Check status
   docker compose ps
   ```

4. **Initialize Database**
   ```bash
   # Run migrations
   NODE_ENV=production npm run db:migrate
   
   # Seed initial data
   NODE_ENV=production npm run db:seed
   ```

### SSL/TLS Setup

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL Certificate**
   ```bash
   # Replace with your domain
   sudo certbot --nginx -d contest.yourdomain.com
   ```

3. **Configure Auto-renewal**
   ```bash
   # Test renewal
   sudo certbot renew --dry-run
   
   # Add to crontab
   sudo crontab -e
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Configuration Options

### Environment Variables

**Core Configuration:**
```bash
# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=contest_db
DB_USER=contest_user
DB_PASSWORD=your_db_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Judge System
JUDGE_WORKERS=4
JUDGE_TIMEOUT=30000
JUDGE_MEMORY_LIMIT=256
```

**Security Configuration:**
```bash
# CORS settings
CORS_ORIGIN=https://contest.yourdomain.com
ALLOWED_HOSTS=contest.yourdomain.com,localhost

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Session settings
SESSION_TIMEOUT=7200
ADMIN_SESSION_TIMEOUT=14400
```

### Docker Compose Configuration

**Production docker-compose.yml:**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - database
      - redis

  judge-worker:
    build: 
      context: .
      dockerfile: Dockerfile.judge
    environment:
      - NODE_ENV=production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
    deploy:
      replicas: 4

  database:
    image: postgres:14
    environment:
      POSTGRES_DB: contest_db
      POSTGRES_USER: contest_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server web:3000;
    }

    server {
        listen 80;
        server_name contest.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name contest.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/contest.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/contest.yourdomain.com/privkey.pem;

        client_max_body_size 10M;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io/ {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
```

## Backup and Recovery

### Automated Backup System

1. **Database Backup Script**
   ```bash
   #!/bin/bash
   # /opt/contest-platform/scripts/backup.sh
   
   BACKUP_DIR="/opt/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Create backup directory
   mkdir -p $BACKUP_DIR
   
   # Database backup
   docker compose exec -T database pg_dump -U contest_user contest_db > $BACKUP_DIR/db_backup_$DATE.sql
   
   # Application files backup
   tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/contest-platform --exclude=/opt/contest-platform/node_modules
   
   # Docker volumes backup
   docker run --rm -v contest_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_volume_$DATE.tar.gz -C /data .
   
   # Cleanup old backups (keep 7 days)
   find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
   find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
   
   echo "Backup completed: $DATE"
   ```

2. **Schedule Backups**
   ```bash
   # Add to crontab
   sudo crontab -e
   
   # Daily backup at 2 AM
   0 2 * * * /opt/contest-platform/scripts/backup.sh >> /var/log/backup.log 2>&1
   
   # Weekly full system backup
   0 3 * * 0 /opt/contest-platform/scripts/full-backup.sh >> /var/log/backup.log 2>&1
   ```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Stop application
   docker compose stop web judge-worker
   
   # Restore database
   docker compose exec -T database psql -U contest_user -d contest_db < backup.sql
   
   # Restart application
   docker compose start web judge-worker
   ```

2. **Full System Recovery**
   ```bash
   # Stop all services
   docker compose down
   
   # Restore application files
   cd /opt
   sudo tar -xzf app_backup_YYYYMMDD_HHMMSS.tar.gz
   
   # Restore Docker volumes
   docker run --rm -v contest_postgres_data:/data -v /opt/backups:/backup alpine tar xzf /backup/postgres_volume_YYYYMMDD_HHMMSS.tar.gz -C /data
   
   # Start services
   cd contest-platform
   docker compose up -d
   ```

3. **Point-in-Time Recovery**
   ```bash
   # Enable PostgreSQL WAL archiving
   sudo vim /etc/postgresql/14/main/postgresql.conf
   
   # Add configuration
   wal_level = replica
   archive_mode = on
   archive_command = 'cp %p /opt/pg_wal_archive/%f'
   ```

## Maintenance Tasks

### Daily Maintenance

1. **System Health Check**
   ```bash
   #!/bin/bash
   # /opt/contest-platform/scripts/health-check.sh
   
   # Check disk space
   df -h | grep -E "(/$|/opt)" | awk '$5 > 85 {print "WARNING: Disk space low on " $6}'
   
   # Check memory usage
   free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'
   
   # Check Docker containers
   docker compose ps | grep -v "Up" && echo "WARNING: Some containers are not running"
   
   # Check database connections
   docker compose exec database psql -U contest_user -d contest_db -c "SELECT count(*) FROM pg_stat_activity;" | tail -n +3 | head -n 1
   
   # Check judge queue
   docker compose exec redis redis-cli llen bull:judge:waiting
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo tee /etc/logrotate.d/contest-platform <<EOF
   /opt/contest-platform/logs/*.log {
       daily
       rotate 7
       compress
       delaycompress
       missingok
       notifempty
       create 644 contest-admin contest-admin
   }
   EOF
   ```

### Weekly Maintenance

1. **Database Maintenance**
   ```bash
   #!/bin/bash
   # /opt/contest-platform/scripts/db-maintenance.sh
   
   # Update statistics
   docker compose exec database psql -U contest_user -d contest_db -c "ANALYZE;"
   
   # Vacuum database
   docker compose exec database psql -U contest_user -d contest_db -c "VACUUM;"
   
   # Check for unused indexes
   docker compose exec database psql -U contest_user -d contest_db -c "
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE n_distinct = 1;"
   ```

2. **System Cleanup**
   ```bash
   # Clean Docker resources
   docker system prune -f
   docker volume prune -f
   
   # Clean temporary files
   sudo find /tmp -type f -atime +7 -delete
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   ```

### Monthly Maintenance

1. **Security Updates**
   ```bash
   # Update base Docker images
   docker compose pull
   docker compose build --no-cache
   docker compose up -d
   
   # Update SSL certificates
   sudo certbot renew
   
   # Review security logs
   sudo grep -i "failed\|error\|unauthorized" /var/log/auth.log | tail -50
   ```

2. **Performance Review**
   ```bash
   # Analyze slow queries
   docker compose exec database psql -U contest_user -d contest_db -c "
   SELECT query, mean_time, calls, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;"
   
   # Check index usage
   docker compose exec database psql -U contest_user -d contest_db -c "
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;"
   ```

## Security Configuration

### System Hardening

1. **SSH Configuration**
   ```bash
   sudo vim /etc/ssh/sshd_config
   
   # Recommended settings
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   Port 2222  # Non-standard port
   AllowUsers contest-admin
   ```

2. **Firewall Rules**
   ```bash
   # Reset firewall
   sudo ufw --force reset
   
   # Default policies
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   
   # Allow specific services
   sudo ufw allow 2222/tcp   # SSH
   sudo ufw allow 80/tcp     # HTTP
   sudo ufw allow 443/tcp    # HTTPS
   
   # Enable firewall
   sudo ufw enable
   ```

3. **Fail2Ban Setup**
   ```bash
   # Install Fail2Ban
   sudo apt install fail2ban -y
   
   # Configure jail
   sudo tee /etc/fail2ban/jail.local <<EOF
   [DEFAULT]
   bantime = 3600
   findtime = 600
   maxretry = 3
   
   [sshd]
   enabled = true
   port = 2222
   
   [nginx-http-auth]
   enabled = true
   EOF
   
   sudo systemctl restart fail2ban
   ```

### Application Security

1. **Container Security**
   ```dockerfile
   # In Dockerfile
   FROM node:18-alpine
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   
   # Set user
   USER nextjs
   
   # Remove unnecessary packages
   RUN apk del .build-deps
   ```

2. **Database Security**
   ```bash
   # Restrict database access
   sudo vim /etc/postgresql/14/main/pg_hba.conf
   
   # Only allow local connections
   local   contest_db    contest_user                     md5
   host    contest_db    contest_user    127.0.0.1/32     md5
   ```

3. **Environment Security**
   ```bash
   # Secure environment files
   chmod 600 config/production.env
   chown contest-admin:contest-admin config/production.env
   
   # Use Docker secrets for sensitive data
   echo "your_secret" | docker secret create jwt_secret -
   ```

## Performance Tuning

### Database Optimization

1. **PostgreSQL Configuration**
   ```bash
   sudo vim /etc/postgresql/14/main/postgresql.conf
   
   # Memory settings
   shared_buffers = 256MB
   effective_cache_size = 1GB
   work_mem = 4MB
   maintenance_work_mem = 64MB
   
   # Connection settings
   max_connections = 200
   
   # Checkpoint settings
   checkpoint_timeout = 15min
   checkpoint_completion_target = 0.9
   ```

2. **Index Optimization**
   ```sql
   -- Key indexes for performance
   CREATE INDEX CONCURRENTLY idx_submissions_team_problem ON submissions(team_id, problem_id);
   CREATE INDEX CONCURRENTLY idx_submissions_time ON submissions(submission_time);
   CREATE INDEX CONCURRENTLY idx_contest_results_ranking ON contest_results(contest_id, rank);
   CREATE INDEX CONCURRENTLY idx_teams_contest ON teams(contest_code);
   ```

### Application Optimization

1. **Node.js Tuning**
   ```bash
   # Environment variables
   export NODE_OPTIONS="--max-old-space-size=4096"
   export UV_THREADPOOL_SIZE=128
   
   # PM2 cluster mode
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

2. **Redis Optimization**
   ```bash
   # Redis configuration
   sudo tee /etc/redis/redis.conf <<EOF
   maxmemory 512mb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   EOF
   ```

### System Optimization

1. **Kernel Parameters**
   ```bash
   sudo tee -a /etc/sysctl.conf <<EOF
   # Network optimization
   net.core.somaxconn = 65535
   net.core.netdev_max_backlog = 5000
   net.ipv4.tcp_max_syn_backlog = 65535
   
   # Memory optimization
   vm.swappiness = 10
   vm.dirty_ratio = 15
   vm.dirty_background_ratio = 5
   EOF
   
   sudo sysctl -p
   ```

2. **File System Optimization**
   ```bash
   # Add to /etc/fstab for data directories
   /dev/sdb1 /opt/contest-platform/data ext4 defaults,noatime,nodiratime 0 2
   ```

## Monitoring and Logging

### System Monitoring

1. **Install Monitoring Tools**
   ```bash
   # Install Prometheus and Grafana
   docker run -d -p 9090:9090 --name prometheus prom/prometheus
   docker run -d -p 3001:3000 --name grafana grafana/grafana
   ```

2. **Application Metrics**
   ```javascript
   // Add to application
   const prometheus = require('prom-client');
   
   // Create metrics
   const httpRequests = new prometheus.Counter({
     name: 'http_requests_total',
     help: 'Total HTTP requests',
     labelNames: ['method', 'route', 'status']
   });
   
   const submissionProcessingTime = new prometheus.Histogram({
     name: 'submission_processing_duration_seconds',
     help: 'Time spent processing submissions'
   });
   ```

### Log Management

1. **Centralized Logging**
   ```yaml
   # Add to docker-compose.yml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

2. **Log Analysis**
   ```bash
   # Install ELK stack
   docker run -d -p 9200:9200 -p 9300:9300 elasticsearch:7.15.0
   docker run -d -p 5601:5601 kibana:7.15.0
   docker run -d -p 5044:5044 logstash:7.15.0
   ```

### Alerting

1. **Email Alerts**
   ```bash
   # Configure postfix for email notifications
   sudo apt install postfix mailutils -y
   
   # Create alert script
   cat > /opt/contest-platform/scripts/alert.sh <<EOF
   #!/bin/bash
   SUBJECT="Contest Platform Alert"
   TO="admin@yourdomain.com"
   MESSAGE="$1"
   
   echo "$MESSAGE" | mail -s "$SUBJECT" "$TO"
   EOF
   ```

2. **Monitoring Script**
   ```bash
   #!/bin/bash
   # /opt/contest-platform/scripts/monitor.sh
   
   # Check if services are running
   if ! docker compose ps | grep -q "Up"; then
       /opt/contest-platform/scripts/alert.sh "Container services are down"
   fi
   
   # Check disk space
   DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
   if [ $DISK_USAGE -gt 90 ]; then
       /opt/contest-platform/scripts/alert.sh "Disk usage is at ${DISK_USAGE}%"
   fi
   
   # Check memory usage
   MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
   if [ $MEM_USAGE -gt 90 ]; then
       /opt/contest-platform/scripts/alert.sh "Memory usage is at ${MEM_USAGE}%"
   fi
   ```

## Migration and Updates

### Application Updates

1. **Update Procedure**
   ```bash
   # Create backup
   /opt/contest-platform/scripts/backup.sh
   
   # Pull latest code
   git fetch origin
   git checkout main
   git pull origin main
   
   # Update dependencies
   npm install
   
   # Run migrations
   NODE_ENV=production npm run db:migrate
   
   # Rebuild containers
   docker compose build
   docker compose up -d
   ```

2. **Rollback Procedure**
   ```bash
   # Identify last known good version
   git log --oneline -10
   
   # Rollback code
   git checkout [commit-hash]
   
   # Rollback database if needed
   NODE_ENV=production npm run db:rollback
   
   # Rebuild and restart
   docker compose build
   docker compose up -d
   ```

### Database Migrations

1. **Migration Strategy**
   ```bash
   # Test migrations on staging
   NODE_ENV=staging npm run db:migrate
   
   # Backup production before migration
   pg_dump contest_db > pre_migration_backup.sql
   
   # Run production migration
   NODE_ENV=production npm run db:migrate
   
   # Verify migration success
   NODE_ENV=production npm run db:validate
   ```

---

This manual provides comprehensive guidance for system administrators managing the contest platform. Regular maintenance and monitoring are essential for optimal performance and reliability.