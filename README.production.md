# Production Deployment Quick Reference

## Initial Setup Commands

```bash
# 1. Setup VPS (run once)
sudo bash scripts/vps-setup.sh

# 2. Clone repository
sudo git clone YOUR_REPO_URL /opt/cs-club-hackathon
cd /opt/cs-club-hackathon

# 3. Configure environment
cp .env.production .env
nano .env  # Edit with your values

# 4. Setup SSL
sudo bash scripts/setup-ssl.sh

# 5. Deploy
sudo bash deploy.sh
```

## Common Operations

```bash
# Update application
cd /opt/cs-club-hackathon
sudo bash scripts/update.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Check status
docker-compose -f docker-compose.prod.yml ps

# Backup database
docker exec cs_club_postgres pg_dump -U hackathon_user hackathon_db > backup.sql

# Run migrations
docker exec cs_club_backend npm run migrate
```

## URLs

- **Frontend**: https://yourdomain.com
- **Backend Health**: https://yourdomain.com/api/health
- **Admin Login**: https://yourdomain.com/admin/login

## GitHub Secrets Required

- `VPS_HOST`: Your VPS IP or hostname
- `VPS_USERNAME`: SSH username (usually "root")
- `VPS_SSH_KEY`: Private SSH key content
- `VPS_PORT`: SSH port (default: 22)

## Important Files

- `docker-compose.prod.yml`: Production Docker configuration
- `.env`: Environment variables (not in git)
- `nginx/nginx.conf`: Nginx configuration with SSL
- `deploy.sh`: Main deployment script
- `DEPLOYMENT.md`: Full deployment guide

## Security Checklist

- [ ] Changed all default passwords in `.env`
- [ ] Generated strong JWT_SECRET
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] Firewall configured (UFW)
- [ ] SSH keys setup for GitHub Actions
- [ ] Regular backups enabled

## Support

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
