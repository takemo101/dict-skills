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
		const result = normalizeUrl("/path", "https://example.com");
		expect(result).toBe("https://example.com/path");
	});

	it("should normalize absolute URL", () => {
		const result = normalizeUrl("https://example.com/path", "https://other.com");
		expect(result).toBe("https://example.com/path");
	});

	it("should remove hash fragment", () => {
		const result = normalizeUrl("https://example.com/path#section", "https://example.com");
		expect(result).toBe("https://example.com/path");
	});

	it("should handle protocol-relative URL", () => {
		const result = normalizeUrl("//cdn.example.com/file.js", "https://example.com");
		expect(result).toBe("https://cdn.example.com/file.js");
	});

	it("should return null for invalid URL", () => {
		const result = normalizeUrl("not a url", "invalid base");
		expect(result).toBeNull();
	});

	it("should handle query parameters", () => {
		const result = normalizeUrl("/path?foo=bar&baz=qux", "https://example.com");
		expect(result).toBe("https://example.com/path?foo=bar&baz=qux");
	});

	it("should handle empty string", () => {
		const result = normalizeUrl("", "https://example.com");
		expect(result).toBe("https://example.com/");
	});
});

describe("isSameDomain", () => {
	it("should return true for same domain", () => {
		const result = isSameDomain("https://example.com/path", "https://example.com/other");
		expect(result).toBe(true);
	});

	it("should return false for different domain", () => {
		const result = isSameDomain("https://other.com/path", "https://example.com/other");
		expect(result).toBe(false);
	});

	it("should return false for subdomain", () => {
		const result = isSameDomain("https://sub.example.com/path", "https://example.com/other");
		expect(result).toBe(false);
	});

	it("should return true for same subdomain", () => {
		const result = isSameDomain("https://sub.example.com/path", "https://sub.example.com/other");
		expect(result).toBe(true);
	});

	it("should return false for invalid URL", () => {
		const result = isSameDomain("not a url", "https://example.com");
		expect(result).toBe(false);
	});

	it("should handle URLs with different protocols", () => {
		const result = isSameDomain("http://example.com/path", "https://example.com/other");
		expect(result).toBe(true);
	});
});

describe("shouldCrawl", () => {
	const baseConfig: CrawlConfig = {
		startUrl: "https://example.com",
		maxDepth: 3,
		outputDir: "./output",
		sameDomain: true,
		includePattern: null,
		excludePattern: null,
		delay: 1000,
		timeout: 30000,
		spaWait: 0,
		headed: false,
		diff: false,
		pages: false,
		merge: false,
		chunks: false,
	};

	it("should return false for already visited URL", () => {
		const visited = new Set(["https://example.com/page"]);
		const result = shouldCrawl("https://example.com/page", visited, baseConfig);
		expect(result).toBe(false);
	});

	it("should return false for different domain when sameDomain is true", () => {
		const visited = new Set<string>();
		const result = shouldCrawl("https://other.com/page", visited, baseConfig);
		expect(result).toBe(false);
	});

	it("should return true for different domain when sameDomain is false", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, sameDomain: false };
		const result = shouldCrawl("https://other.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false when URL does not match includePattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, includePattern: /\/docs\// };
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(false);
	});

	it("should return true when URL matches includePattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, includePattern: /\/docs\// };
		const result = shouldCrawl("https://example.com/docs/page", visited, config);
		expect(result).toBe(true);
	});

	it("should return false when URL matches excludePattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, excludePattern: /\/admin\// };
		const result = shouldCrawl("https://example.com/admin/page", visited, config);
		expect(result).toBe(false);
	});

	it("should return true when URL does not match excludePattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, excludePattern: /\/admin\// };
		const result = shouldCrawl("https://example.com/page", visited, config);
		expect(result).toBe(true);
	});

	it("should skip image files", () => {
		const visited = new Set<string>();
		expect(shouldCrawl("https://example.com/image.png", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/image.jpg", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/image.jpeg", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/image.gif", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/image.svg", visited, baseConfig)).toBe(false);
	});

	it("should skip binary files", () => {
		const visited = new Set<string>();
		expect(shouldCrawl("https://example.com/file.pdf", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/archive.zip", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/archive.tar.gz", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/video.mp4", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/audio.mp3", visited, baseConfig)).toBe(false);
	});

	it("should skip font files", () => {
		const visited = new Set<string>();
		expect(shouldCrawl("https://example.com/font.woff", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.woff2", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.ttf", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.eot", visited, baseConfig)).toBe(false);
	});

	it("should allow valid HTML pages", () => {
		const visited = new Set<string>();
		expect(shouldCrawl("https://example.com/page.html", visited, baseConfig)).toBe(true);
		expect(shouldCrawl("https://example.com/page", visited, baseConfig)).toBe(true);
		expect(shouldCrawl("https://example.com/path/to/page", visited, baseConfig)).toBe(true);
	});
});

describe("extractLinks", () => {
	const baseConfig: CrawlConfig = {
		startUrl: "https://example.com",
		maxDepth: 3,
		outputDir: "./output",
		sameDomain: true,
		includePattern: null,
		excludePattern: null,
		delay: 1000,
		timeout: 30000,
		spaWait: 0,
		headed: false,
		diff: false,
		pages: false,
		merge: false,
		chunks: false,
	};

	it("should extract links from HTML", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/page2">Page 2</a>
					<a href="https://example.com/page3">Page 3</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(3);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://example.com/page2");
		expect(result).toContain("https://example.com/page3");
	});

	it("should skip anchor links", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="#section">Section</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should skip javascript: links", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="javascript:void(0)">Click</a>
					<a href="javascript:alert('hello')">Alert</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should skip mailto: links", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="mailto:test@example.com">Email</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should skip already visited links", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/page2">Page 2</a>
				</body>
			</html>
		`;
		const visited = new Set(["https://example.com/page1"]);
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page2");
	});

	it("should skip links from other domains when sameDomain is true", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="https://other.com/page">External</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should include external links when sameDomain is false", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="https://other.com/page">External</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const config = { ...baseConfig, sameDomain: false };
		const result = extractLinks(html, "https://example.com", visited, config);

		expect(result).toHaveLength(2);
		expect(result).toContain("https://example.com/page1");
		expect(result).toContain("https://other.com/page");
	});

	it("should skip links with binary file extensions", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/image.png">Image</a>
					<a href="/file.pdf">PDF</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should skip links without href attribute", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a name="anchor">Anchor</a>
					<a>Missing href</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});

	it("should handle relative URLs correctly", () => {
		const html = `
			<html>
				<body>
					<a href="../parent.html">Parent</a>
					<a href="./sibling.html">Sibling</a>
					<a href="child/page.html">Child</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com/docs/current/", visited, baseConfig);

		expect(result).toHaveLength(3);
		expect(result).toContain("https://example.com/docs/parent.html");
		expect(result).toContain("https://example.com/docs/current/sibling.html");
		expect(result).toContain("https://example.com/docs/current/child/page.html");
	});

	it("should return empty array for HTML without links", () => {
		const html = `
			<html>
				<body>
					<p>No links here</p>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(0);
	});

	it("should deduplicate links", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/page1">Page 1 Again</a>
					<a href="https://example.com/page1">Page 1 Full</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const result = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(result).toHaveLength(1);
		expect(result).toContain("https://example.com/page1");
	});
});
