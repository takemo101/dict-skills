# Issue #581: Unreachable Code in extractor.ts

## Summary

Investigation into improving branch coverage for `src/parser/extractor.ts` from 73% to 85%+ revealed **unreachable code** in the current implementation, making the target coverage impossible without refactoring.

## Current Coverage

- **Statements**: 85.07%
- **Branches**: 73.07% (target: 85%+)
- **Functions**: 87.5%
- **Lines**: 86.36%
- **Uncovered lines**: 48, 56-57, 62, 126-130, 142-146

## Findings

### 1. Unreachable Code in `protectCodeBlocks` (lines 48, 56-57, 62)

**Problem**: The function adds `placeholder` elements to `processedElements`, not the original elements.

```typescript
// Line 48: Check if element is already processed
if (processedElements.has(el)) {  // Never true - we only add placeholders
    continue;
}

// Lines 55-62: Check if parent is already processed  
if (processedElements.has(parent)) {  // Never true - parent is original element
    shouldSkip = true;
    break;
}
if (shouldSkip) {
    continue;  // Unreachable
}
```

**Root cause**: After `el.replaceWith(placeholder)`, we add `placeholder` to `processedElements`. When checking nested elements, `el.parentElement` returns the original parent element (not the placeholder), so `processedElements.has(parent)` always returns false.

### 2. Unreachable Code in `extractAndPreserveCodeBlocks` (lines 126-130, 142-146)

**Problem**: The function receives a document that has already been modified by `protectCodeBlocks`.

```typescript
export function extractContent(dom: JSDOM) {
    const codeBlockMap = protectCodeBlocks(dom.window.document);  // Replaces code blocks with placeholders
    
    const reader = new Readability(dom.window.document.cloneNode(true));
    const article = reader.parse();
    
    if (article?.content) {
        const restoredContent = restoreCodeBlocks(article.content, codeBlockMap);
        return { title: article.title ?? null, content: restoredContent };
    }
    
    // Fallback receives already-modified document!
    return extractAndPreserveCodeBlocks(dom.window.document);  // Code blocks already gone
}
```

**Result**: Lines 126-130 attempt to collect code blocks, but they've already been replaced with placeholders. Lines 142-146 check for code block patterns and prepend collected blocks, but `codeBlocks` is always empty.

## Impact

- Maximum achievable branch coverage: **73.07%** (current)
- Target coverage of 85%+ is **impossible** without code refactoring
- The unreachable code suggests potential bugs or incomplete implementation from previous refactoring (PR #545, commit 9d44782)

## Recommendations

### Option 1: Fix the Implementation (Preferred)

**For `protectCodeBlocks`**:
- Store original elements in `processedElements` instead of placeholders
- Or maintain a separate map of placeholder → original element relationships

**For `extractAndPreserveCodeBlocks`**:
- Accept HTML string or create fresh JSDOM instance instead of modified document
- Or rename function to clarify it doesn't collect code blocks (they're already protected)

### Option 2: Remove Dead Code

If the unreachable branches serve no purpose:
- Remove lines 48-50, 55-62 from `protectCodeBlocks`
- Simplify or remove `extractAndPreserveCodeBlocks` code block collection logic
- This would improve coverage metrics by removing impossible-to-cover code

### Option 3: Document as Known Limitation

- Update Issue #581 to note the 73% ceiling
- Close as "partially complete"
- Create new issue for implementation fixes

## Next Steps

1. **Immediate**: Close Issue #581 with findings documented
2. **Short-term**: Create new issue to fix implementation
3. **Medium-term**: Refactor code block protection logic
4. **Long-term**: Add integration tests that verify the full flow

## Related

- Issue #523: Previous work on fallback extraction
- PR #545: Refactoring that may have introduced this issue
- Commit 9d44782: "eliminate unnecessary JSDOM re-generation"

## Testing Notes

Extensive test cases were added to attempt coverage improvement:
- Nested code blocks with same selectors
- Fallback extraction paths
- Multiple code block selector types

All tests pass, but coverage remains at 73.07% due to unreachable code.
