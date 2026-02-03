#!/bin/bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ENV_JSON_FILE="${REPO_ROOT}/environments.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Update environments.json by removing the specified environment ID
update_environments_json() {
    local env_id="$1"
    local json_file="$ENV_JSON_FILE"
    
    if [ ! -f "$json_file" ]; then
        log_warn "environments.json not found at $json_file. Skipping JSON update."
        return 0
    fi
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        # Use jq to remove the environment entry
        local temp_file="${json_file}.tmp"
        if jq --arg id "$env_id" 'del(.[$id])' "$json_file" > "$temp_file" 2>/dev/null; then
            mv "$temp_file" "$json_file"
            log_info "Removed environment '$env_id' from environments.json"
        else
            log_warn "Failed to update environments.json with jq."
            rm -f "$temp_file"
        fi
    else
        # Fallback: simple grep-based removal (basic implementation)
        log_warn "jq not found. Attempting basic JSON update..."
        
        # Create a backup
        cp "$json_file" "${json_file}.bak"
        
        # Remove lines containing the environment ID (naive approach for simple JSON)
        if grep -q "\"$env_id\"" "$json_file"; then
            # Try to remove the entry - this is a basic implementation
            # For complex JSON, jq is strongly recommended
            local temp_file="${json_file}.tmp"
            
            # Remove the key-value pair for this env_id
            # This is a simplified approach that works for flat JSON structures
            if python3 -c "
import json
import sys
try:
    with open('$json_file', 'r') as f:
        data = json.load(f)
    if '$env_id' in data:
        del data['$env_id']
        with open('$json_file', 'w') as f:
            json.dump(data, f, indent=2)
        sys.exit(0)
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; then
                log_info "Removed environment '$env_id' from environments.json"
            else
                log_warn "Could not update environments.json. Manual update may be required."
                mv "${json_file}.bak" "$json_file"
            fi
        else
            log_info "Environment '$env_id' not found in environments.json"
        fi
        
        rm -f "${json_file}.bak"
    fi
}

if [ $# -lt 1 ]; then
    echo "Usage: $0 <env-id> [path-to-delete]"
    echo "Example: $0 abc-123 .worktrees/abc-123"
    exit 1
fi

ENV_ID="$1"
TARGET_DIR="${2:-}"

if [ -z "$ENV_ID" ]; then
    log_error "Environment ID is required."
    exit 1
fi

log_info "Starting deletion for environment: $ENV_ID"

log_info "Updating environments.json..."
update_environments_json "$ENV_ID"

log_info "Cleaning up Docker resources..."

if [ -n "$TARGET_DIR" ] && [ -d "$TARGET_DIR" ] && [ -f "$TARGET_DIR/docker-compose.yml" ]; then
    log_info "Running docker compose down in $TARGET_DIR..."
    (cd "$TARGET_DIR" && docker compose down -v 2>/dev/null) || true
fi

CONTAINERS=$(docker ps -aq --filter "name=${ENV_ID}")
if [ -n "$CONTAINERS" ]; then
    log_info "Force removing containers matching '${ENV_ID}'..."
    echo "$CONTAINERS" | xargs docker rm -f >/dev/null
else
    log_info "No lingering containers found for '${ENV_ID}'."
fi

if [ -n "$TARGET_DIR" ]; then
    if [ -d "$TARGET_DIR" ]; then
        log_info "Removing directory: $TARGET_DIR"
        
        if git worktree list | grep -q "$TARGET_DIR"; then
            log_info "Detected git worktree. Removing with git worktree remove..."
            git worktree remove --force "$TARGET_DIR"
        else
            rm -rf "$TARGET_DIR"
        fi
        log_info "Directory removed."
    else
        log_warn "Directory not found: $TARGET_DIR"
    fi
else
    log_info "No directory specified to delete. Skipping filesystem cleanup."
fi

log_info "Deletion complete for $ENV_ID"
