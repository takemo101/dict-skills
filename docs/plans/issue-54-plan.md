# Issue #54 Implementation Plan

## Summary
Fix incorrect relative link paths in `docs/link-crawler/README.md`.

## Issue Analysis

### Current State
The `docs/link-crawler/README.md` file contains 4 incorrect relative links:

1. `[設計書](../docs/link-crawler/design.md)` → should be `./design.md`
2. `[CLI仕様](../docs/link-crawler/cli-spec.md)` → should be `./cli-spec.md`
3. `[開発ガイド](../docs/link-crawler/development.md)` → should be `./development.md`
4. `[SKILL.md](./SKILL.md)` → should be `../../link-crawler/SKILL.md`

### File Structure
```
docs/link-crawler/
├── README.md          # File being fixed
├── design.md          # Same directory → ./design.md
├── cli-spec.md        # Same directory → ./cli-spec.md
├── development.md     # Same directory → ./development.md
└── issues.md

link-crawler/
├── SKILL.md           # Located here, not in docs/ → ../../link-crawler/SKILL.md
```

## Implementation Steps

1. **Verify file existence** - Confirm all target files exist
2. **Edit README.md** - Fix all 4 link paths
3. **Verify fix** - Check links point to existing files

## Testing Plan

- Verify all 4 links point to existing files
- Test that GitHub will resolve the links correctly

## Risk Assessment

- **Risk**: None - simple documentation fix
- **Rollback**: Easy - revert the commit
