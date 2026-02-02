# Implementation Plan: Issue #84 - Fix Timeout Option

## Overview
The `--timeout` CLI option is properly defined and parsed but never actually used in the `PlaywrightFetcher` class. This implementation will add timeout functionality to prevent hanging on slow websites.

## Affected Files
- `link-crawler/src/crawler/fetcher.ts` - Main implementation file
- `link-crawler/tests/unit/fetcher.test.ts` - New test file (to be created)

## Implementation Steps

### 1. Modify fetcher.ts
Add timeout handling using `Promise.race()` pattern:
- Wrap the playwright-cli command execution in a Promise
- Create a timeout Promise that rejects after `config.timeout` milliseconds
- Use `Promise.race()` to compete between fetch and timeout
- On timeout, clean up resources (close playwright session)
- Return appropriate error message on timeout

### 2. Create fetcher.test.ts
Add unit tests for:
- Successful fetch (mock playwright-cli)
- Timeout behavior (using short timeout)
- Error handling
- Resource cleanup on timeout

## Technical Details

### Timeout Implementation Pattern
```typescript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Request timeout after ${this.config.timeout}ms`)), this.config.timeout);
});

await Promise.race([
  this.executeFetch(url),
  timeoutPromise
]);
```

### Error Handling
- On timeout: Log "✗ Fetch Error: Request timeout after Xms - {url}"
- Ensure playwright session is cleaned up even on timeout

## Testing Strategy
1. Unit tests with mocked playwright-cli
2. Test timeout scenario with very short timeout value
3. Test that resources are cleaned up after timeout
4. Run existing tests to ensure no regressions

## Risk and Mitigation
- **Risk**: Timeout might fire during legitimate long requests
  - **Mitigation**: Default 30s is reasonable; users can adjust via CLI
- **Risk**: Resource leak if timeout fires during playwright operation
  - **Mitigation**: Ensure close() is called in finally block

## Completion Criteria
- [ ] Timeout is implemented in fetcher.ts
- [ ] Timeout error message is clear and informative
- [ ] Resources are cleaned up on timeout
- [ ] Unit tests are added
- [ ] All tests pass
