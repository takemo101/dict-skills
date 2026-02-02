import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractMetadata, extractContent } from "../../src/parser/extractor.js";

describe("extractMetadata", () => {
	describe("title extraction", () => {
		it("should extract title from title tag", () => {
			const html = "<html><head><title>Test Page Title</title></head><body></body></html>";
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.title).toBe("Test Page Title");
		});

		it("should return null when title is missing", () => {
			const html = "<html><head></head><body></body></html>";
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.title).toBeNull();
		});

		it("should trim whitespace from title", () => {
			const html = "<html><head><title>  Title With Spaces  </title></head><body></body></html>";
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.title).toBe("Title With Spaces");
		});
	});

	describe("description extraction", () => {
		it("should extract description from meta name", () => {
			const html = '<html><head><meta name="description" content="Page description"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.description).toBe("Page description");
		});

		it("should extract description from meta property (OpenGraph)", () => {
			const html = '<html><head><meta property="og:description" content="OG Description"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.description).toBe("OG Description");
		});

		it("should prefer meta name over og:description", () => {
			const html = `
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

		it("should return null when description is missing", () => {
			const html = "<html><head></head><body></body></html>";
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.description).toBeNull();
		});
	});

	describe("OpenGraph tags extraction", () => {
		it("should extract og:title", () => {
			const html = '<html><head><meta property="og:title" content="OG Title"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.ogTitle).toBe("OG Title");
		});

		it("should extract og:type", () => {
			const html = '<html><head><meta property="og:type" content="article"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.ogType).toBe("article");
		});
	});

	describe("other metadata extraction", () => {
		it("should extract keywords", () => {
			const html = '<html><head><meta name="keywords" content="test, keywords, example"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.keywords).toBe("test, keywords, example");
		});

		it("should extract author", () => {
			const html = '<html><head><meta name="author" content="John Doe"></head><body></body></html>';
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);
			expect(result.author).toBe("John Doe");
		});
	});

	describe("complete metadata extraction", () => {
		it("should extract all metadata from a complete HTML document", () => {
			const html = `
				<html>
					<head>
						<title>Complete Page</title>
						<meta name="description" content="A description">
						<meta name="keywords" content="key1, key2">
						<meta name="author" content="Author Name">
						<meta property="og:title" content="OG Title">
						<meta property="og:description" content="OG Description">
						<meta property="og:type" content="website">
					</head>
					<body></body>
				</html>
			`;
			const dom = new JSDOM(html);
			const result = extractMetadata(dom);

			expect(result.title).toBe("Complete Page");
			expect(result.description).toBe("A description");
			expect(result.keywords).toBe("key1, key2");
			expect(result.author).toBe("Author Name");
			expect(result.ogTitle).toBe("OG Title");
			expect(result.ogType).toBe("website");
		});
	});
});

describe("extractContent", () => {
	describe("successful Readability extraction", () => {
		it("should extract title and content from a well-formed article", () => {
			const html = `
				<html>
					<head><title>Article Title</title></head>
					<body>
						<article>
							<h1>Main Heading</h1>
							<p>This is the main content of the article.</p>
							<p>This is another paragraph.</p>
						</article>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Readability returns the document title when article title is not detected
			expect(result.title).not.toBeNull();
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("This is the main content");
		});

		it("should extract content from article with multiple paragraphs", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<article>
							<p>First paragraph with enough text to be considered readable content.</p>
							<p>Second paragraph with more text to make it substantial.</p>
							<p>Third paragraph continues the article content here.</p>
						</article>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
		});
	});

	describe("fallback extraction", () => {
		it("should fallback to main tag when Readability fails", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<main>
							<p>Fallback content in main tag.</p>
						</main>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Fallback content");
		});

		it("should fallback to article tag when Readability fails", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<article>
							<p>Fallback content in article tag.</p>
						</article>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Fallback content");
		});

		it("should fallback to role=main element when Readability fails", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<div role="main">
							<p>Fallback content in role=main element.</p>
						</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Fallback content");
		});

		it("should fallback to .content class when Readability fails", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<div class="content">
							<p>Fallback content in .content class.</p>
						</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Fallback content");
		});

		it("should fallback to #content id when Readability fails", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<div id="content">
							<p>Fallback content in #content element.</p>
						</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Fallback content");
		});

		it("should fallback to body when no specific container found", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<p>Content in body.</p>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Content in body");
		});

		it("should return title from Readability when it succeeds", () => {
			const html = `
				<html>
					<head><title>Page Title</title></head>
					<body>
						<div class="content">
							<p>This is substantial content that should be readable by Readability.</p>
							<p>More content here to make it substantial enough for Readability to process.</p>
							<p>Even more content to ensure Readability can extract the article properly.</p>
						</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Readability succeeds and returns the document title
			expect(result.title).toBe("Page Title");
			expect(result.content).not.toBeNull();
		});
	});

	describe("removal of unwanted elements", () => {
		it("should remove script tags in fallback mode", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<script>alert('test');</script>
						<div class="content">Visible content.</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toContain("script");
			expect(result.content).not.toContain("alert");
		});

		it("should remove style tags in fallback mode", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<style>.test { color: red; }</style>
						<div class="content">Visible content.</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toContain("style");
			expect(result.content).not.toContain("color: red");
		});

		it("should remove noscript tags in fallback mode", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<noscript>Enable JavaScript</noscript>
						<div class="content">Visible content.</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toContain("noscript");
			expect(result.content).not.toContain("Enable JavaScript");
		});

		it("should remove nav tags when Readability extracts content", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<nav>Navigation</nav>
						<article>
							<p>This is the main article content that Readability should extract.</p>
							<p>More content here to make it substantial.</p>
						</article>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Readability removes nav elements during extraction
			expect(result.content).not.toContain("Navigation");
		});

		it("should remove header tags when Readability extracts content", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<header>Site Header</header>
						<article>
							<p>This is the main article content that Readability should extract.</p>
							<p>More content here to make it substantial.</p>
						</article>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Readability removes header elements during extraction
			expect(result.content).not.toContain("Site Header");
		});

		it("should remove footer tags in fallback mode", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<div class="content">Visible content.</div>
						<footer>Site Footer</footer>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toContain("<footer>");
			expect(result.content).not.toContain("Site Footer");
		});

		it("should remove aside tags in fallback mode", () => {
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<aside>Sidebar content</aside>
						<div class="content">Visible content.</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).not.toContain("<aside>");
			expect(result.content).not.toContain("Sidebar content");
		});
	});

	describe("fallback when Readability fails", () => {
		it("should use fallback extraction when Readability returns no content", () => {
			// Minimal HTML without substantial content that Readability can extract
			const html = `
				<html>
					<head><title>Empty Page</title></head>
					<body>
						<div class="content">Content here</div>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Readability may or may not extract content depending on the HTML
			// but we should at least have content
			expect(result.content).not.toBeNull();
		});

		it("should trigger fallback with content in semantic containers", () => {
			// Use a simple body-only structure to test fallback path
			const html = `
				<html>
					<head><title>Test</title></head>
					<body>
						<script>console.log('test');</script>
						<main>
							<p>Main content</p>
						</main>
						<footer>Footer text</footer>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			// Verify we got content back
			expect(result.content).not.toBeNull();
			expect(result.content).toContain("Main content");
		});

		it("should return body content when no specific container found in fallback", () => {
			const html = `
				<html>
					<head><title>Simple Page</title></head>
					<body>
						<p>Simple content without semantic markup</p>
					</body>
				</html>
			`;
			const result = extractContent(html, "https://example.com");
			expect(result.content).toContain("Simple content");
		});
	});
});
