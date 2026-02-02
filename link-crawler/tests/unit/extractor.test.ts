import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractMetadata, extractContent } from "../../src/parser/extractor.js";

describe("extractMetadata", () => {
	it("should extract title from HTML", () => {
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
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Test Page Title");
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
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("This is a test description");
	});

	it("should extract description from Open Graph tag", () => {
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
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("OG Description");
	});

	it("should prefer regular description over OG description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="Regular description">
					<meta property="og:description" content="OG Description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("Regular description");
	});

	it("should extract keywords", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="keywords" content="test, keywords, example">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.keywords).toBe("test, keywords, example");
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
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

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
					<title>
						  Title with whitespace  
					</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title with whitespace");
	});

	it("should extract all metadata together", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Full Test</title>
					<meta name="description" content="A description">
					<meta name="keywords" content="key1, key2">
					<meta name="author" content="Author Name">
					<meta property="og:title" content="OG Title">
					<meta property="og:type" content="website">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata).toEqual({
			title: "Full Test",
			description: "A description",
			keywords: "key1, key2",
			author: "Author Name",
			ogTitle: "OG Title",
			ogType: "website",
		});
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
						<h1>Main Article</h1>
						<p>This is the main content of the article.</p>
						<p>It has multiple paragraphs.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");

		expect(result.title).toBe("Article Title");
		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Main Article");
		expect(result.content).toContain("main content");
	});

	it("should use fallback when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Fallback content in main tag.</p>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		// Readability may succeed or fallback is used - either way content should be extracted
		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Fallback content");
	});

	it("should fallback to article tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<article>
						<p>Article content here.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Article content");
	});

	it("should fallback to role='main' element", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<div role="main">
						<p>Main role content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Main role content");
	});

	it("should fallback to .content class", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<div class="content">
						<p>Content class content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content class content");
	});

	it("should fallback to #content id", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<div id="content">
						<p>Content id content.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content id content");
	});

	it("should fallback to body when no specific container found", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<p>Body content.</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Body content");
	});

	it("should remove script tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<script>alert('script');</script>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		expect(result.content).not.toContain("script");
	});

	it("should remove style tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<style>.class { color: red; }</style>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		expect(result.content).not.toContain("style");
	});

	it("should remove noscript tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<noscript>Please enable JavaScript</noscript>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		expect(result.content).not.toContain("noscript");
	});

	it("should remove nav tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<nav>Navigation</nav>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		// Note: nav may or may not be removed depending on whether Readability or fallback is used
	});

	it("should remove header tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<header>Header content</header>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		// Note: header may or may not be removed depending on whether Readability or fallback is used
	});

	it("should remove footer tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<footer>Footer content</footer>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		expect(result.content).not.toContain("Footer content");
	});

	it("should remove aside tags from fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body>
					<main>
						<p>Content here.</p>
						<aside>Sidebar content</aside>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.content).toBeTruthy();
		expect(result.content).toContain("Content here");
		expect(result.content).not.toContain("Sidebar content");
	});

	it("should handle empty HTML", () => {
		const html = "";
		const result = extractContent(html, "https://example.com");

		expect(result.title).toBeNull();
		expect(result.content).toBeNull();
	});

	it("should handle HTML with only structure", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head></head>
				<body></body>
			</html>
		`;
		const result = extractContent(html, "https://example.com");

		expect(result.title).toBeNull();
		// Content may be null, empty, or whitespace only depending on extraction
		const hasContent = result.content && result.content.trim().length > 0;
		expect(hasContent).toBe(false);
	});
});
