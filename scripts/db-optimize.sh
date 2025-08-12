#!/bin/bash

# CS Club Hackathon Platform - Database Optimization Script
# Phase 6.2: Production database performance optimization

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  analyze         Analyze database performance"
    echo "  optimize        Run optimization tasks"
    echo "  vacuum          Vacuum and analyze tables"
    echo "  reindex         Rebuild indexes"
    echo "  stats           Show database statistics"
    echo "  health          Check database health"
    echo "  slow-queries    Show slow queries"
    echo ""
    echo "Options:"
    echo "  -v, --verbose   Verbose output"
    echo "  -f, --force     Force operations without confirmation"
    echo "  -d, --dry-run   Show what would be done without doing it"
    echo "  -h, --help      Show this help message"
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

# Execute SQL query
execute_sql() {
    local query="$1"
    local verbose="$2"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if [[ "$verbose" == "true" ]]; then
        echo "Executing: $query"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$query"
}

# Get database size
get_database_size() {
    execute_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;"
}

# Show table sizes
show_table_sizes() {
    log_info "Table sizes:"
    execute_sql "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
    FROM pg_tables 
    WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# Show index usage statistics
show_index_usage() {
    log_info "Index usage statistics:"
    execute_sql "
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as times_used,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_tup_read,
        idx_tup_fetch
    FROM pg_stat_user_indexes 
    ORDER BY idx_scan DESC;
    "
}

# Show unused indexes
show_unused_indexes() {
    log_info "Unused indexes (potential candidates for removal):"
    execute_sql "
    SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes 
    WHERE idx_scan = 0
    AND indexrelid NOT IN (
        SELECT indexrelid FROM pg_constraint WHERE contype IN ('p', 'u')
    )
    ORDER BY pg_relation_size(indexrelid) DESC;
    "
}

# Show slow queries
show_slow_queries() {
    log_info "Slow queries (requires pg_stat_statements extension):"
    
    # Check if pg_stat_statements is available
    local has_extension=$(execute_sql "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';" -t | tr -d ' ')
    
    if [[ "$has_extension" == "1" ]]; then
        execute_sql "
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows,
            100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT 10;
        "
    else
        log_warning "pg_stat_statements extension not installed"
    fi
}

# Show database connections
show_connections() {
    log_info "Current database connections:"
    execute_sql "
    SELECT 
        datname,
        usename,
        application_name,
        client_addr,
        state,
        query_start,
        state_change
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME'
    ORDER BY query_start DESC;
    "
}

# Show lock information
show_locks() {
    log_info "Current locks:"
    execute_sql "
    SELECT 
        pl.locktype,
        pl.mode,
        pl.granted,
        pl.pid,
        pa.usename,
        pa.query
    FROM pg_locks pl
    LEFT JOIN pg_stat_activity pa ON pl.pid = pa.pid
    WHERE pa.datname = '$DB_NAME'
    ORDER BY pl.granted, pl.pid;
    "
}

# Analyze database performance
analyze_performance() {
    local verbose="$1"
    
    log_info "Analyzing database performance..."
    
    echo "Database Size:"
    get_database_size
    echo ""
    
    show_table_sizes
    echo ""
    
    show_index_usage
    echo ""
    
    show_unused_indexes
    echo ""
    
    show_slow_queries
    echo ""
    
    show_connections
    echo ""
    
    # Check for missing indexes on foreign keys
    log_info "Foreign keys without indexes:"
    execute_sql "
    SELECT 
        c.conrelid::regclass AS table_name,
        c.confrelid::regclass AS referenced_table,
        array_to_string(c.conkey, ',') AS fk_columns
    FROM pg_constraint c
    LEFT JOIN pg_index i ON c.conrelid = i.indrelid 
        AND array_to_string(c.conkey, ',') = array_to_string(i.indkey, ',')
    WHERE c.contype = 'f' 
        AND i.indexrelid IS NULL;
    "
}

# Vacuum and analyze tables
vacuum_analyze() {
    local dry_run="$1"
    local verbose="$2"
    local force="$3"
    
    log_info "Vacuuming and analyzing tables..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would run VACUUM ANALYZE on all tables"
        return 0
    fi
    
    if [[ "$force" != "true" ]]; then
        echo ""
        log_warning "This will run VACUUM ANALYZE on all tables"
        read -p "Continue? (yes/no): " confirmation
        
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Operation cancelled by user"
            return 0
        fi
    fi
    
    # Get list of tables
    local tables=$(execute_sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" -t)
    
    for table in $tables; do
        table=$(echo "$table" | tr -d ' ')
        if [[ -n "$table" ]]; then
            log_info "Vacuuming table: $table"
            if [[ "$verbose" == "true" ]]; then
                execute_sql "VACUUM (VERBOSE, ANALYZE) $table;" "$verbose"
            else
                execute_sql "VACUUM ANALYZE $table;"
            fi
        fi
    done
    
    log_success "Vacuum analyze completed"
}

# Reindex database
reindex_database() {
    local dry_run="$1"
    local verbose="$2"
    local force="$3"
    
    log_info "Reindexing database..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would run REINDEX DATABASE"
        return 0
    fi
    
    if [[ "$force" != "true" ]]; then
        echo ""
        log_warning "This will rebuild all indexes in the database"
        log_warning "This may take a long time and impact performance"
        read -p "Continue? (yes/no): " confirmation
        
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Operation cancelled by user"
            return 0
        fi
    fi
    
    log_info "Starting reindex operation..."
    if [[ "$verbose" == "true" ]]; then
        execute_sql "REINDEX DATABASE $DB_NAME;" "$verbose"
    else
        execute_sql "REINDEX DATABASE $DB_NAME;"
    fi
    
    log_success "Reindex completed"
}

# Update table statistics
update_statistics() {
    local dry_run="$1"
    local verbose="$2"
    
    log_info "Updating table statistics..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would run ANALYZE on all tables"
        return 0
    fi
    
    if [[ "$verbose" == "true" ]]; then
        execute_sql "ANALYZE VERBOSE;" "$verbose"
    else
        execute_sql "ANALYZE;"
    fi
    
    log_success "Statistics updated"
}

# Check database health
check_health() {
    log_info "Checking database health..."
    
    # Check database connectivity
    test_db_connection
    
    # Check database size growth
    log_info "Database size:"
    get_database_size
    
    # Check for long-running transactions
    log_info "Long-running transactions (>1 hour):"
    execute_sql "
    SELECT 
        pid,
        usename,
        state,
        query_start,
        now() - query_start as duration,
        query
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME'
        AND state != 'idle'
        AND query_start < now() - interval '1 hour'
    ORDER BY query_start;
    "
    
    # Check for idle in transaction
    log_info "Idle in transaction connections:"
    execute_sql "
    SELECT 
        pid,
        usename,
        state_change,
        now() - state_change as idle_time
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME'
        AND state = 'idle in transaction'
    ORDER BY state_change;
    "
    
    # Check for bloat
    log_info "Table bloat estimation:"
    execute_sql "
    SELECT 
        schemaname,
        tablename,
        n_dead_tup,
        n_live_tup,
        ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) as bloat_percent
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000
    ORDER BY bloat_percent DESC NULLS LAST;
    "
    
    log_success "Health check completed"
}

# Run optimization tasks
run_optimization() {
    local dry_run="$1"
    local verbose="$2"
    local force="$3"
    
    log_info "Running database optimization tasks..."
    
    # Update statistics
    update_statistics "$dry_run" "$verbose"
    
    # Vacuum analyze tables
    vacuum_analyze "$dry_run" "$verbose" "$force"
    
    # Optional: Create missing indexes for foreign keys
    if [[ "$dry_run" != "true" && "$force" == "true" ]]; then
        log_info "Creating missing foreign key indexes..."
        execute_sql "
        DO \$\$
        DECLARE
            r RECORD;
            index_name TEXT;
        BEGIN
            FOR r IN
                SELECT 
                    c.conrelid::regclass AS table_name,
                    array_to_string(c.conkey, '_') AS fk_columns,
                    c.conkey
                FROM pg_constraint c
                LEFT JOIN pg_index i ON c.conrelid = i.indrelid 
                    AND array_to_string(c.conkey, ',') = array_to_string(i.indkey, ',')
                WHERE c.contype = 'f' 
                    AND i.indexrelid IS NULL
            LOOP
                index_name := 'idx_fk_' || r.table_name || '_' || r.fk_columns;
                EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I (%s)',
                    index_name,
                    r.table_name,
                    (SELECT string_agg(attname, ', ')
                     FROM pg_attribute
                     WHERE attrelid = r.table_name::regclass
                       AND attnum = ANY(r.conkey))
                );
                RAISE NOTICE 'Created index: %', index_name;
            END LOOP;
        END
        \$\$;
        "
    fi
    
    log_success "Optimization completed"
}

# Main function
main() {
    local command=""
    local verbose="false"
    local force="false"
    local dry_run="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                verbose="true"
                shift
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            -d|--dry-run)
                dry_run="true"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            analyze|optimize|vacuum|reindex|stats|health|slow-queries)
                command="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$command" ]]; then
        log_error "No command specified"
        show_usage
        exit 1
    fi
    
    log_info "Database optimization tool"
    log_info "Command: $command"
    log_info "Database: $DB_NAME"
    
    test_db_connection
    
    case "$command" in
        "analyze")
            analyze_performance "$verbose"
            ;;
        "optimize")
            run_optimization "$dry_run" "$verbose" "$force"
            ;;
        "vacuum")
            vacuum_analyze "$dry_run" "$verbose" "$force"
            ;;
        "reindex")
            reindex_database "$dry_run" "$verbose" "$force"
            ;;
        "stats")
            update_statistics "$dry_run" "$verbose"
            ;;
        "health")
            check_health
            ;;
        "slow-queries")
            show_slow_queries
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "Operation completed"
}

# Handle script interruption
trap 'log_error "Operation interrupted"; exit 1' INT TERM

# Run main function
main "$@"