#!/bin/bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ENV_JSON_SCRIPT="${REPO_ROOT}/.opencode/skill/environments-json-management/scripts/env-json.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

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

if [ -f "$ENV_JSON_SCRIPT" ]; then
    log_info "Updating environments.json..."
    bash "$ENV_JSON_SCRIPT" remove "$ENV_ID"
else
    log_warn "env-json.sh not found at $ENV_JSON_SCRIPT. Skipping JSON update."
fi

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
