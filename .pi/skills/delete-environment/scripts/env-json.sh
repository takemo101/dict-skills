#!/bin/bash
set -euo pipefail

# Environment JSON Management Script
# Manages environments.json file for tracking development environments

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ENV_FILE="${REPO_ROOT}/environments.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Initialize environments.json if it doesn't exist
init_json() {
    if [ ! -f "$ENV_FILE" ]; then
        echo '{"environments": []}' > "$ENV_FILE"
        log_info "Created new environments.json"
    fi
}

# Add a new environment
add_env() {
    local env_id="$1"
    local env_path="${2:-}"
    local branch="${3:-}"
    
    init_json
    
    # Check if environment already exists
    if jq -e ".environments[] | select(.id == \"$env_id\")" "$ENV_FILE" > /dev/null 2>&1; then
        log_warn "Environment '$env_id' already exists. Updating..."
        # Remove existing entry
        remove_env "$env_id" > /dev/null 2>&1 || true
    fi
    
    # Add new environment
    local new_env
    new_env=$(jq -n \
        --arg id "$env_id" \
        --arg path "$env_path" \
        --arg branch "$branch" \
        --arg created_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{id: $id, path: $path, branch: $branch, created_at: $created_at}')
    
    jq ".environments += [$new_env]" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    log_info "Added environment: $env_id"
}

# Remove an environment
remove_env() {
    local env_id="$1"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "environments.json not found"
        return 0
    fi
    
    # Check if environment exists
    if ! jq -e ".environments[] | select(.id == \"$env_id\")" "$ENV_FILE" > /dev/null 2>&1; then
        log_warn "Environment '$env_id' not found in environments.json"
        return 0
    fi
    
    # Remove environment
    jq "del(.environments[] | select(.id == \"$env_id\"))" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    log_info "Removed environment: $env_id"
}

# List all environments
list_envs() {
    if [ ! -f "$ENV_FILE" ]; then
        echo '{"environments": []}'
        return 0
    fi
    
    cat "$ENV_FILE"
}

# Get environment by ID
get_env() {
    local env_id="$1"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo "null"
        return 0
    fi
    
    jq ".environments[] | select(.id == \"$env_id\")" "$ENV_FILE"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 <command> [args]

Commands:
    add <id> [path] [branch]    Add a new environment
    remove <id>                 Remove an environment
    list                        List all environments
    get <id>                    Get environment by ID
    init                        Initialize environments.json

Examples:
    $0 add abc-123 .worktrees/abc-123 feature-branch
    $0 remove abc-123
    $0 list
    $0 get abc-123
EOF
}

# Main
if [ $# -lt 1 ]; then
    usage
    exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
    add)
        if [ $# -lt 1 ]; then
            log_error "Environment ID is required"
            usage
            exit 1
        fi
        add_env "$@"
        ;;
    remove)
        if [ $# -lt 1 ]; then
            log_error "Environment ID is required"
            usage
            exit 1
        fi
        remove_env "$1"
        ;;
    list)
        list_envs
        ;;
    get)
        if [ $# -lt 1 ]; then
            log_error "Environment ID is required"
            usage
            exit 1
        fi
        get_env "$1"
        ;;
    init)
        init_json
        ;;
    help|--help|-h)
        usage
        exit 0
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac
