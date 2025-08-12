#!/bin/bash

# CS Club Hackathon Platform - Deployment Script
# Phase 6.2: Production deployment automation

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found. Creating from template..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        log_warning "Please edit .env file with your actual configuration before proceeding."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to backup current deployment
backup_current() {
    log_info "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if running
    if docker ps | grep -q hackathon_postgres; then
        log_info "Backing up PostgreSQL database..."
        docker exec hackathon_postgres pg_dump -U hackathon_user hackathon_db > "$BACKUP_DIR/database_backup.sql"
    fi
    
    # Backup volumes
    if docker volume ls | grep -q hackathon; then
        log_info "Backing up Docker volumes..."
        docker run --rm -v hackathon_postgres_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf /backup/postgres_volume.tar.gz /data
        docker run --rm -v hackathon_redis_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf /backup/redis_volume.tar.gz /data
        docker run --rm -v hackathon_backend_data:/data -v "$BACKUP_DIR:/backup" alpine tar czf /backup/backend_volume.tar.gz /data
    fi
    
    # Backup configuration
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/env_backup"
    cp "$PROJECT_ROOT/docker-compose.production.yml" "$BACKUP_DIR/"
    
    log_success "Backup created at: $BACKUP_DIR"
}

# Function to build images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    log_info "Building backend image..."
    docker build -f Dockerfile.backend -t hackathon-backend:latest .
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -f Dockerfile.frontend -t hackathon-frontend:latest .
    
    # Build judge image
    log_info "Building judge image..."
    docker build -f docker/Dockerfile -t hackathon-judge:latest ./docker/
    
    log_success "All images built successfully"
}

# Function to deploy services
deploy_services() {
    log_info "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services gracefully
    if docker-compose -f docker-compose.production.yml ps | grep -q Up; then
        log_info "Stopping existing services..."
        docker-compose -f docker-compose.production.yml down --timeout 30
    fi
    
    # Start new services
    log_info "Starting new services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Health check
    check_health
}

# Function to check service health
check_health() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check backend health
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            log_success "Backend is healthy"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                log_error "Backend health check failed after $max_attempts attempts"
                return 1
            fi
            log_info "Backend not ready yet (attempt $attempt/$max_attempts)..."
            sleep 10
            ((attempt++))
        fi
    done
    
    # Check frontend health
    if curl -f -s http://localhost/health > /dev/null; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Check database connection
    if docker exec hackathon_backend node -e "require('./src/utils/db').testConnection().then(() => console.log('DB OK')).catch(e => {console.error(e); process.exit(1)})" > /dev/null; then
        log_success "Database connection is healthy"
    else
        log_error "Database connection failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations
    if docker exec hackathon_backend npm run db:migrate; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
}

# Function to setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p "$PROJECT_ROOT/monitoring/prometheus"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/provisioning"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/dashboards"
    
    # Generate Prometheus config if not exists
    if [ ! -f "$PROJECT_ROOT/monitoring/prometheus.yml" ]; then
        cat > "$PROJECT_ROOT/monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'hackathon-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF
    fi
    
    log_success "Monitoring setup completed"
}

# Function to show deployment summary
show_summary() {
    log_info "Deployment Summary"
    echo "=================================="
    echo "Application: CS Club Hackathon Platform"
    echo "Version: 6.2.0"
    echo "Environment: Production"
    echo "Deployment Time: $(date)"
    echo ""
    echo "Services Running:"
    docker-compose -f docker-compose.production.yml ps
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost/api"
    echo "  Admin Panel: http://localhost/admin"
    echo "  Monitoring: http://localhost:3001"
    echo "  Metrics: http://localhost:9090"
    echo ""
    echo "Backup Location: $BACKUP_DIR"
    echo "=================================="
}

# Function to rollback deployment
rollback() {
    log_warning "Rolling back deployment..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    # Stop current services
    docker-compose -f docker-compose.production.yml down
    
    # Restore database
    if [ -f "$BACKUP_DIR/database_backup.sql" ]; then
        log_info "Restoring database..."
        docker-compose -f docker-compose.production.yml up -d postgres
        sleep 30
        docker exec -i hackathon_postgres psql -U hackathon_user hackathon_db < "$BACKUP_DIR/database_backup.sql"
    fi
    
    # Restore volumes
    if [ -f "$BACKUP_DIR/postgres_volume.tar.gz" ]; then
        docker run --rm -v hackathon_postgres_data:/data -v "$BACKUP_DIR:/backup" alpine tar xzf /backup/postgres_volume.tar.gz -C /
    fi
    
    log_success "Rollback completed"
}

# Main deployment function
main() {
    local action=${1:-deploy}
    
    case $action in
        "deploy")
            log_info "Starting production deployment..."
            check_prerequisites
            backup_current
            build_images
            setup_monitoring
            deploy_services
            run_migrations
            show_summary
            log_success "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        "health")
            check_health
            ;;
        "backup")
            backup_current
            ;;
        "build")
            build_images
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup|build}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full production deployment (default)"
            echo "  rollback - Rollback to previous backup"
            echo "  health   - Check service health"
            echo "  backup   - Create backup only"
            echo "  build    - Build Docker images only"
            exit 1
            ;;
    esac
}

# Trap to handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"