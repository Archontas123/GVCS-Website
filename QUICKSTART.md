# CS Club Hackathon Platform - Quick Deployment Guide

**Complete step-by-step instructions to get your site running on a Hetzner VPS with DuckDNS**

---

## Prerequisites

1. **Hetzner VPS** (or any Ubuntu 20.04+ VPS)
   - Minimum: 2GB RAM, 2 CPU cores, 20GB SSD
   - Note your VPS IP address

2. **DuckDNS Account & Domain**
   - Go to https://www.duckdns.org
   - Sign in (Google, GitHub, etc.)
   - Create a subdomain (e.g., `mycsclub.duckdns.org`)
   - Save your token

3. **GitHub Repository**
   - Fork or clone this repository
   - Have your GitHub username ready

---

## Step 1: Setup DuckDNS

**On your local machine:**

```bash
# Update DuckDNS to point to your VPS IP
curl "https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip=YOUR_VPS_IP"
```

Replace:
- `YOUR_SUBDOMAIN` - Your DuckDNS subdomain (without .duckdns.org)
- `YOUR_TOKEN` - Your DuckDNS token
- `YOUR_VPS_IP` - Your Hetzner VPS IP address

**Verify it worked:**
```bash
# Should show your VPS IP
nslookup YOUR_SUBDOMAIN.duckdns.org
```

---

## Step 2: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

Enter password when prompted (sent by Hetzner via email).

---

## Step 3: Run Initial VPS Setup

```bash
# Update system
apt update && apt upgrade -y

# Download setup script
wget https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/CSCLUBWebsite/master/scripts/vps-setup.sh

# Run it
bash vps-setup.sh
```

**This installs:**
- Docker & Docker Compose
- Firewall (UFW) - opens ports 22, 80, 443
- fail2ban for security
- Git and other essentials

**Time:** ~5-10 minutes

---

## Step 4: Clone Repository

```bash
cd /opt
git clone https://github.com/YOUR_GITHUB_USERNAME/CSCLUBWebsite.git cs-club-hackathon
cd cs-club-hackathon
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

---

## Step 5: Setup Environment Variables

```bash
bash scripts/setup-env.sh
```

**You'll be prompted for:**
1. **Domain:** `yourname.duckdns.org` (your full DuckDNS domain)
2. **Admin password:** Choose a strong password (for admin login)
3. **PostgreSQL password:** Choose a strong password (for database)
4. **Redis password:** Choose a strong password (for Redis)

**Script auto-generates:**
- JWT secret (64 bytes)
- Session secret (32 bytes)
- Grafana password

**Time:** ~1 minute

---

## Step 6: Setup Auto-Update for DuckDNS (Recommended)

Your VPS IP might change. Keep DuckDNS updated automatically:

```bash
# Create DuckDNS directory
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

# Replace YOUR_SUBDOMAIN and YOUR_TOKEN in the file
nano duck.sh

# Make executable
chmod 700 duck.sh

# Test it
./duck.sh
cat duck.log  # Should show "OK"

# Add to crontab (runs every 5 minutes)
crontab -e
```

Add this line at the bottom:
```
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

Save and exit (Ctrl+X, Y, Enter).

---

## Step 7: Setup SSL Certificates

```bash
cd /opt/cs-club-hackathon
bash scripts/setup-ssl.sh
```

**You'll be prompted for:**
1. Your domain: `yourname.duckdns.org`
2. Your email: For Let's Encrypt renewal notifications

**Time:** ~2 minutes

**Note:** Let's Encrypt has rate limits. If it fails, use self-signed certs for testing:
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/cert.pem \
  -subj "/CN=yourname.duckdns.org"
```

---

## Step 8: Deploy Application

```bash
cd /opt/cs-club-hackathon
bash deploy.sh
```

**This will:**
1. Pull latest code from GitHub
2. Build Docker images (backend + frontend)
3. Start all containers (PostgreSQL, Redis, backend, frontend, nginx)
4. Run database migrations
5. Seed initial data
6. Run health checks

**Time:** ~5-10 minutes (first build takes longer)

---

## Step 9: Verify Deployment

**Check all containers are running:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see:
- ✓ cs_club_postgres - Up (healthy)
- ✓ cs_club_redis - Up (healthy)
- ✓ cs_club_backend - Up (healthy)
- ✓ cs_club_frontend - Up (healthy)

**Check logs if any issues:**
```bash
# All logs
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## Step 10: Access Your Site

**Open in browser:**
- **Frontend:** https://yourname.duckdns.org
- **API Health:** https://yourname.duckdns.org/api/health

**Default Admin Login:**
- Navigate to: https://yourname.duckdns.org/admin
- Username: `admin`
- Password: (the ADMIN_PASSWORD you set in Step 5)

---

## Step 11: Test Everything

1. **Create a test account** (register as a participant)
2. **Login as admin** and create a contest
3. **Add some problems** to the contest
4. **Submit a solution** as a participant
5. **Check the leaderboard**

---

## Optional: Setup Auto-Deploy on Git Push

This makes future updates automatic when you push to GitHub.

### 1. Generate SSH Key on VPS

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub
```

Copy the public key output.

### 2. Add Public Key to VPS

```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 3. Get Private Key

```bash
cat ~/.ssh/github_actions
```

Copy the entire private key (including `-----BEGIN` and `-----END` lines).

### 4. Add GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/CSCLUBWebsite/settings/secrets/actions`

Add these secrets:
- **VPS_HOST**: Your VPS IP address
- **VPS_USERNAME**: `root`
- **VPS_SSH_KEY**: Your private key (from step 3)
- **VPS_PORT**: `22`

### 5. Test Auto-Deploy

```bash
# On your local machine
git add .
git commit -m "test auto-deploy"
git push
```

GitHub Actions will automatically deploy to your VPS. Check progress at:
`https://github.com/YOUR_USERNAME/CSCLUBWebsite/actions`

---

## Common Issues & Fixes

### SSL Certificate Failed
```bash
# Use self-signed certificates temporarily
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/cert.pem \
  -subj "/CN=yourname.duckdns.org"
```

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Restart all
docker-compose -f docker-compose.prod.yml restart
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker exec cs_club_postgres pg_isready -U hackathon_user -d hackathon_db

# Recreate database
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Port Already in Use
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443

# Kill process if needed
sudo kill -9 PID
```

### Out of Memory
```bash
# Check memory
free -h
docker stats

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### DuckDNS Not Updating
```bash
# Check cron job
crontab -l

# Check log
cat ~/duckdns/duck.log  # Should show "OK"

# Test manually
~/duckdns/duck.sh
```

---

## Maintenance Commands

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
cd /opt/cs-club-hackathon
git pull
bash deploy.sh
```

### Backup Database
```bash
docker exec cs_club_postgres pg_dump -U hackathon_user hackathon_db > backup_$(date +%Y%m%d_%H%M%S).sql
gzip backup_*.sql
```

### Restore Database
```bash
gunzip -c backup_20240101_120000.sql.gz | docker exec -i cs_club_postgres psql -U hackathon_user -d hackathon_db
```

### Check Disk Space
```bash
df -h
docker system df
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove everything (BE CAREFUL!)
docker system prune -a --volumes
```

---

## Security Checklist

- ✓ Strong passwords in .env
- ✓ Firewall (UFW) enabled - ports 22, 80, 443
- ✓ fail2ban installed
- ✓ SSL certificates (Let's Encrypt)
- ✓ .env file permissions (600)
- ✓ Regular system updates
- ✓ Database backups enabled

---

## Quick Reference

| Resource | URL/Command |
|----------|-------------|
| **Frontend** | https://yourname.duckdns.org |
| **Admin Panel** | https://yourname.duckdns.org/admin |
| **API Health** | https://yourname.duckdns.org/api/health |
| **View Logs** | `docker-compose -f docker-compose.prod.yml logs -f` |
| **Restart** | `docker-compose -f docker-compose.prod.yml restart` |
| **Update** | `cd /opt/cs-club-hackathon && git pull && bash deploy.sh` |
| **SSH to VPS** | `ssh root@YOUR_VPS_IP` |

---

## Support

- **GitHub Issues:** https://github.com/YOUR_USERNAME/CSCLUBWebsite/issues
- **Full Docs:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **DuckDNS Help:** https://www.duckdns.org/spec.jsp
- **Docker Help:** https://docs.docker.com/

---

**🎉 Congratulations! Your CS Club Hackathon Platform is now live!**
