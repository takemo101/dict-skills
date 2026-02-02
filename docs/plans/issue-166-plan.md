# Issue #166 Implementation Plan

## Summary

Fix the code block removal issue when crawling documentation sites. The `@mozilla/readability` library removes custom code block components (Syntax Highlighter, etc.) because they're not recognized as main content. This implementation will protect code blocks before Readability processing and restore them afterward.

## Affected Files

- `link-crawler/src/parser/extractor.ts` - Add code block protection/restoration logic
- `link-crawler/src/parser/converter.ts` - Add custom rules for syntax highlighter elements
- `link-crawler/tests/unit/parser/extractor.test.ts` - Add tests for code block preservation

## Implementation Steps

### Step 1: Modify extractor.ts

Add code block protection mechanism:

1. **Define code block selectors** (to detect various code block formats):
   - `pre`, `code` - Standard HTML code blocks
   - `[data-language]` - Data attribute based language markers
   - `[data-rehype-pretty-code-fragment]` - Next.js docs specific
   - `.code-block`, `.highlight` - Common CSS class names
   - `.hljs`, `.prism-code`, `.shiki` - Syntax highlighter libraries

2. **Pre-processing (before Readability)**:
   - Find all code block elements using the selectors
   - Replace each element with a marker comment like `<!--CODE_BLOCK_0-->`
   - Store the original HTML in a map with the marker as key

3. **Run Readability** on the modified document

4. **Post-processing (after Readability)**:
   - Find all marker comments in the result
   - Replace each marker with the original code block HTML

5. **Enhance fallback mode**:
   - Also preserve code blocks in the fallback extraction path

### Step 2: Modify converter.ts

Add Turndown rules for proper Markdown conversion:

1. **Add rule for syntax highlighter divs**:
   - Detect elements with `data-rehype-pretty-code-fragment`, `hljs`, `prism-code`, `shiki` classes
   - Extract language from `data-language` attribute or class names
   - Convert to fenced code blocks with language specifier

2. **Enhance existing pre/code handling**:
   - Ensure proper language detection from various attribute formats
   - Handle nested code structures (div > pre > code)

### Step 3: Add Tests

Add comprehensive tests in `extractor.test.ts`:

1. Test for standard `<pre><code>` blocks
2. Test for data-attribute based code blocks
3. Test for Next.js docs style (`data-rehype-pretty-code-fragment`)
4. Test for syntax highlighter classes (hljs, prism, shiki)
5. Test mixed content (article with code blocks)
6. Test fallback mode code preservation

## Testing Strategy

1. **Unit tests** - Test individual functions with mock HTML
2. **Integration test** - Test actual Next.js docs page (optional, may be in separate test)
3. **Edge cases**:
   - Empty code blocks
   - Code blocks without language specified
   - Multiple code blocks in one article
   - Nested code elements

## Risk and Mitigation

| Risk | Mitigation |
|------|------------|
| Performance impact from DOM manipulation | Use efficient selectors, minimize DOM queries |
| False positives in code block detection | Use specific selectors, verify element content |
| Readability still removes some code blocks | Implement fallback restoration from original HTML |
| Complex nested structures not handled | Test with real-world documentation sites |

## Expected Result

After implementation, crawling Next.js documentation should preserve code blocks:

```markdown
# Getting Started

To create a new Next.js app, run:

```bash
npx create-next-app@latest
```

Then create a layout:

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```
```

## Dependencies

No new dependencies required. Uses existing:
- `@mozilla/readability`
- `jsdom`
- `turndown`
- `turndown-plugin-gfm`
