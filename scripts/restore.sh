#!/bin/bash

# CS Club Hackathon Platform - Database Restore Script
# Phase 6.2: Production restore automation

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_PATH:-$PROJECT_ROOT/backups}"

# Database configuration from environment
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-hackathon_db}"
DB_USER="${POSTGRES_USER:-hackathon_user}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

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

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS] BACKUP_FILE"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE     Type of restore (database, redis, files, full)"
    echo "  -f, --force         Force restore without confirmation"
    echo "  -d, --dry-run       Show what would be restored without doing it"
    echo "  -s, --s3            Download backup from S3 first"
    echo "  -l, --list          List available backups"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 hackathon_backup_20241201_120000_database.sql.gz"
    echo "  $0 --type database --force backup.sql.gz"
    echo "  $0 --s3 --type full s3://bucket/backup.tar.gz"
}

# List available backups
list_backups() {
    log_info "Available backups in $BACKUP_DIR:"
    echo ""
    
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "hackathon_backup_*" -type f | sort -r | while read -r backup; do
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1-2)
            echo "  $filename ($size, $date)"
        done
    else
        echo "  No backup directory found: $BACKUP_DIR"
    fi
    
    if [[ -n "$AWS_BUCKET" ]]; then
        echo ""
        log_info "Available S3 backups:"
        aws s3 ls "s3://$AWS_BUCKET/backups/" --recursive --human-readable | tail -20
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip not found. Please install gzip tools."
        exit 1
    fi
    
    log_success "Dependencies check passed"
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

# Download backup from S3
download_from_s3() {
    local s3_path="$1"
    local local_file="$BACKUP_DIR/$(basename "$s3_path")"
    
    log_info "Downloading backup from S3..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Cannot download from S3."
        exit 1
    fi
    
    mkdir -p "$BACKUP_DIR"
    
    if aws s3 cp "$s3_path" "$local_file"; then
        log_success "Downloaded: $local_file"
        echo "$local_file"
    else
        log_error "Failed to download from S3"
        exit 1
    fi
}

# Validate backup file
validate_backup() {
    local backup_file="$1"
    local backup_type="$2"
    
    log_info "Validating backup file..."
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Check file type based on extension
    case "$backup_file" in
        *.sql.gz)
            if gunzip -t "$backup_file" 2>/dev/null; then
                log_success "SQL backup file is valid"
            else
                log_error "Invalid or corrupted SQL backup file"
                exit 1
            fi
            ;;
        *.tar.gz)
            if tar -tzf "$backup_file" >/dev/null 2>&1; then
                log_success "Archive backup file is valid"
            else
                log_error "Invalid or corrupted archive backup file"
                exit 1
            fi
            ;;
        *.sql)
            if [[ -r "$backup_file" ]]; then
                log_success "SQL backup file is readable"
            else
                log_error "Cannot read SQL backup file"
                exit 1
            fi
            ;;
        *)
            log_warning "Unknown backup file format, proceeding anyway"
            ;;
    esac
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_info "Creating pre-restore backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_backup="$BACKUP_DIR/pre_restore_$timestamp.sql.gz"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --clean --if-exists --format=plain | gzip > "$pre_backup"; then
        log_success "Pre-restore backup created: $pre_backup"
        echo "$pre_backup"
    else
        log_error "Failed to create pre-restore backup"
        return 1
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    local dry_run="$2"
    
    log_info "Restoring database from $backup_file..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would restore database from: $backup_file"
        return 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Stop application services first
    log_info "Stopping application services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" stop backend frontend || true
    
    # Restore database
    if [[ "$backup_file" == *.gz ]]; then
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q; then
            log_success "Database restored successfully"
        else
            log_error "Database restore failed"
            return 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q -f "$backup_file"; then
            log_success "Database restored successfully"
        else
            log_error "Database restore failed"
            return 1
        fi
    fi
    
    # Restart application services
    log_info "Starting application services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" start backend frontend || true
}

# Restore Redis
restore_redis() {
    local backup_file="$1"
    local dry_run="$2"
    
    log_info "Restoring Redis from $backup_file..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would restore Redis from: $backup_file"
        return 0
    fi
    
    # Extract Redis backup
    local temp_dir="/tmp/redis_restore_$$"
    mkdir -p "$temp_dir"
    
    if tar -xzf "$backup_file" -C "$temp_dir"; then
        # Stop Redis service
        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" stop redis
        
        # Copy dump.rdb to Redis container
        if docker cp "$temp_dir/dump.rdb" hackathon_redis:/data/dump.rdb; then
            # Start Redis service
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" start redis
            log_success "Redis restored successfully"
        else
            log_error "Redis restore failed"
            rm -rf "$temp_dir"
            return 1
        fi
        
        rm -rf "$temp_dir"
    else
        log_error "Failed to extract Redis backup"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Restore files
restore_files() {
    local backup_file="$1"
    local dry_run="$2"
    
    log_info "Restoring files from $backup_file..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would restore files from: $backup_file"
        log_info "[DRY RUN] Files in backup:"
        tar -tzf "$backup_file" | head -20
        return 0
    fi
    
    # Create backup of current files
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local current_backup="$BACKUP_DIR/current_files_$timestamp.tar.gz"
    
    log_info "Backing up current files..."
    tar -czf "$current_backup" -C "$PROJECT_ROOT" \
        src/database logs uploads .env docker-compose.production.yml 2>/dev/null || true
    
    # Restore files
    if tar -xzf "$backup_file" -C "$PROJECT_ROOT"; then
        log_success "Files restored successfully"
        log_info "Current files backed up to: $current_backup"
    else
        log_error "Files restore failed"
        return 1
    fi
}

# Confirm restore operation
confirm_restore() {
    local backup_file="$1"
    local restore_type="$2"
    local force="$3"
    
    if [[ "$force" == "true" ]]; then
        return 0
    fi
    
    echo ""
    log_warning "WARNING: This will restore $restore_type from $backup_file"
    log_warning "Current data will be replaced!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

# Main restore function
main() {
    local backup_file=""
    local restore_type="database"
    local force="false"
    local dry_run="false"
    local from_s3="false"
    local list_only="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                restore_type="$2"
                shift 2
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            -d|--dry-run)
                dry_run="true"
                shift
                ;;
            -s|--s3)
                from_s3="true"
                shift
                ;;
            -l|--list)
                list_only="true"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                if [[ -z "$backup_file" ]]; then
                    backup_file="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Handle list option
    if [[ "$list_only" == "true" ]]; then
        list_backups
        exit 0
    fi
    
    # Validate arguments
    if [[ -z "$backup_file" ]]; then
        log_error "No backup file specified"
        show_usage
        exit 1
    fi
    
    # Download from S3 if needed
    if [[ "$from_s3" == "true" ]]; then
        backup_file=$(download_from_s3 "$backup_file")
    elif [[ "$backup_file" != /* ]]; then
        # Relative path, make it absolute
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    log_info "Starting restore process..."
    log_info "Backup file: $backup_file"
    log_info "Restore type: $restore_type"
    log_info "Dry run: $dry_run"
    
    check_dependencies
    validate_backup "$backup_file" "$restore_type"
    
    if [[ "$dry_run" != "true" ]]; then
        test_db_connection
        confirm_restore "$backup_file" "$restore_type" "$force"
        
        # Create pre-restore backup for database operations
        if [[ "$restore_type" == "database" || "$restore_type" == "full" ]]; then
            pre_backup=$(create_pre_restore_backup)
        fi
    fi
    
    # Perform restore based on type
    case "$restore_type" in
        "database"|"db")
            restore_database "$backup_file" "$dry_run"
            ;;
        "redis")
            restore_redis "$backup_file" "$dry_run"
            ;;
        "files")
            restore_files "$backup_file" "$dry_run"
            ;;
        "full")
            # For full restore, determine file type
            if [[ "$backup_file" == *_database.sql* ]]; then
                restore_database "$backup_file" "$dry_run"
            elif [[ "$backup_file" == *_redis.tar.gz ]]; then
                restore_redis "$backup_file" "$dry_run"
            elif [[ "$backup_file" == *_files.tar.gz ]]; then
                restore_files "$backup_file" "$dry_run"
            else
                log_warning "Cannot determine backup type, attempting database restore"
                restore_database "$backup_file" "$dry_run"
            fi
            ;;
        *)
            log_error "Unknown restore type: $restore_type"
            show_usage
            exit 1
            ;;
    esac
    
    if [[ "$dry_run" == "true" ]]; then
        log_success "Dry run completed successfully"
    else
        log_success "Restore completed successfully!"
        
        if [[ -n "$pre_backup" ]]; then
            log_info "Pre-restore backup saved: $pre_backup"
        fi
        
        # Send notification
        if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
            curl -s -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ Database restore completed: $backup_file\"}" \
                "$SLACK_WEBHOOK_URL" > /dev/null
        fi
    fi
}

# Handle script interruption
trap 'log_error "Restore interrupted"; exit 1' INT TERM

# Run main function
main "$@"