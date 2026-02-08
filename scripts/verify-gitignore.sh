#!/usr/bin/env bash
# Verification script for Issue #920
# Verifies that .improve-logs/ and .worktrees/ are properly ignored

set -uo pipefail

echo "=== Verification for Issue #920 ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for checks
PASSED=0
FAILED=0

# Function to check and report
check() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    echo "Checking: $description"
    
    if eval "$command" > /dev/null 2>&1; then
        if [ "$expected" = "empty" ]; then
            echo -e "${GREEN}✓ PASS${NC}: No tracked files found"
            ((PASSED++))
        else
            echo -e "${GREEN}✓ PASS${NC}: Files are properly ignored"
            ((PASSED++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC}: $description"
        ((FAILED++))
    fi
    echo ""
}

# Check 1: .improve-logs/ not tracked
echo "1. Checking .improve-logs/ tracking status..."
RESULT=$(git ls-files .improve-logs/ 2>/dev/null || true)
if [ -z "$RESULT" ]; then
    echo -e "${GREEN}✓ PASS${NC}: .improve-logs/ is not tracked"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: .improve-logs/ contains tracked files:"
    echo "$RESULT"
    ((FAILED++))
fi
echo ""

# Check 2: .worktrees/.status/ not tracked
echo "2. Checking .worktrees/.status/ tracking status..."
RESULT=$(git ls-files .worktrees/.status/ 2>/dev/null || true)
if [ -z "$RESULT" ]; then
    echo -e "${GREEN}✓ PASS${NC}: .worktrees/.status/ is not tracked"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: .worktrees/.status/ contains tracked files:"
    echo "$RESULT"
    ((FAILED++))
fi
echo ""

# Check 3: .worktrees/.context/ not tracked
echo "3. Checking .worktrees/.context/ tracking status..."
RESULT=$(git ls-files .worktrees/.context/ 2>/dev/null || true)
if [ -z "$RESULT" ]; then
    echo -e "${GREEN}✓ PASS${NC}: .worktrees/.context/ is not tracked"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: .worktrees/.context/ contains tracked files:"
    echo "$RESULT"
    ((FAILED++))
fi
echo ""

# Check 4: .gitignore contains proper entries
echo "4. Checking .gitignore configuration..."
if grep -q "^\.improve-logs/" .gitignore && grep -q "^\.worktrees/" .gitignore; then
    echo -e "${GREEN}✓ PASS${NC}: .gitignore contains required entries"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: .gitignore missing required entries"
    ((FAILED++))
fi
echo ""

# Check 5: Files are actually ignored (if they exist)
echo "5. Checking if files are properly ignored..."
if [ -d ".improve-logs" ] || [ -d ".worktrees" ]; then
    IGNORED=$(git status --ignored --short 2>/dev/null | grep -E "^!! (\.improve-logs/|\.worktrees/)" || true)
    if [ -n "$IGNORED" ]; then
        echo -e "${GREEN}✓ PASS${NC}: Files are properly ignored by git"
        echo "Ignored entries:"
        echo "$IGNORED"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ WARNING${NC}: Directories exist but not shown as ignored"
        echo "(This may be normal if directories are empty)"
    fi
else
    echo -e "${YELLOW}⚠ INFO${NC}: Directories do not exist locally"
fi
echo ""

# Summary
echo "==================================="
echo "Summary:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo "==================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo "Issue #920 completion criteria are met:"
    echo "  ✓ git ls-files .improve-logs/ is empty"
    echo "  ✓ git ls-files .worktrees/.status/ is empty"
    echo "  ✓ git ls-files .worktrees/.context/ is empty"
    echo "  ✓ .gitignore settings are working correctly"
    exit 0
else
    echo -e "${RED}Some checks failed.${NC}"
    exit 1
fi
