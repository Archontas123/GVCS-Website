# CS Club Hackathon Platform - Production Deployment Guide

This guide will help you deploy the CS Club Hackathon Platform to a VPS (Virtual Private Server) using Docker.

## Prerequisites

- A VPS with Ubuntu 20.04 or newer
- Root or sudo access to the VPS
- A domain name pointed to your VPS IP address
- GitHub repository set up with your code

## Quick Start

### 1. Initial VPS Setup

SSH into your VPS and run the initial setup script:

```bash
wget https://raw.githubusercontent.com/YOUR_USERNAME/CSCLUBWebsite/master/scripts/vps-setup.sh
sudo bash vps-setup.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Setup fail2ban for security
- Create swap space
- Create a deployment user
- Install certbot for SSL certificates

### 2. Clone Repository

```bash
sudo su
cd /opt
git clone https://github.com/YOUR_USERNAME/CSCLUBWebsite.git cs-club-hackathon
cd cs-club-hackathon
```

### 3. Configure Environment Variables

Copy the example environment file and edit it with your production values:

```bash
cp .env.example .env
nano .env
```

**Important values to change:**

```env
# Security - Generate strong secrets!
JWT_SECRET=<generate with: openssl rand -hex 64>
SESSION_SECRET=<generate with: openssl rand -hex 32>
ADMIN_PASSWORD=<strong-admin-password>
POSTGRES_PASSWORD=<strong-database-password>
REDIS_PASSWORD=<strong-redis-password>

# Domain configuration
DOMAIN=yourdomain.com
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_WS_URL=wss://yourdomain.com

# Production settings
NODE_ENV=production
LOG_LEVEL=info
```

### 4. Setup SSL Certificates

Run the SSL setup script to obtain Let's Encrypt certificates:

```bash
bash scripts/setup-ssl.sh
```

Follow the prompts to enter your domain name and email address.

**Alternative: Generate self-signed certificates for testing:**

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### 5. Deploy the Application

Run the deployment script:

```bash
bash deploy.sh
```

This script will:
- Pull the latest code from GitHub
- Create a database backup (if exists)
- Build Docker images
- Start all containers
- Run database migrations
- Perform health checks

### 6. Verify Deployment

Check that all services are running:

```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see all services as "Up" and "healthy":
- cs_club_postgres
- cs_club_redis
- cs_club_backend
- cs_club_frontend

Visit your domain:
- **Frontend:** https://yourdomain.com
- **Backend API:** https://yourdomain.com/api/health

## GitHub Actions CI/CD Setup

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

- `VPS_HOST`: Your VPS IP address or hostname
- `VPS_USERNAME`: SSH username (e.g., "root" or "deploy")
- `VPS_SSH_KEY`: Your private SSH key for VPS access
- `VPS_PORT`: SSH port (default: 22)

### 2. Generate SSH Key Pair (if needed)

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

Copy the public key to your VPS:

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub root@your-vps-ip
```

Copy the private key content to GitHub secrets:

```bash
cat ~/.ssh/github_actions
```

### 3. Automatic Deployment

Once configured, every push to the `master` branch will:
1. Run tests
2. Build Docker images
3. Automatically deploy to your VPS

## Manual Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services

```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Application

```bash
cd /opt/cs-club-hackathon
bash deploy.sh
```

### Database Backup

Manual backup:

```bash
docker exec cs_club_postgres pg_dump -U hackathon_user hackathon_db > backup_$(date +%Y%m%d_%H%M%S).sql
gzip backup_*.sql
```

### Database Restore

```bash
gunzip -c backup_20240101_120000.sql.gz | docker exec -i cs_club_postgres psql -U hackathon_user -d hackathon_db
```

### Run Migrations

```bash
docker exec cs_club_backend npm run migrate
```

## Monitoring

### Check Container Health

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Check Disk Space

```bash
df -h
docker system df
```

### Clean Up Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (BE CAREFUL!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

### Database Connection Issues

Check PostgreSQL is running:
```bash
docker exec cs_club_postgres pg_isready -U hackathon_user -d hackathon_db
```

### SSL Certificate Issues

Renew certificates manually:
```bash
certbot renew --force-renewal
docker-compose -f docker-compose.prod.yml restart frontend
```

### Port Already in Use

Check what's using the port:
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000
```

### Out of Memory

Check memory usage:
```bash
free -h
docker stats
```

Consider upgrading your VPS or optimizing resource limits in docker-compose.prod.yml

## Security Best Practices

1. **Change all default passwords** in .env file
2. **Use strong secrets** - generate with `openssl rand -hex 64`
3. **Keep system updated:**
   ```bash
   apt-get update && apt-get upgrade -y
   ```
4. **Configure firewall** properly:
   ```bash
   ufw status
   ```
5. **Monitor logs** for suspicious activity:
   ```bash
   tail -f /var/log/auth.log
   ```
6. **Regular backups** - automate database backups
7. **SSL certificates** - use Let's Encrypt, not self-signed in production
8. **Rate limiting** - already configured in nginx.conf

## Performance Optimization

### Database Optimization

Edit docker-compose.prod.yml to add PostgreSQL tuning:

```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Redis Optimization

Already configured with persistence (appendonly mode).

### Nginx Caching

Consider adding proxy caching for API responses:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    # ... other settings
}
```

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:
1. Load balancer (nginx or HAProxy)
2. Multiple backend instances
3. Separate database server
4. Redis Cluster for session management

### Vertical Scaling

Upgrade VPS resources:
- RAM: 2GB minimum, 4GB+ recommended
- CPU: 2 cores minimum, 4+ recommended
- Disk: SSD with at least 20GB free space

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review this guide
- Check GitHub issues
- Contact system administrator

## Maintenance Schedule

Recommended maintenance tasks:

- **Daily**: Check logs for errors
- **Weekly**: Review disk space and resource usage
- **Monthly**: Update system packages and Docker images
- **Quarterly**: Review and rotate secrets/passwords
- **Yearly**: Renew SSL certificates (automatic with Let's Encrypt)
