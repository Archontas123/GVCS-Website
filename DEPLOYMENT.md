# CS Club Hackathon Platform - Production Deployment Guide (NUCLEAR RESET)

## Overview

This guide provides step-by-step instructions to completely reset and redeploy the CS Club Hackathon Platform on production with SSL properly configured.

---

## Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] Root/sudo access to the production server
- [ ] Git access to push changes
- [ ] Docker and Docker Compose installed on production server
- [ ] Domain `hackthevalley.duckdns.org` pointing to your server IP
- [ ] Ports 80, 443, 5432, 6379, and 3000 available

---

## Step 1: Push Changes to Git (LOCAL MACHINE)

From your local development machine:

```bash
# Review changes
git status
git diff

# Add all changes (unified .env file, updated docker-compose.yml, fixed nginx.conf)
git add .env docker-compose.yml nginx/nginx.conf DEPLOYMENT.md
git add -u  # This stages deletions of backend/.env, frontend/.env, .env.production

# Commit changes
git commit -m "Nuclear fix: unified .env, fixed DB password mismatch and SSL cert paths"

# Push to repository
git push origin master
```

---

## Step 2: Clean Slate on Production Server (NUCLEAR OPTION)

SSH into your production server:

```bash
ssh deploy@hackthevalley
cd /opt/cs-club-hackathon
```

### Stop and Remove Everything

```bash
# Stop all running containers
sudo docker compose down

# Remove ALL containers (including stopped ones)
sudo docker ps -a -q | xargs -r sudo docker rm -f

# Remove ALL volumes (⚠️ DELETES ALL DATA - database, redis, certificates!)
sudo docker volume ls -q | grep programming_contest | xargs -r sudo docker volume rm -f

# You can also use this if above doesn't work:
sudo docker volume rm programming_contest_postgres_data programming_contest_redis_data programming_contest_certbot_www programming_contest_certbot_conf 2>/dev/null || true

# Remove old images to force rebuild
sudo docker images | grep programming_contest | awk '{print $3}' | xargs -r sudo docker rmi -f

# Clean up orphaned volumes and networks
sudo docker system prune -af --volumes
```

### Verify Clean Slate

```bash
# Should show no programming_contest containers
sudo docker ps -a | grep programming_contest

# Should show no programming_contest volumes
sudo docker volume ls | grep programming_contest

# Should show no programming_contest images
sudo docker images | grep programming_contest
```

---

## Step 3: Pull Latest Code

```bash
# Pull latest changes from git
git pull origin master

# Verify .env file exists and has correct content
ls -la .env

# Check passwords match
echo "=== Checking DB Password Consistency ==="
grep "^POSTGRES_PASSWORD=" .env
grep "^DB_PASSWORD=" .env
echo "These two should be IDENTICAL!"

# Expected output:
# POSTGRES_PASSWORD=0e5bd44303543371d279278191010582fce54d976583649cf6355281cbfce472
# DB_PASSWORD=0e5bd44303543371d279278191010582fce54d976583649cf6355281cbfce472
```

---

## Step 4: Generate SSL Certificates

Before starting the full stack, we need to generate SSL certificates.

### Check if certificates already exist:

```bash
sudo ls -la /var/lib/docker/volumes/cs-club-hackathon_certbot_conf/_data/live/ 2>/dev/null
```

If you see `hackthevalley.duckdns.org-0001` directory with certificates, **skip to Step 5**.

### Generate New Certificates

Create volumes first:
```bash
sudo docker volume create cs-club-hackathon_certbot_www
sudo docker volume create cs-club-hackathon_certbot_conf
```

Create a temporary docker-compose file:
```bash
cat > docker-compose.certbot-init.yml << 'EOF'
version: '3.8'
services:
  nginx-certbot-init:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - cs-club-hackathon_certbot_www:/var/www/certbot:ro
    command: |
      sh -c 'echo "server { listen 80; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"OK\"; } }" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

  certbot:
    image: certbot/certbot:latest
    volumes:
      - cs-club-hackathon_certbot_www:/var/www/certbot:rw
      - cs-club-hackathon_certbot_conf:/etc/letsencrypt:rw
    command: certonly --webroot -w /var/www/certbot -d hackthevalley.duckdns.org --email your-email@example.com --agree-tos --no-eff-email --force-renewal

volumes:
  cs-club-hackathon_certbot_www:
    external: true
  cs-club-hackathon_certbot_conf:
    external: true
EOF
```

Run certificate generation:
```bash
# Start temporary nginx for certificate challenge
sudo docker compose -f docker-compose.certbot-init.yml up -d nginx-certbot-init

# Wait for nginx to be ready
sleep 5

# Run certbot to generate certificates
sudo docker compose -f docker-compose.certbot-init.yml run --rm certbot

# Stop temporary nginx
sudo docker compose -f docker-compose.certbot-init.yml down

# Clean up temporary file
rm docker-compose.certbot-init.yml
```

### Verify Certificates

```bash
sudo ls -la /var/lib/docker/volumes/cs-club-hackathon_certbot_conf/_data/live/

# You should see:
# drwxr-xr-x hackthevalley.duckdns.org-0001/

# Check certificate files exist:
sudo ls -la /var/lib/docker/volumes/cs-club-hackathon_certbot_conf/_data/live/hackthevalley.duckdns.org-0001/
# Should show: fullchain.pem, privkey.pem, chain.pem, cert.pem
```

**CRITICAL**: If the directory name is NOT `hackthevalley.duckdns.org-0001` (e.g., if it's just `hackthevalley.duckdns.org`), you MUST update [nginx/nginx.conf](nginx/nginx.conf):

```bash
# Update lines 81-82 and 95 to match actual certificate path
nano nginx/nginx.conf

# Then commit and push:
git add nginx/nginx.conf
git commit -m "Fix SSL certificate path to match actual certbot directory"
git push origin master
git pull origin master
```

---

## Step 5: Start All Services

Now that certificates exist, start the full application:

```bash
# Build and start all services (this may take 5-10 minutes)
sudo docker compose up -d --build

# Services will start in this order:
# 1. PostgreSQL (with correct password)
# 2. Redis (with password authentication)
# 3. Backend (waits for DB to be healthy)
# 4. Frontend (waits for backend to be healthy)
# 5. Certbot (for certificate renewal)
```

---

## Step 6: Monitor Startup

Watch the logs to ensure everything starts correctly:

```bash
# Watch all logs (press Ctrl+C to stop)
sudo docker compose logs -f

# Or watch specific services in separate terminals:
sudo docker compose logs -f postgres
sudo docker compose logs -f redis
sudo docker compose logs -f backend
sudo docker compose logs -f frontend
```

### Success Indicators:

**PostgreSQL** ✅
```
database system is ready to accept connections
```
❌ NO "password authentication failed" errors!

**Redis** ✅
```
Ready to accept connections tcp
```

**Backend** ✅
```
Server running on port 3000
🚀 Programming Contest Platform API server started
```
❌ NO "Database connection failed" errors!

**Frontend (nginx)** ✅
```
Configuration complete; ready for start up
```
❌ NO "cannot load certificate" errors!
❌ NO crash loops!

---

## Step 7: Verify Everything Works

### Check container status:
```bash
sudo docker compose ps

# All containers should show:
# - STATE: Up (not Restarting or Exited)
# - STATUS: healthy (after ~30 seconds)
```

### Test database connection:
```bash
# Test connection with correct password
sudo docker exec -it programming_contest_postgres psql -U hackathon_user -d hackathon_db -c "SELECT 'Database Connected!' as status;"

# If prompted for password, use:
# 0e5bd44303543371d279278191010582fce54d976583649cf6355281cbfce472
```

### Test Redis connection:
```bash
sudo docker exec -it programming_contest_redis redis-cli -a 2f0a3fe11d99146fd1a4d51b859203c86137f1086e7d7c1dcd513adfd4341eaa PING
# Should respond: PONG
```

### Test Backend API:
```bash
# Test from inside the server
curl http://localhost:3000/api/health
# Should return: {"status":"healthy"} or similar

# Test through nginx (HTTP)
curl http://localhost/api/health

# Test through nginx (HTTPS)
curl -k https://localhost/api/health
```

### Test Frontend (HTTPS):
```bash
# Test health endpoint
curl https://hackthevalley.duckdns.org/health
# Should return: healthy

# Test API through nginx
curl https://hackthevalley.duckdns.org/api/health
```

---

## Step 8: Access the Application

Open in your browser:

🌐 **Frontend**: https://hackthevalley.duckdns.org
📡 **API Health**: https://hackthevalley.duckdns.org/api/health
🔧 **Backend Direct** (if needed): http://your-server-ip:3000/api/health

### Check Browser:
- You should see a green padlock (valid SSL)
- No certificate warnings
- Application loads properly

---

## Troubleshooting

### ❌ Problem: Database authentication still failing

```bash
# Check environment variables in backend
sudo docker compose exec backend env | grep -E "(DB_PASSWORD|DATABASE_URL)"

# Check environment variables in postgres
sudo docker compose exec postgres env | grep POSTGRES_PASSWORD

# They should MATCH! If not:
sudo docker compose down
sudo docker compose up -d --force-recreate
```

### ❌ Problem: Frontend still crashing with SSL errors

```bash
# Check actual certificate directory name
sudo ls -la /var/lib/docker/volumes/cs-club-hackathon_certbot_conf/_data/live/

# Check what nginx config expects
grep "ssl_certificate" nginx/nginx.conf

# If they don't match, update nginx.conf and restart:
nano nginx/nginx.conf  # Update lines 81, 82, 95
git add nginx/nginx.conf && git commit -m "Fix cert path" && git push
git pull
sudo docker compose restart frontend
```

### ❌ Problem: Backend can't connect to Redis

```bash
# Check Redis password in backend
sudo docker compose exec backend env | grep REDIS

# Test Redis with password
sudo docker exec -it programming_contest_redis redis-cli
# Once inside: AUTH 2f0a3fe11d99146fd1a4d51b859203c86137f1086e7d7c1dcd513adfd4341eaa
# Then: PING (should return PONG)
```

### ❌ Problem: Port conflicts

```bash
# Check what's using the ports
sudo netstat -tulpn | grep -E ':(80|443|3000|5432|6379)'

# Stop conflicting services
sudo systemctl stop nginx      # If system nginx is running
sudo systemctl stop postgresql # If system postgres is running
sudo systemctl stop redis      # If system redis is running

# Then restart docker containers
sudo docker compose restart
```

### ❌ Problem: Containers keep restarting

```bash
# Check which container is problematic
sudo docker compose ps

# View detailed logs
sudo docker compose logs --tail=50 <container_name>

# Common fixes:
# 1. Password mismatch: Check .env file
# 2. Missing certificates: Regenerate (Step 4)
# 3. Port conflicts: Stop conflicting services
```

---

## Maintenance Commands

### View logs:
```bash
# All services (last 100 lines)
sudo docker compose logs --tail=100

# Specific service with timestamps
sudo docker compose logs -f --timestamps backend

# Follow all logs in real-time
sudo docker compose logs -f
```

### Restart services:
```bash
# Restart all
sudo docker compose restart

# Restart specific service
sudo docker compose restart backend
sudo docker compose restart frontend
```

### Stop all services:
```bash
sudo docker compose down
```

### Rebuild and restart:
```bash
sudo docker compose up -d --build --force-recreate
```

### View resource usage:
```bash
sudo docker stats
```

### Database backup:
```bash
sudo docker exec programming_contest_postgres pg_dump -U hackathon_user hackathon_db > backup_$(date +%Y%m%d_%H%M%S).sql
gzip backup_*.sql
```

### Database restore:
```bash
gunzip -c backup_file.sql.gz | sudo docker exec -i programming_contest_postgres psql -U hackathon_user -d hackathon_db
```

---

## Certificate Renewal

Certificates auto-renew via the certbot container (runs twice daily). To manually renew:

```bash
sudo docker compose exec certbot certbot renew --force-renewal
sudo docker compose restart frontend
```

---

## Success Criteria

✅ Your deployment is successful when:

1. All containers show "Up" and "healthy":
   ```bash
   sudo docker compose ps
   ```

2. No password errors in logs:
   ```bash
   sudo docker compose logs | grep -i "password authentication failed"
   # Should return nothing
   ```

3. No SSL errors in logs:
   ```bash
   sudo docker compose logs frontend | grep -i "cannot load certificate"
   # Should return nothing
   ```

4. API responds via HTTPS:
   ```bash
   curl https://hackthevalley.duckdns.org/api/health
   # Returns JSON with status
   ```

5. Website loads with valid SSL:
   - Open https://hackthevalley.duckdns.org in browser
   - Green padlock visible
   - No certificate warnings

---

## Key Changes Made in This Fix

1. **✅ Unified .env file**: Single source of truth for all environment variables (committed to git)
2. **✅ Password consistency**: Database password `0e5bd44303543371d279278191010582fce54d976583649cf6355281cbfce472` everywhere
3. **✅ SSL path fix**: Nginx now correctly looks for certificates in `hackthevalley.duckdns.org-0001`
4. **✅ Docker Compose updated**: Uses environment variables from .env file
5. **✅ Redis password**: Properly configured with `2f0a3fe11d99146fd1a4d51b859203c86137f1086e7d7c1dcd513adfd4341eaa`
6. **✅ Removed redundant .env files**: Deleted backend/.env, frontend/.env, .env.production

---

## What Was Wrong Before?

### Problem 1: Database Password Mismatch
- **docker-compose.yml** set: `POSTGRES_PASSWORD=0e5bd44303543371d279278191010582fce54d976583649cf6355281cbfce472`
- **Backend expected**: `DB_PASSWORD=hackathon_password`
- **Result**: `password authentication failed for user "hackathon_user"`

### Problem 2: SSL Certificate Path Wrong
- **Certbot created**: `/etc/letsencrypt/live/hackthevalley.duckdns.org-0001/`
- **Nginx looked for**: `/etc/letsencrypt/live/hackthevalley.duckdns.org/`
- **Result**: `cannot load certificate ... No such file or directory` → nginx crash loop

### Problem 3: Configuration Chaos
- Multiple conflicting .env files (root, backend, frontend, production)
- Different passwords in different files
- No single source of truth

---

## Emergency Rollback

If deployment fails catastrophically:

```bash
# Stop everything
sudo docker compose down

# Restore from backup (if you made one)
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | sudo docker exec -i programming_contest_postgres psql -U hackathon_user -d hackathon_db

# Or start from scratch again (return to Step 2)
```

---

## Need Help?

If issues persist after following this guide:

1. **Check logs**: `sudo docker compose logs -f`
2. **Verify passwords**: Check .env file matches docker-compose environment variables
3. **Verify SSL certs exist**: Check certificate paths match nginx.conf
4. **Verify clean slate**: Ensure ALL old volumes were deleted before restart
5. **Test services independently**:
   - Postgres: `sudo docker compose up -d postgres` → test connection
   - Redis: `sudo docker compose up -d redis` → test connection
   - Backend: `sudo docker compose up -d backend` → test health endpoint
   - Frontend: `sudo docker compose up -d frontend` → test HTTPS access

---

## Contact & Support

For additional help:
- Review logs thoroughly
- Check each service independently
- Verify all prerequisites are met
- Ensure server has enough resources (RAM, disk space)
