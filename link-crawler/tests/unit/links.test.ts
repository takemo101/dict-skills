import { describe, it, expect } from "vitest";
import {
	normalizeUrl,
	isSameDomain,
	shouldCrawl,
	extractLinks,
} from "../../src/parser/links.js";
import type { CrawlConfig } from "../../src/types.js";

describe("normalizeUrl", () => {
	it("should normalize absolute URL", () => {
		const result = normalizeUrl("https://example.com/page", "https://example.com");
		expect(result).toBe("https://example.com/page");
	});

	it("should normalize relative URL", () => {
		const result = normalizeUrl("/page", "https://example.com");
		expect(result).toBe("https://example.com/page");
	});

	it("should normalize relative URL without leading slash", () => {
		const result = normalizeUrl("page", "https://example.com/docs");
		expect(result).toBe("https://example.com/page");
	});

	it("should remove hash from URL", () => {
		const result = normalizeUrl("https://example.com/page#section", "https://example.com");
		expect(result).toBe("https://example.com/page");
	});

	it("should return null for invalid URL", () => {
		const result = normalizeUrl("not-a-valid-url", "invalid-base");
		expect(result).toBeNull();
	});

	it("should handle URL with query parameters", () => {
		const result = normalizeUrl("/page?id=123", "https://example.com");
		expect(result).toBe("https://example.com/page?id=123");
	});
});

describe("isSameDomain", () => {
	it("should return true for same domain", () => {
		const result = isSameDomain("https://example.com/page", "https://example.com");
		expect(result).toBe(true);
	});

	it("should return true for same domain with different paths", () => {
		const result = isSameDomain("https://example.com/docs", "https://example.com/blog");
		expect(result).toBe(true);
	});

	it("should return false for different domain", () => {
		const result = isSameDomain("https://other.com/page", "https://example.com");
		expect(result).toBe(false);
	});

	it("should return false for subdomain", () => {
		const result = isSameDomain("https://sub.example.com/page", "https://example.com");
		expect(result).toBe(false);
	});

	it("should return false for invalid URL", () => {
		const result = isSameDomain("not-a-url", "https://example.com");
		expect(result).toBe(false);
	});
});

describe("shouldCrawl", () => {
	const createConfig = (overrides: Partial<CrawlConfig> = {}): CrawlConfig => ({
		startUrl: "https://example.com",
		maxDepth: 3,
		outputDir: "./output",
		sameDomain: true,
		includePattern: null,
		excludePattern: null,
		delay: 500,
		timeout: 30000,
		spaWait: 2000,
		headed: false,
		diff: false,
		pages: true,
		merge: true,
		chunks: true,
		...overrides,
	});

	it("should return false for visited URL", () => {
		const visited = new Set(["https://example.com/page"]);
		const config = createConfig();
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(false);
	});

	it("should return false for different domain when sameDomain is true", () => {
		const visited = new Set<string>();
		const config = createConfig({ sameDomain: true });
		const result = shouldCrawl("https://other.com/page", visited, config);
		expect(result).toBe(false);
	});

	it("should return true for different domain when sameDomain is false", () => {
		const visited = new Set<string>();
		const config = createConfig({ sameDomain: false });
		const result = shouldCrawl("https://other.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return true for same domain when sameDomain is true", () => {
		const visited = new Set<string>();
		const config = createConfig({ sameDomain: true });
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false when URL does not match includePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ includePattern: /\/docs\// });
		const result = shouldCrawl("https://example.com/blog", visited, config);
		expect(result).toBe(false);
	});

	it("should return true when URL matches includePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ includePattern: /\/docs\// });
		const result = shouldCrawl("https://example.com/docs/guide", visited, config);
		expect(result).toBe(true);
	});

	it("should return false when URL matches excludePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ excludePattern: /\.pdf$/ });
		const result = shouldCrawl("https://example.com/file.pdf", visited, config);
		expect(result).toBe(false);
	});

	it("should return true when URL does not match excludePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ excludePattern: /\.pdf$/ });
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false for PNG files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/image.png", visited, config)).toBe(false);
		expect(shouldCrawl("https://example.com/image.PNG", visited, config)).toBe(false);
	});

	it("should return false for JPEG files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/image.jpg", visited, config)).toBe(false);
		expect(shouldCrawl("https://example.com/image.jpeg", visited, config)).toBe(false);
	});

	it("should return false for PDF files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/doc.pdf", visited, config)).toBe(false);
	});

	it("should return false for other binary files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/archive.zip", visited, config)).toBe(false);
		expect(shouldCrawl("https://example.com/video.mp4", visited, config)).toBe(false);
		expect(shouldCrawl("https://example.com/font.woff2", visited, config)).toBe(false);
	});

	it("should return true for HTML-like URLs", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/page.html", visited, config)).toBe(true);
		expect(shouldCrawl("https://example.com/page", visited, config)).toBe(true);
		expect(shouldCrawl("https://example.com/page.htm", visited, config)).toBe(true);
	});

	it("should apply multiple filters in combination", () => {
		const visited = new Set<string>();
		const config = createConfig({
			sameDomain: true,
			includePattern: /\/docs\//,
			excludePattern: /draft/,
		});
		
		// Same domain, matches include, not excluded
		expect(shouldCrawl("https://example.com/docs/guide", visited, config)).toBe(true);
		
		// Same domain, doesn't match include
		expect(shouldCrawl("https://example.com/blog/post", visited, config)).toBe(false);
		
		// Same domain, matches include but excluded
		expect(shouldCrawl("https://example.com/docs/draft", visited, config)).toBe(false);
		
		// Different domain
		expect(shouldCrawl("https://other.com/docs/guide", visited, config)).toBe(false);
	});
});

describe("extractLinks", () => {
	const createConfig = (overrides: Partial<CrawlConfig> = {}): CrawlConfig => ({
		startUrl: "https://example.com",
		maxDepth: 3,
		outputDir: "./output",
		sameDomain: false,
		includePattern: null,
		excludePattern: null,
		delay: 500,
		timeout: 30000,
		spaWait: 2000,
		headed: false,
		diff: false,
		pages: true,
		merge: true,
		chunks: true,
		...overrides,
	});

	it("should extract absolute links", () => {
		const html = '<a href="https://example.com/page1">Link 1</a><a href="https://example.com/page2">Link 2</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page1", "https://example.com/page2"]);
	});

	it("should extract relative links", () => {
		const html = '<a href="/page1">Link 1</a><a href="page2">Link 2</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com/docs", visited, config);
		expect(result).toEqual(["https://example.com/page1", "https://example.com/page2"]);
	});

	it("should skip anchor links", () => {
		const html = '<a href="#section">Anchor</a><a href="/page">Page</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should skip javascript: links", () => {
		const html = '<a href="javascript:void(0)">JS</a><a href="/page">Page</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should skip mailto: links", () => {
		const html = '<a href="mailto:test@example.com">Email</a><a href="/page">Page</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should skip visited links", () => {
		const html = '<a href="/page1">Link 1</a><a href="/page2">Link 2</a>';
		const visited = new Set(["https://example.com/page1"]);
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page2"]);
	});

	it("should remove duplicate links", () => {
		const html = '<a href="/page">Link 1</a><a href="/page">Link 2</a><a href="/page">Link 3</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should apply shouldCrawl filters", () => {
		const html = '<a href="/page.png">Image</a><a href="/page.pdf">PDF</a><a href="/page.html">HTML</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page.html"]);
	});

	it("should apply sameDomain filter", () => {
		const html = '<a href="https://example.com/page">Local</a><a href="https://other.com/page">External</a>';
		const visited = new Set<string>();
		const config = createConfig({ sameDomain: true });
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should apply includePattern filter", () => {
		const html = '<a href="/docs/guide">Docs</a><a href="/blog/post">Blog</a>';
		const visited = new Set<string>();
		const config = createConfig({ includePattern: /\/docs\// });
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/docs/guide"]);
	});

	it("should handle empty HTML", () => {
		const html = "";
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual([]);
	});

	it("should handle HTML without links", () => {
		const html = "<p>No links here</p>";
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual([]);
	});

	it("should normalize URLs by removing hash", () => {
		const html = '<a href="/page#section">Link</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should handle links without href attribute", () => {
		const html = '<a id="anchor">No href</a><a href="/page">With href</a>';
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual(["https://example.com/page"]);
	});

	it("should handle complex HTML with nested elements", () => {
		const html = `
			<nav>
				<a href="/home">Home</a>
				<a href="/about">About</a>
			</nav>
			<main>
				<a href="/contact">Contact</a>
			</main>
		`;
		const visited = new Set<string>();
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toEqual([
			"https://example.com/home",
			"https://example.com/about",
			"https://example.com/contact",
		]);
	});
});
