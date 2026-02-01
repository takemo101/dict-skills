# Implementation Plan: Issue #43

## Overview
Add unit tests for `src/parser/` and `src/crawler/` modules to improve test coverage and reduce regression risks during refactoring.

## Affected Modules

### Parser Module (`src/parser/`)
1. `converter.ts` - HTML to Markdown conversion
2. `extractor.ts` - Metadata and content extraction
3. `links.ts` - Link extraction and normalization

### Crawler Module (`src/crawler/`)
1. `fetcher.ts` - Playwright-based fetcher (limited testability due to CLI dependency)
2. `index.ts` - Crawler engine (integration-level, may skip unit tests)

## Implementation Steps

### Step 1: Create `tests/unit/converter.test.ts`
Test cases for `htmlToMarkdown()`:
- Basic HTML to Markdown conversion (headings, paragraphs, lists)
- GFM support (tables, code blocks)
- Empty link removal
- Broken link cleanup
- Whitespace normalization
- Multiple newline handling

### Step 2: Create `tests/unit/extractor.test.ts`
Test cases for `extractMetadata()`:
- Extract title from document
- Extract description from meta tags
- Extract Open Graph metadata
- Handle missing metadata gracefully

Test cases for `extractContent()`:
- Readability-based content extraction
- Fallback extraction when Readability fails
- Title extraction from Readability
- Handling of script/style removal in fallback

### Step 3: Create `tests/unit/links.test.ts`
Test cases for `normalizeUrl()`:
- Normalize relative URLs
- Normalize absolute URLs
- Handle hash removal
- Return null for invalid URLs

Test cases for `isSameDomain()`:
- Same domain check
- Different domain check
- Subdomain handling
- Invalid URL handling

Test cases for `shouldCrawl()`:
- Already visited URLs
- Same domain filtering
- Include pattern matching
- Exclude pattern matching
- Binary file extension filtering

Test cases for `extractLinks()`:
- Extract links from HTML
- Filter out anchors and javascript URLs
- Normalize and deduplicate links
- Respect shouldCrawl rules

## Testing Strategy
- Use Vitest for testing framework
- Use JSDOM for DOM manipulation in tests
- Mock external dependencies where necessary
- Follow existing test patterns in the codebase

## Risks and Mitigations
1. **Turndown plugin dependency**: Tests may need to handle GFM plugin loading
   - Mitigation: Ensure proper module imports in test setup

2. **Readability extraction**: Results may vary based on HTML structure
   - Mitigation: Use well-formed test HTML documents

3. **JSDOM version differences**: Behavior may vary between versions
   - Mitigation: Pin jsdom version and document expected behavior

## Completion Criteria
- [ ] `tests/unit/converter.test.ts` created with comprehensive tests
- [ ] `tests/unit/extractor.test.ts` created with comprehensive tests
- [ ] `tests/unit/links.test.ts` created with comprehensive tests
- [ ] All existing tests pass
- [ ] All new tests pass
- [ ] Code coverage improved for parser modules
