# 002: Issue #854 is Duplicate of #848 (2026-02-08)

## Context
Issue #854 requested refactoring `generateMarkerId()` in `link-crawler/src/parser/extractor.ts` to remove non-deterministic values (`Date.now()` and `Math.random()`).

## Discovery
During implementation planning for Issue #854, we discovered this work was already completed:
- **Original Issue**: #848
- **PR**: #850 (Merged)
- **Commit**: `0021d3b` - "refactor: generateMarkerId を決定的IDに変更"

## Current State
The function is now deterministic, using only the `index` parameter:

```typescript
function generateMarkerId(index: number): string {
    return `CODEBLOCK_${index}`;
}
```

## Verification
- All 114 tests in `extractor.test.ts` pass
- Implementation matches Issue #854's requirements exactly

## Decision
Close Issue #854 as duplicate with reference to Issue #848 / PR #850.

## References
- Issue #848
- PR #850
- Commit `0021d3b`
