#!/usr/bin/env bash
# Cleanup script for development artifacts (primarily .worktrees)
set -euo pipefail

# Configuration
RETENTION_DAYS=30
DRY_RUN=true
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Help message
show_help() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Clean up development artifacts (worktrees and optional pi-runner logs)

Options:
    -h, --help          Show this help message
    -d, --days DAYS     Retention period in days (default: 30)
    -f, --force         Actually delete files (default: dry-run)
    -v, --verbose       Verbose output
    --dry-run           Dry-run mode (default)

Examples:
    # See what would be deleted (dry-run)
    $(basename "$0")

    # Check for stale worktrees
    $(basename "$0") --verbose

    # Clean up old logs (if .improve-logs exists)
    $(basename "$0") --days 7 --force
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--days)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -f|--force)
            DRY_RUN=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${NC}[VERBOSE]${NC} $*"
    fi
}

# Cleanup .improve-logs (if exists)
# Note: This directory is created by pi-runner but is not commonly used
cleanup_improve_logs() {
    if [[ ! -d ".improve-logs" ]]; then
        log_verbose ".improve-logs/ directory does not exist (no action needed)"
        return 0
    fi

    log_verbose "Checking .improve-logs/ (retention: ${RETENTION_DAYS} days)..."

    local file_count=0
    local total_size=0

    while IFS= read -r -d '' file; do
        ((file_count++))
        local size
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
        ((total_size+=size))
        
        log_verbose "  - $file"
        
        if [[ "$DRY_RUN" == "false" ]]; then
            rm -f "$file"
        fi
    done < <(find .improve-logs/ -type f -mtime +"${RETENTION_DAYS}" -print0 2>/dev/null) || true

    if [[ $file_count -gt 0 ]]; then
        local size_human
        size_human=$(numfmt --to=iec-i --suffix=B "$total_size" 2>/dev/null || echo "${total_size}B")
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "Would delete ${file_count} files (${size_human}) from .improve-logs/"
        else
            log_info "Deleted ${file_count} files (${size_human}) from .improve-logs/"
        fi
    fi
}

# Cleanup old worktrees
cleanup_worktrees() {
    log_info "Checking for stale worktrees..."
    
    if [[ ! -d ".worktrees" ]]; then
        log_verbose ".worktrees/ directory does not exist"
        return 0
    fi

    # First, prune any worktrees that git already knows are gone
    log_verbose "Running git worktree prune..."
    if [[ "$DRY_RUN" == "false" ]]; then
        git worktree prune
    fi

    # Get list of merged branches (excluding main)
    local merged_branches=()
    while IFS= read -r branch; do
        merged_branches+=("$branch")
    done < <(git branch --merged main | grep -v '^\*' | grep -v 'main' | sed 's/^[[:space:]]*//')

    if [[ ${#merged_branches[@]} -eq 0 ]]; then
        log_info "No merged branches found"
        return 0
    fi

    log_verbose "Found ${#merged_branches[@]} merged branches"

    # Check active worktrees
    local active_worktrees=()
    while IFS= read -r worktree; do
        active_worktrees+=("$worktree")
    done < <(git worktree list --porcelain | grep '^worktree' | cut -d' ' -f2-)

    local cleanup_count=0
    for branch in "${merged_branches[@]}"; do
        # Check if this branch has an active worktree
        local has_worktree=false
        for wt in "${active_worktrees[@]}"; do
            if [[ "$wt" =~ $branch ]]; then
                has_worktree=true
                break
            fi
        done

        if [[ "$has_worktree" == "true" ]]; then
            ((cleanup_count++))
            log_warn "Merged branch with active worktree: $branch"
            if [[ "$DRY_RUN" == "true" ]]; then
                log_verbose "  Would suggest: git worktree remove .worktrees/$(basename "$branch")"
                log_verbose "  Would suggest: git branch -d $branch"
            fi
        fi
    done

    if [[ $cleanup_count -eq 0 ]]; then
        log_info "No stale worktrees found"
    else
        log_warn "Found $cleanup_count merged branches with worktrees"
        log_warn "Review and manually clean up with: git worktree remove <path>"
    fi
}

# Main execution
main() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Print mode
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "=== DRY-RUN MODE (no files will be deleted) ==="
        log_warn "Use --force to actually delete files"
        echo
    else
        log_warn "=== FORCE MODE (files will be deleted) ==="
        echo
    fi

    # Run cleanup functions
    cleanup_improve_logs
    echo
    cleanup_worktrees

    # Summary
    echo
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry-run complete. Use --force to actually delete files."
    else
        log_info "Cleanup complete."
    fi
}

# Run main
main
