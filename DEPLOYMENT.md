# CS Club Hackathon Platform - Production Deployment Guide

## Phase 6.2: Production-Ready Deployment

This guide covers the complete production deployment of the CS Club Hackathon Platform with Docker containerization, CI/CD pipelines, monitoring, and database optimization.

## 🎯 Overview

The production deployment includes:

- **Containerized Services**: Docker containers for all components
- **Orchestration**: Docker Compose for service management
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Monitoring Stack**: Prometheus, Grafana, and Loki for observability
- **Database Management**: PostgreSQL with backup and optimization tools
- **Load Balancing**: Nginx reverse proxy with SSL termination
- **Environment Management**: Configuration management for different environments

## 📋 Prerequisites

### System Requirements

**Minimum Production Requirements:**
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 100 Mbps internet connection

**Software Dependencies:**
- Docker 24.0+
- Docker Compose 2.0+
- Git 2.30+
- SSL certificates for HTTPS

### Domain and DNS Setup

1. **Domain Registration**: Register your domain (e.g., `hackathon-platform.com`)
2. **DNS Configuration**: Point A records to your server IP
3. **SSL Certificates**: Obtain SSL certificates (Let's Encrypt recommended)

## 🚀 Quick Deployment

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-org/hackathon-platform.git
cd hackathon-platform

# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Configure Environment

**Critical Environment Variables:**

```bash
# Security (CHANGE THESE!)
JWT_SECRET="$(openssl rand -hex 64)"
ADMIN_PASSWORD="your-secure-admin-password"
POSTGRES_PASSWORD="your-secure-db-password"
GRAFANA_PASSWORD="your-grafana-password"

# Domain Configuration
DOMAIN="your-domain.com"
REACT_APP_API_URL="https://your-domain.com/api"
REACT_APP_WS_URL="wss://your-domain.com"

# Database Settings
DB_TYPE=postgres
POSTGRES_DB=hackathon_db
POSTGRES_USER=hackathon_user

# Enable Production Features
NODE_ENV=production
ENABLE_HTTPS=true
ENABLE_BACKUPS=true
ENABLE_METRICS=true
```

### 4. Deploy Services

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run full deployment
./scripts/deploy.sh deploy
```

## 🔧 Manual Deployment Steps

### 1. Build Docker Images

```bash
# Build backend image
docker build -f Dockerfile.backend -t hackathon-backend:latest .

# Build frontend image
docker build -f Dockerfile.frontend -t hackathon-frontend:latest .

# Build judge image
docker build -f docker/Dockerfile -t hackathon-judge:latest ./docker/
```

### 2. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Initialize Database

```bash
# Run database migrations
docker exec hackathon_backend npm run db:migrate

# Seed initial data (optional)
docker exec hackathon_backend npm run db:seed
```

### 4. Configure SSL

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy SSL certificates
sudo cp your-ssl-cert.pem /etc/nginx/ssl/cert.pem
sudo cp your-ssl-key.key /etc/nginx/ssl/private.key

# Set proper permissions
sudo chmod 600 /etc/nginx/ssl/private.key
sudo chmod 644 /etc/nginx/ssl/cert.pem
```

## 📊 Monitoring Setup

### Access Monitoring Services

- **Application**: `https://your-domain.com`
- **Grafana Dashboard**: `https://your-domain.com:3001`
- **Prometheus Metrics**: `https://your-domain.com:9090`

### Default Login Credentials

**Grafana:**
- Username: `admin`
- Password: `${GRAFANA_PASSWORD}` (from .env)

### Configure Alerting

1. **Slack Integration**:
   ```bash
   # Set Slack webhook URL in environment
   echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/..." >> .env
   ```

2. **Email Notifications**:
   ```bash
   # Configure SMTP settings
   echo "ENABLE_EMAIL=true" >> .env
   echo "SMTP_HOST=smtp.gmail.com" >> .env
   echo "SMTP_USER=your-email@domain.com" >> .env
   ```

## 🗄️ Database Management

### Backup Operations

```bash
# Create backup
./scripts/backup.sh

# Create specific backup type
./scripts/backup.sh database  # Database only
./scripts/backup.sh redis     # Redis only  
./scripts/backup.sh files     # Files only

# List available backups
./scripts/restore.sh --list
```

### Restore Operations

```bash
# Restore from backup
./scripts/restore.sh --type database backup_file.sql.gz

# Dry run (see what would be restored)
./scripts/restore.sh --dry-run backup_file.sql.gz

# Force restore without confirmation
./scripts/restore.sh --force --type full backup_file.tar.gz
```

### Database Optimization

```bash
# Check database health
./scripts/db-optimize.sh health

# Analyze performance
./scripts/db-optimize.sh analyze

# Run optimization
./scripts/db-optimize.sh optimize

# Vacuum and analyze tables
./scripts/db-optimize.sh vacuum
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Required Secrets**:
   ```
   PRODUCTION_SSH_KEY          # SSH private key for server access
   PRODUCTION_USER             # Server username
   PRODUCTION_HOST             # Server hostname/IP
   PRODUCTION_ENV              # Production environment variables
   STAGING_SSH_KEY             # Staging server SSH key
   STAGING_USER                # Staging server username
   STAGING_HOST                # Staging server hostname/IP
   STAGING_ENV                 # Staging environment variables
   SLACK_WEBHOOK               # Slack notification webhook
   GRAFANA_PASSWORD            # Grafana admin password
   ```

2. **Pipeline Triggers**:
   - **Push to `main`**: Deploy to production
   - **Push to `develop`**: Deploy to staging
   - **Pull Requests**: Run tests only
   - **Releases**: Create tagged deployment

### Manual Deployment

```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main

# Create release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## 🔒 Security Considerations

### SSL/TLS Configuration

1. **Let's Encrypt Setup**:
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get certificate
   sudo certbot --nginx -d your-domain.com
   
   # Auto-renewal
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

2. **Manual SSL Setup**:
   - Place certificates in `nginx/ssl/`
   - Update `nginx/conf.d/default.conf`
   - Set `ENABLE_HTTPS=true` in environment

### Security Headers

The Nginx configuration includes:
- HSTS headers
- XSS protection
- Content type sniffing protection
- Frame options
- CSP headers

### Database Security

```bash
# Change default passwords
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export REDIS_PASSWORD="$(openssl rand -base64 32)"

# Enable SSL for PostgreSQL
echo "POSTGRES_SSL=require" >> .env
```

## 🎛️ Configuration Management

### Environment-Specific Configs

- **Development**: `config/development.env`
- **Production**: `config/production.env`
- **Testing**: Configured in CI/CD pipeline

### Feature Flags

```bash
# Enable/disable features without code changes
ENABLE_REAL_TIME_UPDATES=true
ENABLE_LEADERBOARD_FREEZE=true
ENABLE_BALLOON_NOTIFICATIONS=true
ENABLE_TEAM_REGISTRATION=true
```

### Resource Limits

```bash
# Contest settings
CONTEST_DURATION=240          # minutes
MAX_TEAMS=100                # concurrent teams
MAX_SUBMISSIONS_PER_MINUTE=15

# Code execution limits
EXECUTION_TIMEOUT=10         # seconds
MEMORY_LIMIT=256            # MB
CPU_LIMIT=1.0               # CPU cores
```

## 📈 Performance Tuning

### Database Optimization

```bash
# Optimize PostgreSQL settings
cat >> postgresql.conf << EOF
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
work_mem = 4MB
EOF
```

### Application Optimization

```bash
# Node.js optimization
export NODE_OPTIONS="--max-old-space-size=2048"
export UV_THREADPOOL_SIZE=4

# Redis optimization
echo "maxmemory 256mb" >> redis.conf
echo "maxmemory-policy allkeys-lru" >> redis.conf
```

### Container Resource Limits

```yaml
# docker-compose.production.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2'
        reservations:
          memory: 512M
          cpus: '1'
```

## 🔍 Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs service_name

# Check resource usage
docker stats

# Restart service
docker-compose -f docker-compose.production.yml restart service_name
```

**Database Connection Issues:**
```bash
# Test connection
docker exec hackathon_backend npm run db:test

# Check PostgreSQL logs
docker logs hackathon_postgres

# Reset database
./scripts/restore.sh --type database latest_backup.sql.gz
```

**High Memory Usage:**
```bash
# Check container memory
docker stats --no-stream

# Optimize database
./scripts/db-optimize.sh vacuum

# Restart services
docker-compose -f docker-compose.production.yml restart
```

### Performance Issues

**Slow Response Times:**
```bash
# Check database performance
./scripts/db-optimize.sh analyze

# Monitor in real-time
docker exec hackathon_backend npm run test:performance

# Check system resources
htop
iotop
```

**High Load:**
```bash
# Scale services
docker-compose -f docker-compose.production.yml up -d --scale backend=2

# Check bottlenecks
./scripts/db-optimize.sh slow-queries

# Review Grafana dashboards
```

## 📚 Maintenance

### Daily Tasks
- [ ] Check service health via monitoring dashboard
- [ ] Review error logs
- [ ] Monitor disk space and performance
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Run database optimization
- [ ] Review and rotate logs
- [ ] Update system packages
- [ ] Check SSL certificate expiration

### Monthly Tasks
- [ ] Full system backup
- [ ] Security updates
- [ ] Performance review
- [ ] Capacity planning review

### Scheduled Maintenance

```bash
# Add to crontab
# Daily backups at 2 AM
0 2 * * * /opt/hackathon-platform/scripts/backup.sh

# Weekly optimization on Sunday at 3 AM
0 3 * * 0 /opt/hackathon-platform/scripts/db-optimize.sh optimize

# Monthly cleanup first day at 1 AM
0 1 1 * * /opt/hackathon-platform/scripts/cleanup.sh
```

## 🆘 Support

### Getting Help

1. **Documentation**: Check this deployment guide
2. **Logs**: Review application and system logs
3. **Monitoring**: Use Grafana dashboards for insights
4. **Health Checks**: Run built-in diagnostic tools

### Emergency Procedures

**Service Outage:**
1. Check service status: `docker-compose ps`
2. Restart services: `docker-compose restart`
3. Check resource usage: `docker stats`
4. Review recent logs: `docker-compose logs --tail=100`

**Database Issues:**
1. Run health check: `./scripts/db-optimize.sh health`
2. Check for locks: `./scripts/db-optimize.sh analyze`
3. Restore from backup if needed: `./scripts/restore.sh`

**Performance Degradation:**
1. Check system resources: `htop`, `df -h`
2. Review monitoring dashboards
3. Run performance analysis: `./scripts/db-optimize.sh analyze`
4. Scale services if needed

### Contact Information

- **System Administrator**: admin@your-domain.com
- **On-Call Support**: +1-XXX-XXX-XXXX
- **Status Page**: https://status.your-domain.com

---

**CS Club Hackathon Platform - Production Deployment Guide v6.2**  
*Complete production-ready deployment with monitoring, security, and optimization*