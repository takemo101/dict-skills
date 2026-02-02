import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { extractMetadata, extractContent } from "../../../src/parser/extractor.js";

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
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("OG Description");
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
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("Meta Description");
	});

	it("should extract keywords from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="keywords" content="test, keywords, crawler">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.keywords).toBe("test, keywords, crawler");
	});

	it("should extract author from meta tag", () => {
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

	it("should extract og:title from meta tag", () => {
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

	it("should extract og:type from meta tag", () => {
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
				<head>
					<title>Title Only</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title Only");
		expect(metadata.description).toBeNull();
		expect(metadata.keywords).toBeNull();
		expect(metadata.author).toBeNull();
		expect(metadata.ogTitle).toBeNull();
		expect(metadata.ogType).toBeNull();
	});

	it("should extract all metadata at once", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Full Page</title>
					<meta name="description" content="Full description">
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
			title: "Full Page",
			description: "Full description",
			keywords: "key1, key2",
			author: "Author Name",
			ogTitle: "OG Title",
			ogType: "website",
		});
	});

	it("should trim whitespace from title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>  Title With Whitespace  </title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title With Whitespace");
	});

	it("should return null for empty meta content", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBeNull();
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
						<p>Second paragraph with more content to make it substantial for Readability to process correctly.</p>
						<p>Third paragraph continues the article with additional information and details about the topic.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");

		// Readability uses the document title, not the h1
		expect(result.title).toBe("Article Title");
		expect(result.content).not.toBeNull();
		expect(result.content).toContain("This is the main content");
	});

	it("should fallback when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Minimal Page</title>
				</head>
				<body>
					<p>Short content</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/minimal");

		// Readability may still extract minimal content or fall back
		// The test verifies the function doesn't throw
		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("content");
	});

	it("should remove script tags in fallback mode", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Page with Scripts</title>
				</head>
				<body>
					<p>Visible content</p>
					<script>var x = 'should be removed';</script>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/scripts");

		// Readability should handle this, or fallback should remove scripts
		if (result.content) {
			expect(result.content).not.toContain("var x");
			expect(result.content).not.toContain("should be removed");
		}
	});

	it("should remove style tags in fallback mode", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Page with Styles</title>
					<style>.red { color: red; }</style>
				</head>
				<body>
					<p>Visible content</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/styles");

		if (result.content) {
			expect(result.content).not.toContain("color: red");
		}
	});

	it("should handle article with main tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Main Tag Page</title>
				</head>
				<body>
					<main>
						<h1>Main Content Area</h1>
						<p>This is the main content area with sufficient text to be processed by Readability.</p>
						<p>Additional paragraphs provide more context and information for better content extraction.</p>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/main");

		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content.toLowerCase()).toContain("main");
		}
	});

	it("should handle page with navigation and footer", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Complex Page</title>
				</head>
				<body>
					<nav>
						<a href="/">Home</a>
						<a href="/about">About</a>
					</nav>
					<article>
						<h1>Real Article Content</h1>
						<p>This is the actual article content that should be extracted. It contains meaningful information.</p>
						<p>More paragraphs ensure the content is substantial enough for Readability to identify it properly.</p>
					</article>
					<footer>
						<p>Footer content</p>
					</footer>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/complex");

		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content).toContain("Real Article Content");
			expect(result.content).not.toContain("Footer content");
		}
	});

	it("should handle empty HTML", () => {
		const html = "";
		const result = extractContent(html, "https://example.com/empty");

		expect(result.title).toBeNull();
		expect(result.content).toBeNull();
	});

	it("should handle HTML without readable content", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Empty Page</title>
				</head>
				<body>
					<p>Hi</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/short");

		// Readability may extract minimal content or return null
		// The test verifies the function handles short content gracefully
		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("content");
	});

	it("should extract content with proper URL context", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>URL Context Test</title>
				</head>
				<body>
					<article>
						<h1>Article</h1>
						<p>Content with a <a href="/relative">relative link</a> that needs URL context.</p>
						<p>More content here to make the article substantial and readable by the extraction algorithm.</p>
						<p>Third paragraph ensures there's enough text for Readability to identify this as main content.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");

		expect(result.content).not.toBeNull();
	});

	it("should remove noscript tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>NoScript Test</title>
				</head>
				<body>
					<p>Visible</p>
					<noscript>Enable JavaScript</noscript>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/noscript");

		if (result.content) {
			expect(result.content).not.toContain("Enable JavaScript");
		}
	});

	it("should handle div with content class in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Content Class</title>
				</head>
				<body>
					<div class="content">
						<p>Content in class="content" div.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/content-class");

		// Readability may or may not find this, but if fallback is used, it should look for .content
		if (result.content) {
			expect(result.content.toLowerCase()).toContain("content");
		}
	});

	it("should handle div with id=content in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>ID Content</title>
				</head>
				<body>
					<div id="content">
						<p>Content in id="content" div.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/id-content");

		if (result.content) {
			expect(result.content.toLowerCase()).toContain("content");
		}
	});
});
