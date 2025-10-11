#!/bin/bash

# =====================================================
# PAYMENT BACKUP AUTOMATION SCRIPT
# =====================================================
# This script automates payment system backups

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/backup-$(date +%Y%m%d).log"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to console with colors
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR] $message${NC}" >&2
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [WARN] $message${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}[$timestamp] [INFO] $message${NC}"
            ;;
        "DEBUG")
            echo -e "${BLUE}[$timestamp] [DEBUG] $message${NC}"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log "ERROR" "Supabase CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl is not installed. Please install it first."
        exit 1
    fi
    
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        log "WARN" "jq is not installed. JSON processing will be limited."
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log "INFO" "Prerequisites check completed"
}

# Function to get Supabase project URL and key
get_supabase_config() {
    # Try to get from environment variables first
    if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_ANON_KEY" ]]; then
        log "INFO" "Using Supabase config from environment variables"
        return 0
    fi
    
    # Try to get from Supabase CLI config
    if [[ -f "$PROJECT_ROOT/supabase/config.toml" ]]; then
        log "INFO" "Found Supabase config file"
        # Note: In production, you'd parse the config file or use CLI commands
        # For now, we'll assume environment variables are set
    fi
    
    if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
        log "ERROR" "Supabase configuration not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
        exit 1
    fi
}

# Function to create backup
create_backup() {
    local backup_type=${1:-"full"}
    local format=${2:-"json"}
    local days_back=${3:-1}
    
    log "INFO" "Creating $backup_type backup in $format format (last $days_back days)"
    
    local date_from=$(date -d "$days_back days ago" -Iseconds)
    local date_to=$(date -Iseconds)
    local backup_file="$BACKUP_DIR/temba-backup-$backup_type-$(date +%Y%m%d_%H%M%S).$format"
    
    # Prepare backup request
    local backup_request=$(cat <<EOF
{
    "backup_type": "$backup_type",
    "date_from": "$date_from",
    "date_to": "$date_to",
    "format": "$format"
}
EOF
)
    
    log "DEBUG" "Backup request: $backup_request"
    
    # Call Supabase function
    local response=$(curl -s -X POST \
        "$SUPABASE_URL/functions/v1/payment-backup" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$backup_request")
    
    if [[ $? -ne 0 ]]; then
        log "ERROR" "Failed to call backup function"
        return 1
    fi
    
    # Check if response contains error
    if echo "$response" | grep -q '"success":false'; then
        local error_msg=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
        log "ERROR" "Backup failed: $error_msg"
        return 1
    fi
    
    # Save backup to file
    echo "$response" > "$backup_file"
    
    # Get backup info if jq is available
    if command -v jq &> /dev/null; then
        local backup_id=$(echo "$response" | jq -r '.backup_id // "unknown"')
        local record_count=$(echo "$response" | jq -r '.record_count // 0')
        local file_size=$(echo "$response" | jq -r '.file_size_bytes // 0')
        
        log "INFO" "Backup created successfully:"
        log "INFO" "  - Backup ID: $backup_id"
        log "INFO" "  - Records: $record_count"
        log "INFO" "  - Size: $(($file_size / 1024)) KB"
        log "INFO" "  - File: $backup_file"
    else
        log "INFO" "Backup saved to: $backup_file"
    fi
    
    return 0
}

# Function to verify backup
verify_backup() {
    local backup_file=$1
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    log "INFO" "Verifying backup: $backup_file"
    
    # Basic file checks
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    
    if [[ $file_size -eq 0 ]]; then
        log "ERROR" "Backup file is empty"
        return 1
    fi
    
    # Check if it's valid JSON (for JSON backups)
    if [[ "$backup_file" == *.json ]]; then
        if command -v jq &> /dev/null; then
            if ! jq empty "$backup_file" 2>/dev/null; then
                log "ERROR" "Backup file contains invalid JSON"
                return 1
            fi
            
            # Check for required fields
            local backup_id=$(jq -r '.metadata.backup_id // empty' "$backup_file")
            local record_count=$(jq -r '.metadata.record_count // 0' "$backup_file")
            
            if [[ -z "$backup_id" ]]; then
                log "WARN" "Backup file missing backup_id in metadata"
            fi
            
            log "INFO" "Backup verification passed:"
            log "INFO" "  - File size: $(($file_size / 1024)) KB"
            log "INFO" "  - Records: $record_count"
            log "INFO" "  - Backup ID: $backup_id"
        else
            log "WARN" "Cannot verify JSON structure without jq"
        fi
    fi
    
    log "INFO" "Backup verification completed"
    return 0
}

# Function to cleanup old backups
cleanup_old_backups() {
    local retention_days=${1:-30}
    
    log "INFO" "Cleaning up backups older than $retention_days days"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "INFO" "Backup directory doesn't exist, nothing to clean"
        return 0
    fi
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            rm "$file"
            deleted_count=$((deleted_count + 1))
            log "DEBUG" "Deleted old backup: $(basename "$file")"
        fi
    done < <(find "$BACKUP_DIR" -name "temba-backup-*" -type f -mtime +$retention_days -print0 2>/dev/null)
    
    log "INFO" "Cleanup completed: $deleted_count old backups deleted"
}

# Function to send backup notification
send_notification() {
    local status=$1
    local message=$2
    local webhook_url=${BACKUP_WEBHOOK_URL:-""}
    
    if [[ -z "$webhook_url" ]]; then
        log "DEBUG" "No webhook URL configured, skipping notification"
        return 0
    fi
    
    local payload=$(cat <<EOF
{
    "text": "Temba Backup $status",
    "attachments": [
        {
            "color": "$([[ "$status" == "SUCCESS" ]] && echo "good" || echo "danger")",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Time",
                    "value": "$(date)",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$webhook_url" > /dev/null
    
    log "DEBUG" "Notification sent to webhook"
}

# Function to run daily backup
run_daily_backup() {
    log "INFO" "Starting daily backup routine"
    
    local success=true
    local message=""
    
    # Create full backup for yesterday
    if create_backup "full" "json" 1; then
        message="Daily full backup completed successfully"
        log "INFO" "$message"
    else
        success=false
        message="Daily full backup failed"
        log "ERROR" "$message"
    fi
    
    # Create payments backup for last hour (more frequent)
    if create_backup "payments" "json" 0; then
        log "INFO" "Hourly payments backup completed"
    else
        success=false
        message="$message; Hourly payments backup failed"
        log "ERROR" "Hourly payments backup failed"
    fi
    
    # Cleanup old backups
    cleanup_old_backups 30
    
    # Send notification
    if [[ "$success" == true ]]; then
        send_notification "SUCCESS" "$message"
    else
        send_notification "FAILED" "$message"
    fi
    
    log "INFO" "Daily backup routine completed"
}

# Function to run weekly backup
run_weekly_backup() {
    log "INFO" "Starting weekly backup routine"
    
    # Create full backup for last week
    if create_backup "full" "json" 7; then
        log "INFO" "Weekly full backup completed successfully"
        send_notification "SUCCESS" "Weekly backup completed successfully"
    else
        log "ERROR" "Weekly full backup failed"
        send_notification "FAILED" "Weekly backup failed"
    fi
    
    # Cleanup old backups (longer retention for weekly)
    cleanup_old_backups 90
    
    log "INFO" "Weekly backup routine completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  daily           Run daily backup routine"
    echo "  weekly          Run weekly backup routine"
    echo "  backup TYPE     Create backup of specified type (payments|orders|tickets|full)"
    echo "  verify FILE     Verify backup file integrity"
    echo "  cleanup DAYS    Cleanup backups older than DAYS (default: 30)"
    echo "  help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_URL           Supabase project URL"
    echo "  SUPABASE_ANON_KEY      Supabase anonymous key"
    echo "  BACKUP_WEBHOOK_URL     Webhook URL for notifications (optional)"
    echo ""
    echo "Examples:"
    echo "  $0 daily                    # Run daily backup routine"
    echo "  $0 backup payments          # Create payments backup"
    echo "  $0 verify backup.json       # Verify backup file"
    echo "  $0 cleanup 7                # Delete backups older than 7 days"
}

# Main script logic
main() {
    local command=${1:-"help"}
    
    case $command in
        "daily")
            check_prerequisites
            get_supabase_config
            run_daily_backup
            ;;
        "weekly")
            check_prerequisites
            get_supabase_config
            run_weekly_backup
            ;;
        "backup")
            local backup_type=${2:-"full"}
            local format=${3:-"json"}
            local days=${4:-1}
            check_prerequisites
            get_supabase_config
            create_backup "$backup_type" "$format" "$days"
            ;;
        "verify")
            local backup_file=$2
            if [[ -z "$backup_file" ]]; then
                log "ERROR" "Backup file path required"
                show_usage
                exit 1
            fi
            verify_backup "$backup_file"
            ;;
        "cleanup")
            local retention_days=${2:-30}
            cleanup_old_backups "$retention_days"
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"


