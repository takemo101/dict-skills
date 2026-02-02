import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractMetadata, extractContent } from "../../src/parser/extractor.js";

describe("extractMetadata", () => {
	it("should extract title from document", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Page Title</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Page Title");
	});

	it("should extract description from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="Page description here">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("Page description here");
	});

	it("should extract Open Graph description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta property="og:description" content="OG description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("OG description");
	});

	it("should prefer meta description over OG description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="Meta description">
					<meta property="og:description" content="OG description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("Meta description");
	});

	it("should extract keywords", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="keywords" content="keyword1, keyword2, keyword3">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.keywords).toBe("keyword1, keyword2, keyword3");
	});

	it("should extract author", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="author" content="John Doe">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.author).toBe("John Doe");
	});

	it("should extract Open Graph title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta property="og:title" content="OG Title">
					<title>Regular Title</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Regular Title");
		expect(metadata.ogTitle).toBe("OG Title");
	});

	it("should extract Open Graph type", () => {
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
		const metadata = extractMetadata(dom);

		expect(metadata.ogType).toBe("article");
	});

	it("should return null for missing metadata", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBeNull();
		expect(metadata.description).toBeNull();
		expect(metadata.keywords).toBeNull();
		expect(metadata.author).toBeNull();
		expect(metadata.ogTitle).toBeNull();
		expect(metadata.ogType).toBeNull();
	});

	it("should trim whitespace from title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>  Title With Spaces  </title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title With Spaces");
	});
});

describe("extractContent", () => {
	it("should extract content using Readability", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Test Article</title></head>
				<body>
					<article>
						<h1>Article Title</h1>
						<p>This is the main content of the article.</p>
						<p>It has multiple paragraphs.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");

		expect(result.title).toBeTruthy();
		expect(result.content).toBeTruthy();
		expect(result.content).toContain("main content");
	});

	it("should fallback when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Empty Page</title></head>
				<body>
					<div class="content">
						<p>Fallback content here.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		// Should have some content from fallback
		expect(result.content).toBeTruthy();
	});

	it("should remove script tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Scripts</title></head>
				<body>
					<script>alert('test');</script>
					<div class="content">
						<p>Actual content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).not.toContain("alert");
		expect(result.content).not.toContain("<script>");
	});

	it("should remove style tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Styles</title></head>
				<body>
					<style>.red { color: red; }</style>
					<div class="content">
						<p>Actual content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).not.toContain(".red");
		expect(result.content).not.toContain("<style>");
	});

	it("should remove noscript tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Noscript</title></head>
				<body>
					<noscript>Please enable JavaScript</noscript>
					<div class="content">
						<p>Actual content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).not.toContain("noscript");
		expect(result.content).not.toContain("Please enable JavaScript");
	});

	it("should extract content with navigation elements", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Nav</title></head>
				<body>
					<nav>Navigation links</nav>
					<div class="content">
						<p>Actual content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		// Readability processes the content - it may or may not include nav
		expect(result.content).toBeTruthy();
		expect(result.content).toContain("content");
	});

	it("should extract content with header elements", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Header</title></head>
				<body>
					<header>Site Header</header>
					<div class="content">
						<p>Actual content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		// Readability processes the content - it may or may not include header
		expect(result.content).toBeTruthy();
		expect(result.content).toContain("content");
	});

	it("should remove footer tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Footer</title></head>
				<body>
					<div class="content">
						<p>Actual content.</p>
					</div>
					<footer>Site Footer</footer>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).not.toContain("Site Footer");
	});

	it("should prefer main tag in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Main</title></head>
				<body>
					<div>Other content</div>
					<main>Main content here</main>
					<div>More other content</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toContain("Main content here");
	});

	it("should use article tag as fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Article</title></head>
				<body>
					<article>Article content here</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toContain("Article content here");
	});

	it("should use [role='main'] as fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Role Main</title></head>
				<body>
					<div role="main">Main role content</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toContain("Main role content");
	});

	it("should use .content class as fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Content Class</title></head>
				<body>
					<div class="content">Content class content</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toContain("Content class content");
	});

	it("should use #content id as fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>Page with Content ID</title></head>
				<body>
					<div id="content">Content ID content</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toContain("Content ID content");
	});

	it("should handle empty HTML", () => {
		const result = extractContent("", "https://example.com");

		expect(result.content).toBeNull();
	});

	it("should handle HTML without body", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head><title>No Body</title></head>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		// Should return null or handle gracefully
		expect(result).toBeDefined();
	});
});
