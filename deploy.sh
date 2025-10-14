#!/bin/bash

# CS Club Hackathon Platform - Deployment Script
# This script deploys the application on a VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cs-club-hackathon"
REPO_URL="https://github.com/YOUR_USERNAME/CSCLUBWebsite.git"
DEPLOY_DIR="/opt/${PROJECT_NAME}"
BACKUP_DIR="/opt/${PROJECT_NAME}/backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."

    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi

    # Check for required commands
    for cmd in docker docker-compose git; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed"
            exit 1
        fi
    done

    log_info "All requirements met"
}

setup_directories() {
    log_info "Setting up directories..."

    mkdir -p ${DEPLOY_DIR}
    mkdir -p ${BACKUP_DIR}
    mkdir -p ${DEPLOY_DIR}/nginx/ssl
    mkdir -p ${DEPLOY_DIR}/backend/logs

    log_info "Directories created"
}

pull_latest_code() {
    log_info "Pulling latest code from GitHub..."

    if [ -d "${DEPLOY_DIR}/.git" ]; then
        cd ${DEPLOY_DIR}
        git fetch origin
        git pull origin master
    else
        git clone ${REPO_URL} ${DEPLOY_DIR}
        cd ${DEPLOY_DIR}
    fi

    log_info "Code pulled successfully"
}

setup_environment() {
    log_info "Setting up environment variables..."

    if [ ! -f "${DEPLOY_DIR}/.env" ]; then
        log_warn ".env file not found. Creating from example..."
        cp ${DEPLOY_DIR}/.env.example ${DEPLOY_DIR}/.env
        log_error "Please edit ${DEPLOY_DIR}/.env with your production values before continuing"
        exit 1
    fi

    log_info "Environment variables configured"
}

backup_database() {
    log_info "Creating database backup..."

    BACKUP_FILE="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"

    if docker ps | grep -q cs_club_postgres; then
        docker exec cs_club_postgres pg_dump -U hackathon_user hackathon_db > ${BACKUP_FILE}
        gzip ${BACKUP_FILE}
        log_info "Database backed up to ${BACKUP_FILE}.gz"
    else
        log_warn "Database container not running, skipping backup"
    fi

    # Keep only last 7 backups
    cd ${BACKUP_DIR}
    ls -t backup_*.sql.gz | tail -n +8 | xargs -r rm
}

stop_containers() {
    log_info "Stopping existing containers..."

    cd ${DEPLOY_DIR}
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down
    fi

    log_info "Containers stopped"
}

build_and_start() {
    log_info "Building and starting containers..."

    cd ${DEPLOY_DIR}

    # Build images
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Start services
    docker-compose -f docker-compose.prod.yml up -d

    log_info "Containers started"
}

run_migrations() {
    log_info "Running database migrations..."

    # Wait for backend to be healthy
    sleep 10

    docker exec cs_club_backend npm run db:migrate

    log_info "Migrations completed"
}

setup_ssl() {
    log_info "Checking SSL certificates..."

    if [ ! -f "${DEPLOY_DIR}/nginx/ssl/cert.pem" ]; then
        log_warn "SSL certificates not found. Using self-signed certificates for testing."
        log_warn "For production, please install Let's Encrypt certificates."

        # Generate self-signed certificate for testing
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ${DEPLOY_DIR}/nginx/ssl/private.key \
            -out ${DEPLOY_DIR}/nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    fi
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."

    docker image prune -f

    log_info "Cleanup completed"
}

health_check() {
    log_info "Running health checks..."

    sleep 5

    # Check backend
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log_info "Backend is healthy"
    else
        log_error "Backend health check failed"
        return 1
    fi

    # Check frontend
    if curl -f http://localhost/health &> /dev/null; then
        log_info "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        return 1
    fi

    log_info "All services are healthy"
}

show_status() {
    log_info "Container status:"
    docker-compose -f ${DEPLOY_DIR}/docker-compose.prod.yml ps

    log_info "\nApplication URLs:"
    echo "  Frontend: http://YOUR_DOMAIN"
    echo "  Backend API: http://YOUR_DOMAIN/api"
    echo ""
    log_info "View logs with: docker-compose -f ${DEPLOY_DIR}/docker-compose.prod.yml logs -f"
}

# Main deployment flow
main() {
    log_info "Starting deployment of ${PROJECT_NAME}..."

    check_requirements
    setup_directories
    pull_latest_code
    setup_environment
    backup_database
    stop_containers
    build_and_start
    run_migrations
    setup_ssl
    cleanup_old_images

    if health_check; then
        log_info "Deployment completed successfully!"
        show_status
    else
        log_error "Deployment completed with errors. Please check the logs."
        exit 1
    fi
}

# Run main function
main
