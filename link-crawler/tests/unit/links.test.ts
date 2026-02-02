import { describe, it, expect } from "vitest";
import {
	normalizeUrl,
	isSameDomain,
	shouldCrawl,
	extractLinks,
} from "../../src/parser/links.js";
import type { CrawlConfig } from "../../src/types.js";

describe("normalizeUrl", () => {
	it("should normalize relative URL with base URL", () => {
		const result = normalizeUrl("/path/to/page", "https://example.com");
		expect(result).toBe("https://example.com/path/to/page");
	});

	it("should normalize relative URL without leading slash", () => {
		const result = normalizeUrl("path/to/page", "https://example.com");
		expect(result).toBe("https://example.com/path/to/page");
	});

	it("should keep absolute URL as is", () => {
		const result = normalizeUrl("https://other.com/page", "https://example.com");
		expect(result).toBe("https://other.com/page");
	});

	it("should remove hash fragment", () => {
		const result = normalizeUrl("https://example.com/page#section", "https://example.com");
		expect(result).toBe("https://example.com/page");
	});

	it("should handle URL with query string", () => {
		const result = normalizeUrl("/page?foo=bar", "https://example.com");
		expect(result).toBe("https://example.com/page?foo=bar");
	});

	it("should handle protocol-relative URL", () => {
		const result = normalizeUrl("//cdn.example.com/file.js", "https://example.com");
		expect(result).toBe("https://cdn.example.com/file.js");
	});

	it("should return null for invalid URL", () => {
		const result = normalizeUrl("not a url", "not a base");
		expect(result).toBeNull();
	});

	it("should handle empty string", () => {
		const result = normalizeUrl("", "https://example.com");
		expect(result).toBe("https://example.com/");
	});
});

describe("isSameDomain", () => {
	it("should return true for same domain", () => {
		const result = isSameDomain("https://example.com/page1", "https://example.com/page2");
		expect(result).toBe(true);
	});

	it("should return true for same domain with different subdomains", () => {
		const result = isSameDomain("https://www.example.com/page", "https://blog.example.com/page");
		expect(result).toBe(false);
	});

	it("should return false for different domains", () => {
		const result = isSameDomain("https://example.com/page", "https://other.com/page");
		expect(result).toBe(false);
	});

	it("should return false for completely different URLs", () => {
		const result = isSameDomain("https://example.com", "https://test.org");
		expect(result).toBe(false);
	});

	it("should return false for invalid URL", () => {
		const result = isSameDomain("not a url", "https://example.com");
		expect(result).toBe(false);
	});

	it("should return false for invalid base URL", () => {
		const result = isSameDomain("https://example.com", "not a url");
		expect(result).toBe(false);
	});
});

describe("shouldCrawl", () => {
	const createConfig = (overrides: Partial<CrawlConfig> = {}): CrawlConfig => ({
		startUrl: "https://example.com",
		maxDepth: 2,
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

	it("should return true for unvisited URL", () => {
		const visited = new Set<string>();
		const config = createConfig();
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false for visited URL", () => {
		const visited = new Set<string>(["https://example.com/page"]);
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

	it("should return true when URL matches includePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ includePattern: /\/docs\// });
		const result = shouldCrawl("https://example.com/docs/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false when URL does not match includePattern", () => {
		const visited = new Set<string>();
		const config = createConfig({ includePattern: /\/docs\// });
		const result = shouldCrawl("https://example.com/blog/page", visited, config);
		expect(result).toBe(false);
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
		const result = shouldCrawl("https://example.com/file.html", visited, config);
		expect(result).toBe(true);
	});

	it("should return false for PNG files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/image.png", visited, config)).toBe(false);
	});

	it("should return false for JPG files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/image.jpg", visited, config)).toBe(false);
	});

	it("should return false for PDF files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/doc.pdf", visited, config)).toBe(false);
	});

	it("should return false for ZIP files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/archive.zip", visited, config)).toBe(false);
	});

	it("should return false for MP4 files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/video.mp4", visited, config)).toBe(false);
	});

	it("should return true for HTML files", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/page.html", visited, config)).toBe(true);
	});

	it("should handle case-insensitive file extensions", () => {
		const visited = new Set<string>();
		const config = createConfig();
		expect(shouldCrawl("https://example.com/image.PNG", visited, config)).toBe(false);
		expect(shouldCrawl("https://example.com/image.JpG", visited, config)).toBe(false);
	});
});

describe("extractLinks", () => {
	const createConfig = (overrides: Partial<CrawlConfig> = {}): CrawlConfig => ({
		startUrl: "https://example.com",
		maxDepth: 2,
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

	it("should extract links from anchor tags", () => {
		const html = `
			<a href="https://example.com/page1">Page 1</a>
			<a href="https://example.com/page2">Page 2</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://example.com/page2");
	});

	it("should resolve relative URLs", () => {
		const html = `
			<a href="/page1">Page 1</a>
			<a href="page2">Page 2</a>
			<a href="../parent">Parent</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com/dir/", new Set(), config);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://example.com/dir/page2");
		expect(result).toContain("https://example.com/parent");
	});

	it("should exclude hash links", () => {
		const html = `
			<a href="#section1">Section 1</a>
			<a href="https://example.com/page#section">Page</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).not.toContain("https://example.com/page#section");
		expect(result).toContain("https://example.com/page");
	});

	it("should exclude javascript: links", () => {
		const html = `
			<a href="javascript:void(0)">Click</a>
			<a href="javascript:alert('test')">Alert</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(0);
	});

	it("should exclude mailto: links", () => {
		const html = `
			<a href="mailto:test@example.com">Email</a>
			<a href="mailto:other@test.org">Other</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(0);
	});

	it("should exclude already visited URLs", () => {
		const html = `
			<a href="https://example.com/page1">Page 1</a>
			<a href="https://example.com/page2">Page 2</a>
		`;
		const visited = new Set<string>(["https://example.com/page1"]);
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", visited, config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page2");
	});

	it("should exclude external links when sameDomain is true", () => {
		const html = `
			<a href="https://example.com/page">Internal</a>
			<a href="https://other.com/page">External</a>
		`;
		const config = createConfig({ sameDomain: true });
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page");
	});

	it("should include external links when sameDomain is false", () => {
		const html = `
			<a href="https://example.com/page">Internal</a>
			<a href="https://other.com/page">External</a>
		`;
		const config = createConfig({ sameDomain: false });
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/page");
		expect(result).toContain("https://other.com/page");
	});

	it("should exclude binary files", () => {
		const html = `
			<a href="https://example.com/image.png">Image</a>
			<a href="https://example.com/document.pdf">PDF</a>
			<a href="https://example.com/page.html">HTML</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page.html");
	});

	it("should handle links without href attribute", () => {
		const html = `
			<a>Link without href</a>
			<a href="https://example.com/page">Valid Link</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page");
	});

	it("should handle empty href attribute", () => {
		const html = `
			<a href="">Empty</a>
			<a href="https://example.com/page">Valid</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page");
	});

	it("should apply includePattern filter", () => {
		const html = `
			<a href="https://example.com/docs/page1">Docs 1</a>
			<a href="https://example.com/docs/page2">Docs 2</a>
			<a href="https://example.com/blog/post">Blog</a>
		`;
		const config = createConfig({ includePattern: /\/docs\// });
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/docs/page1");
		expect(result).toContain("https://example.com/docs/page2");
	});

	it("should apply excludePattern filter", () => {
		const html = `
			<a href="https://example.com/page1">Page 1</a>
			<a href="https://example.com/page2.pdf">PDF</a>
			<a href="https://example.com/page3">Page 3</a>
		`;
		const config = createConfig({ excludePattern: /\.pdf$/ });
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://example.com/page3");
	});

	it("should return unique links", () => {
		const html = `
			<a href="https://example.com/page">Link 1</a>
			<a href="https://example.com/page">Link 2</a>
			<a href="/page">Link 3</a>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page");
	});

	it("should handle complex HTML with nested elements", () => {
		const html = `
			<div>
				<a href="https://example.com/page1">
					<span>Link with nested elements</span>
				</a>
			</div>
			<nav>
				<a href="/nav-link">Nav Link</a>
			</nav>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://example.com/nav-link");
	});

	it("should handle empty HTML", () => {
		const config = createConfig();
		const result = extractLinks("", "https://example.com", new Set(), config);
		expect(result).toHaveLength(0);
	});

	it("should handle HTML without links", () => {
		const html = `
			<p>No links here</p>
			<div>Just text</div>
		`;
		const config = createConfig();
		const result = extractLinks(html, "https://example.com", new Set(), config);
		expect(result).toHaveLength(0);
	});
});
