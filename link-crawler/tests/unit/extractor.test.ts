import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractMetadata, extractContent } from "../../src/parser/extractor.js";

describe("extractMetadata", () => {
	it("should extract title from title tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Test Page Title</title>
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.title).toBe("Test Page Title");
	});

	it("should return null for missing title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head></head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.title).toBeNull();
	});

	it("should trim whitespace from title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>   Title With Spaces   </title>
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.title).toBe("Title With Spaces");
	});

	it("should extract description from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="description" content="This is a test description">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.description).toBe("This is a test description");
	});

	it("should extract description from og:description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta property="og:description" content="OG Description">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.description).toBe("OG Description");
	});

	it("should prefer meta description over og:description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="description" content="Meta Description">
				<meta property="og:description" content="OG Description">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.description).toBe("Meta Description");
	});

	it("should extract keywords", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="keywords" content="test, keywords, vitest">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.keywords).toBe("test, keywords, vitest");
	});

	it("should extract author", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="author" content="Test Author">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.author).toBe("Test Author");
	});

	it("should extract og:title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta property="og:title" content="OG Title">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.ogTitle).toBe("OG Title");
	});

	it("should extract og:type", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta property="og:type" content="article">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.ogType).toBe("article");
	});

	it("should return null for missing metadata", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Title Only</title>
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.title).toBe("Title Only");
		expect(result.description).toBeNull();
		expect(result.keywords).toBeNull();
		expect(result.author).toBeNull();
		expect(result.ogTitle).toBeNull();
		expect(result.ogType).toBeNull();
	});

	it("should extract all metadata at once", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Complete Page</title>
				<meta name="description" content="Full description">
				<meta name="keywords" content="test, metadata">
				<meta name="author" content="Test Author">
				<meta property="og:title" content="OG Title">
				<meta property="og:type" content="website">
			</head>
			<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const result = extractMetadata(dom);
		expect(result.title).toBe("Complete Page");
		expect(result.description).toBe("Full description");
		expect(result.keywords).toBe("test, metadata");
		expect(result.author).toBe("Test Author");
		expect(result.ogTitle).toBe("OG Title");
		expect(result.ogType).toBe("website");
	});
});

describe("extractContent", () => {
	it("should extract content using Readability", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Article Title</title>
			</head>
			<body>
				<article>
					<h1>Main Article Heading</h1>
					<p>This is the main content of the article. It has enough text to be considered readable content.</p>
					<p>More paragraphs here to ensure the content is substantial enough for Readability to parse.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");
		// Readability uses the HTML title, not the h1
		expect(result.title).toBe("Article Title");
		expect(result.content).not.toBeNull();
		expect(result.content).toContain("This is the main content");
	});

	it("should return title from Readability", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>HTML Title</title>
			</head>
			<body>
				<article>
					<h1>Article Title</h1>
					<p>Content here with enough text to make it readable and parseable by the Readability library.</p>
					<p>Additional content paragraph to ensure there is enough text for proper content extraction.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");
		// Readability uses the HTML title tag
		expect(result.title).toBe("HTML Title");
	});

	it("should fallback to main element when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<p>Content in main element.</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		// Should fallback to main element
		expect(result.content).not.toBeNull();
	});

	it("should fallback to article element when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<article>
					<p>Content in article element.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toBeNull();
	});

	it("should fallback to content class when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<div class="content">
					<p>Content in div with class content.</p>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toBeNull();
	});

	it("should fallback to body when no other elements found", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<p>Body content only.</p>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toBeNull();
	});

	it("should remove script tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<p>Content here.</p>
					<script>alert('should be removed');</script>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toContain("script");
		expect(result.content).not.toContain("alert");
	});

	it("should remove style tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<style>.hidden { display: none; }</style>
					<p>Content here.</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toContain("style");
		expect(result.content).not.toContain(".hidden");
	});

	it("should remove noscript tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<noscript>Enable JavaScript</noscript>
					<p>Content here.</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toContain("noscript");
	});

	it("should remove footer tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<p>Content here.</p>
					<footer>Site Footer</footer>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toContain("Site Footer");
	});

	it("should remove aside tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test</title></head>
			<body>
				<main>
					<p>Content here.</p>
					<aside>Sidebar content</aside>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		expect(result.content).not.toContain("Sidebar content");
	});

	it("should handle empty HTML", () => {
		const result = extractContent("", "https://example.com/page");
		expect(result.title).toBeNull();
		expect(result.content).toBeNull();
	});

	it("should handle HTML with only metadata", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Title Only</title></head>
			<body></body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");
		// Even with empty body, should try to extract something
		expect(result).toBeDefined();
	});

	it("should handle complex article structure", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Complex Article</title>
			</head>
			<body>
				<article>
					<header>
						<h1>The Main Title of the Article</h1>
						<p class="byline">By Test Author</p>
					</header>
					<div class="content">
						<p>This is the first paragraph of the article with enough text content to make it meaningful for readability extraction.</p>
						<p>This is the second paragraph with more content and details about the topic being discussed in this test article.</p>
						<p>This third paragraph ensures there is plenty of text content for the Readability algorithm to properly identify this as the main article content.</p>
					</div>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");
		expect(result.title).not.toBeNull();
		expect(result.content).not.toBeNull();
	});
});
