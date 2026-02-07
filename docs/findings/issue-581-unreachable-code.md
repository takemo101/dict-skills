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

---

## Resolution

**Date**: 2026-02-07  
**Status**: ✅ **RESOLVED**  
**Related Issue**: #650

### Changes Implemented

The unreachable code issues documented above have been completely resolved through comprehensive refactoring:

#### 1. `protectCodeBlocks` Refactoring

The function was completely rewritten to use a **3-phase approach**:

**Phase 1**: Collect all code block elements from all selectors
```typescript
const allElements: Element[] = [];
for (const selector of CODE_BLOCK_PRIORITY_SELECTORS) {
    const elements = Array.from(doc.querySelectorAll(selector));
    allElements.push(...elements);
}
```

**Phase 2**: Filter out nested elements using `contains()`
```typescript
const elementsToProcess: Element[] = [];
for (const el of allElements) {
    let isNested = false;
    for (const other of allElements) {
        if (other !== el && other.contains(el)) {
            isNested = true;
            break;
        }
    }
    if (!isNested) {
        elementsToProcess.push(el);
    }
}
```

**Phase 3**: Replace filtered elements with placeholders
```typescript
for (const el of elementsToProcess) {
    const markerId = generateMarkerId(index);
    const marker = `__CODEBLOCK_${markerId}__`;
    codeBlockMap.set(marker, el.outerHTML);
    
    const placeholder = doc.createElement("span");
    placeholder.setAttribute("data-codeblock-id", markerId);
    placeholder.setAttribute("data-codeblock-placeholder", "true");
    placeholder.textContent = marker;
    
    el.replaceWith(placeholder);
    index++;
}
```

**Key Improvements**:
- Uses `contains()` for accurate parent-child relationship detection
- Eliminates unreachable code by separating collection from modification
- All nested element detection logic is now reachable and testable

#### 2. Fallback Path Code Block Restoration

The fallback extraction now correctly restores code block markers:

```typescript
export function extractContent(dom: JSDOM) {
    const codeBlockMap = protectCodeBlocks(dom.window.document);
    
    const reader = new Readability(dom.window.document.cloneNode(true) as Document);
    const article = reader.parse();
    
    if (article?.content) {
        const restoredContent = restoreCodeBlocks(article.content, codeBlockMap);
        return { title: article.title ?? null, content: restoredContent };
    }
    
    // Fallback: extract + restore markers
    const fallback = extractFallbackContent(dom.window.document);
    if (fallback.content) {
        fallback.content = restoreCodeBlocks(fallback.content, codeBlockMap);
    }
    return fallback;
}
```

**Key Improvements**:
- `extractFallbackContent` renamed from `extractAndPreserveCodeBlocks`
- Fallback content now correctly restored via `restoreCodeBlocks`
- Code block preservation works consistently in both paths

### Final Coverage Results

```
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
extractor.ts     |  100.00 |   95.83  |  100.00 |  100.00 | 171
```

**Improvements**:
- Statements: 85.07% → **100.00%** (+14.93%)
- **Branches: 73.07% → 95.83% (+22.76%)** ✅ **Target Exceeded**
- Functions: 87.5% → **100.00%** (+12.5%)
- Lines: 86.36% → **100.00%** (+13.64%)

**Target Achievement**: 
- Original target: 85%+ branch coverage
- Achieved: **95.83%** (10.83% above target)

### Remaining Uncovered Code

Only **1 branch** remains uncovered (line 171):
- The `|| body` fallback in the selector query
- This represents a rare edge case where all content selectors fail
- The 95.83% coverage is considered excellent and sufficient

### Verification

All 109 extractor tests pass:
```bash
✓ tests/unit/extractor.test.ts (109 tests) 985ms
```

Test coverage includes:
- Nested code block handling (Issue #631)
- Multiple selector matching
- Fallback path code block restoration (Issue #622)
- All CODE_BLOCK_PRIORITY_SELECTORS
- Edge cases and error conditions

### Conclusion

The unreachable code issues have been **fully resolved**:
- ✅ No unreachable code in `protectCodeBlocks`
- ✅ Fallback path correctly handles code blocks
- ✅ Branch coverage exceeds 85% target (now 95.83%)
- ✅ All tests passing with comprehensive coverage

This issue is now **CLOSED** as resolved.
