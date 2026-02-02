# Issue #201 Implementation Plan

## Summary
Add unit tests for `logger.ts` and `post-processor.ts` to improve test coverage from ~86-89% to 95%+.

## Affected Files
- `tests/unit/logger.test.ts` (new)
- `tests/unit/post-processor.test.ts` (new)

## Implementation Steps

### 1. Create logger.test.ts
Test the `CrawlLogger` class:
- `logStart()` - Verify all config values are logged correctly
- `logSkipped()` - Verify skip count increments
- `logComplete()` - Verify behavior in both diff and non-diff modes
- `getSkippedCount()` - Verify correct count is returned

### 2. Create post-processor.test.ts
Test the `PostProcessor` class:
- Empty pages handling - Verify early return when no pages
- `--no-merge` flag - Verify Merger is skipped when merge=false
- `--no-chunks` flag - Verify Chunker is skipped when chunks=false
- Page content loading - Test both from disk and from memory

## Test Strategy
- Use Vitest for testing framework
- Mock console.log/error to verify output
- Mock file system operations for isolation
- Mock dependencies (Merger, Chunker, CrawlLogger)
- Test edge cases (empty arrays, missing files, etc.)

## Risks and Mitigations
- **Risk**: File system dependencies may cause flaky tests
  - **Mitigation**: Use in-memory mocks and temp directories
- **Risk**: Console output testing may be brittle
  - **Mitigation**: Use vi.fn() mocks and verify call arguments

## Completion Criteria
- [ ] `tests/unit/logger.test.ts` created
- [ ] `tests/unit/post-processor.test.ts` created
- [ ] Coverage for logger.ts >= 95%
- [ ] Coverage for post-processor.ts >= 95%
- [ ] All tests pass
