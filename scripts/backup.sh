#!/bin/bash

# CS Club Hackathon Platform - Database Backup Script
# Phase 6.2: Production backup automation

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_PATH:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="hackathon_backup_$TIMESTAMP"

# Database configuration from environment
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-hackathon_db}"
DB_USER="${POSTGRES_USER:-hackathon_user}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Backup retention (days)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# S3 configuration (optional)
AWS_BUCKET="${AWS_BUCKET_NAME}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if required tools are available
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v gzip &> /dev/null; then
        log_error "gzip not found. Please install gzip."
        exit 1
    fi
    
    if [[ -n "$AWS_BUCKET" ]] && ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found. S3 upload will be skipped."
        AWS_BUCKET=""
    fi
    
    log_success "Dependencies check passed"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [[ ! -w "$BACKUP_DIR" ]]; then
        log_error "Backup directory is not writable: $BACKUP_DIR"
        exit 1
    fi
    
    log_success "Backup directory ready: $BACKUP_DIR"
}

# Test database connectivity
test_db_connection() {
    log_info "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q; then
        log_error "Cannot connect to database"
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Create database backup
create_database_backup() {
    log_info "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}_database.sql"
    local compressed_file="$backup_file.gz"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create SQL dump with verbose output
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --create --format=plain \
        --no-owner --no-privileges > "$backup_file" 2>/dev/null; then
        
        # Compress the backup
        if gzip "$backup_file"; then
            local file_size=$(du -h "$compressed_file" | cut -f1)
            log_success "Database backup created: $compressed_file ($file_size)"
            echo "$compressed_file"
        else
            log_error "Failed to compress backup file"
            return 1
        fi
    else
        log_error "Failed to create database backup"
        return 1
    fi
}

# Create Redis backup
create_redis_backup() {
    log_info "Creating Redis backup..."
    
    local redis_backup_dir="$BACKUP_DIR/${BACKUP_NAME}_redis"
    mkdir -p "$redis_backup_dir"
    
    # Check if Redis container is running
    if docker ps | grep -q hackathon_redis; then
        # Create Redis backup
        if docker exec hackathon_redis redis-cli BGSAVE; then
            # Wait for backup to complete
            sleep 5
            
            # Copy RDB file from container
            if docker cp hackathon_redis:/data/dump.rdb "$redis_backup_dir/"; then
                # Compress Redis backup
                local compressed_redis="$redis_backup_dir.tar.gz"
                tar -czf "$compressed_redis" -C "$BACKUP_DIR" "${BACKUP_NAME}_redis"
                rm -rf "$redis_backup_dir"
                
                local file_size=$(du -h "$compressed_redis" | cut -f1)
                log_success "Redis backup created: $compressed_redis ($file_size)"
                echo "$compressed_redis"
            else
                log_warning "Failed to copy Redis backup file"
            fi
        else
            log_warning "Failed to create Redis backup"
        fi
    else
        log_warning "Redis container not running, skipping Redis backup"
    fi
}

# Create application files backup
create_files_backup() {
    log_info "Creating application files backup..."
    
    local files_backup="$BACKUP_DIR/${BACKUP_NAME}_files.tar.gz"
    local temp_dir="/tmp/hackathon_files_backup"
    
    mkdir -p "$temp_dir"
    
    # Copy important application files
    cp -r "$PROJECT_ROOT/src/database" "$temp_dir/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/logs" "$temp_dir/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/uploads" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_ROOT/.env" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docker-compose.production.yml" "$temp_dir/" 2>/dev/null || true
    
    # Create compressed archive
    if tar -czf "$files_backup" -C "$temp_dir" .; then
        rm -rf "$temp_dir"
        local file_size=$(du -h "$files_backup" | cut -f1)
        log_success "Application files backup created: $files_backup ($file_size)"
        echo "$files_backup"
    else
        log_warning "Failed to create application files backup"
        rm -rf "$temp_dir"
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    local s3_key="backups/$(date +%Y/%m/%d)/$filename"
    
    log_info "Uploading $filename to S3..."
    
    if aws s3 cp "$backup_file" "s3://$AWS_BUCKET/$s3_key" --region "$AWS_REGION"; then
        log_success "Uploaded to S3: s3://$AWS_BUCKET/$s3_key"
    else
        log_warning "Failed to upload $filename to S3"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "hackathon_backup_*" -type f -mtime +$RETENTION_DAYS -delete
    
    local removed_count=$(find "$BACKUP_DIR" -name "hackathon_backup_*" -type f -mtime +$RETENTION_DAYS | wc -l)
    if [[ $removed_count -gt 0 ]]; then
        log_success "Removed $removed_count old backup files"
    fi
    
    # Clean up S3 backups if configured
    if [[ -n "$AWS_BUCKET" ]]; then
        log_info "Cleaning up old S3 backups..."
        aws s3api list-objects-v2 --bucket "$AWS_BUCKET" --prefix "backups/" \
            --query "Contents[?LastModified<=\`$(date -d "${RETENTION_DAYS} days ago" -u +%Y-%m-%dT%H:%M:%S.000Z)\`].Key" \
            --output text | xargs -I {} aws s3 rm "s3://$AWS_BUCKET/{}" 2>/dev/null || true
    fi
}

# Generate backup manifest
generate_manifest() {
    local manifest_file="$BACKUP_DIR/${BACKUP_NAME}_manifest.json"
    
    log_info "Generating backup manifest..."
    
    cat > "$manifest_file" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "database": {
    "host": "$DB_HOST",
    "port": "$DB_PORT",
    "name": "$DB_NAME",
    "user": "$DB_USER"
  },
  "files": [
$(find "$BACKUP_DIR" -name "${BACKUP_NAME}_*" -type f -printf '    "%f",\n' | sed '$ s/,$//')
  ],
  "total_size": "$(du -sh "$BACKUP_DIR/${BACKUP_NAME}_"* | awk '{sum+=$1} END {print sum}')",
  "retention_days": $RETENTION_DAYS,
  "s3_bucket": "${AWS_BUCKET:-null}"
}
EOF
    
    log_success "Backup manifest created: $manifest_file"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local payload="{
            \"channel\": \"#backups\",
            \"username\": \"Backup Bot\",
            \"icon_emoji\": \":floppy_disk:\",
            \"text\": \"$message\",
            \"color\": \"$([ "$status" = "success" ] && echo "good" || echo "danger")\"
        }"
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "$payload" "$SLACK_WEBHOOK_URL" > /dev/null
    fi
}

# Main backup function
main() {
    local backup_type="${1:-full}"
    
    log_info "Starting backup process (type: $backup_type)..."
    
    check_dependencies
    create_backup_dir
    test_db_connection
    
    local backup_files=()
    local backup_success=true
    
    case "$backup_type" in
        "database"|"db")
            if db_backup=$(create_database_backup); then
                backup_files+=("$db_backup")
            else
                backup_success=false
            fi
            ;;
        "redis")
            if redis_backup=$(create_redis_backup); then
                backup_files+=("$redis_backup")
            else
                backup_success=false
            fi
            ;;
        "files")
            if files_backup=$(create_files_backup); then
                backup_files+=("$files_backup")
            else
                backup_success=false
            fi
            ;;
        "full"|*)
            # Create all backups
            if db_backup=$(create_database_backup); then
                backup_files+=("$db_backup")
            else
                backup_success=false
            fi
            
            if redis_backup=$(create_redis_backup); then
                backup_files+=("$redis_backup")
            fi
            
            if files_backup=$(create_files_backup); then
                backup_files+=("$files_backup")
            fi
            ;;
    esac
    
    # Upload to S3 if configured
    if [[ -n "$AWS_BUCKET" ]] && [[ $backup_success == true ]]; then
        for backup_file in "${backup_files[@]}"; do
            upload_to_s3 "$backup_file"
        done
    fi
    
    # Generate manifest
    generate_manifest
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Final status
    if [[ $backup_success == true ]]; then
        local total_size=$(du -sh "${backup_files[@]}" 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "unknown")
        log_success "Backup completed successfully!"
        log_info "Total backup size: $total_size"
        log_info "Backup location: $BACKUP_DIR"
        
        send_notification "success" "✅ Backup completed successfully ($total_size)"
    else
        log_error "Backup completed with errors"
        send_notification "error" "❌ Backup completed with errors"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@"