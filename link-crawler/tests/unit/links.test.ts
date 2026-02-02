import { describe, it, expect } from "vitest";
import {
	normalizeUrl,
	isSameDomain,
	shouldCrawl,
	extractLinks,
} from "../../src/parser/links.js";
import type { CrawlConfig } from "../../src/types.js";

describe("normalizeUrl", () => {
	it("should normalize relative URLs", () => {
		const result = normalizeUrl("/path/to/page", "https://example.com");

		expect(result).toBe("https://example.com/path/to/page");
	});

	it("should normalize relative URLs without leading slash", () => {
		const result = normalizeUrl("path/to/page", "https://example.com");

		expect(result).toBe("https://example.com/path/to/page");
	});

	it("should keep absolute URLs intact", () => {
		const result = normalizeUrl("https://other.com/page", "https://example.com");

		expect(result).toBe("https://other.com/page");
	});

	it("should remove hash fragments", () => {
		const result = normalizeUrl("https://example.com/page#section", "https://example.com");

		expect(result).toBe("https://example.com/page");
		expect(result).not.toContain("#");
	});

	it("should handle URLs with query strings", () => {
		const result = normalizeUrl("/page?foo=bar&baz=qux", "https://example.com");

		expect(result).toBe("https://example.com/page?foo=bar&baz=qux");
	});

	it("should encode invalid URL characters", () => {
		const result = normalizeUrl("not a valid url", "https://example.com");

		expect(result).toBe("https://example.com/not%20a%20valid%20url");
	});

	it("should handle protocol-relative URLs", () => {
		const result = normalizeUrl("//cdn.example.com/file.js", "https://example.com");

		expect(result).toBe("https://cdn.example.com/file.js");
	});

	it("should handle empty string", () => {
		const result = normalizeUrl("", "https://example.com");

		expect(result).toBe("https://example.com/");
	});
});

describe("isSameDomain", () => {
	it("should return true for same domain", () => {
		const result = isSameDomain("https://example.com/page", "https://example.com");

		expect(result).toBe(true);
	});

	it("should return false for different domains", () => {
		const result = isSameDomain("https://other.com/page", "https://example.com");

		expect(result).toBe(false);
	});

	it("should return false for subdomains", () => {
		const result = isSameDomain("https://sub.example.com/page", "https://example.com");

		expect(result).toBe(false);
	});

	it("should return true for same domain with different ports", () => {
		const result = isSameDomain("https://example.com:8080/page", "https://example.com");

		expect(result).toBe(true);
	});

	it("should return false for invalid URLs", () => {
		const result = isSameDomain("not a url", "https://example.com");

		expect(result).toBe(false);
	});

	it("should handle www subdomain difference", () => {
		const result = isSameDomain("https://www.example.com/page", "https://example.com");

		expect(result).toBe(false);
	});
});

describe("shouldCrawl", () => {
	const baseConfig: CrawlConfig = {
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
	};

	it("should return false for already visited URLs", () => {
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

	it("should return false when URL does not match include pattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, includePattern: /^\/docs/ };

		const result = shouldCrawl("https://example.com/blog/post", visited, config);

		expect(result).toBe(false);
	});

	it("should return true when URL matches include pattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, includePattern: /\/docs/ };

		const result = shouldCrawl("https://example.com/docs/guide", visited, config);

		expect(result).toBe(true);
	});

	it("should return false when URL matches exclude pattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, excludePattern: /\.pdf$/ };

		const result = shouldCrawl("https://example.com/file.pdf", visited, config);

		expect(result).toBe(false);
	});

	it("should return true when URL does not match exclude pattern", () => {
		const visited = new Set<string>();
		const config = { ...baseConfig, excludePattern: /\.pdf$/ };

		const result = shouldCrawl("https://example.com/page.html", visited, config);

		expect(result).toBe(true);
	});

	it("should exclude PNG images", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/image.png", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude JPG images", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/photo.jpg", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude JPEG images", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/pic.jpeg", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude GIF images", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/anim.gif", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude SVG files", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/icon.svg", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude PDF files", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/doc.pdf", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude ZIP files", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/archive.zip", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude MP4 files", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/video.mp4", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude MP3 files", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/audio.mp3", visited, baseConfig);

		expect(result).toBe(false);
	});

	it("should exclude font files", () => {
		const visited = new Set<string>();

		expect(shouldCrawl("https://example.com/font.woff", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.woff2", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.ttf", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/font.eot", visited, baseConfig)).toBe(false);
	});

	it("should handle case-insensitive extensions", () => {
		const visited = new Set<string>();

		expect(shouldCrawl("https://example.com/image.PNG", visited, baseConfig)).toBe(false);
		expect(shouldCrawl("https://example.com/image.Png", visited, baseConfig)).toBe(false);
	});

	it("should return true for regular HTML pages", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/page.html", visited, baseConfig);

		expect(result).toBe(true);
	});

	it("should return true for extensionless URLs", () => {
		const visited = new Set<string>();

		const result = shouldCrawl("https://example.com/path/to/page", visited, baseConfig);

		expect(result).toBe(true);
	});

	it("should handle combined include and exclude patterns", () => {
		const visited = new Set<string>();
		const config = {
			...baseConfig,
			includePattern: /\/docs/,
			excludePattern: /draft/,
		};

		// Should be excluded (matches exclude pattern)
		expect(shouldCrawl("https://example.com/docs/draft", visited, config)).toBe(false);

		// Should be excluded (doesn't match include pattern)
		expect(shouldCrawl("https://example.com/blog/post", visited, config)).toBe(false);

		// Should be included
		expect(shouldCrawl("https://example.com/docs/guide", visited, config)).toBe(true);
	});
});

describe("extractLinks", () => {
	const baseConfig: CrawlConfig = {
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
	};

	it("should extract links from HTML", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/page2">Page 2</a>
					<a href="/page3">Page 3</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(3);
		expect(links).toContain("https://example.com/page1");
		expect(links).toContain("https://example.com/page2");
		expect(links).toContain("https://example.com/page3");
	});

	it("should normalize relative URLs", () => {
		const html = `
			<html>
				<body>
					<a href="path/to/page">Relative</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toContain("https://example.com/path/to/page");
	});

	it("should filter out anchor links", () => {
		const html = `
			<html>
				<body>
					<a href="#section">Section</a>
					<a href="/page">Page</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should filter out javascript: links", () => {
		const html = `
			<html>
				<body>
					<a href="javascript:void(0)">Click</a>
					<a href="javascript:alert('test')">Alert</a>
					<a href="/page">Page</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should filter out mailto: links", () => {
		const html = `
			<html>
				<body>
					<a href="mailto:test@example.com">Email</a>
					<a href="/page">Page</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should skip already visited URLs", () => {
		const html = `
			<html>
				<body>
					<a href="/page1">Page 1</a>
					<a href="/page2">Page 2</a>
				</body>
			</html>
		`;
		const visited = new Set(["https://example.com/page1"]);

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page2");
	});

	it("should deduplicate links", () => {
		const html = `
			<html>
				<body>
					<a href="/page">Link 1</a>
					<a href="/page">Link 2</a>
					<a href="/page">Link 3</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should filter links based on sameDomain", () => {
		const html = `
			<html>
				<body>
					<a href="https://example.com/page">Same Domain</a>
					<a href="https://other.com/page">Other Domain</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should include external links when sameDomain is false", () => {
		const html = `
			<html>
				<body>
					<a href="https://example.com/page">Same Domain</a>
					<a href="https://other.com/page">Other Domain</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const config = { ...baseConfig, sameDomain: false };

		const links = extractLinks(html, "https://example.com", visited, config);

		expect(links).toHaveLength(2);
		expect(links).toContain("https://example.com/page");
		expect(links).toContain("https://other.com/page");
	});

	it("should filter binary files", () => {
		const html = `
			<html>
				<body>
					<a href="/page.html">Page</a>
					<a href="/image.png">Image</a>
					<a href="/doc.pdf">PDF</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page.html");
	});

	it("should filter links based on include pattern", () => {
		const html = `
			<html>
				<body>
					<a href="/docs/guide">Docs</a>
					<a href="/blog/post">Blog</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const config = { ...baseConfig, includePattern: /^https:\/\/example\.com\/docs/ };

		const links = extractLinks(html, "https://example.com", visited, config);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/docs/guide");
	});

	it("should filter links based on exclude pattern", () => {
		const html = `
			<html>
				<body>
					<a href="/page.html">Page</a>
					<a href="/draft.html">Draft</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();
		const config = { ...baseConfig, excludePattern: /draft/ };

		const links = extractLinks(html, "https://example.com", visited, config);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page.html");
	});

	it("should handle empty href attribute", () => {
		const html = `
			<html>
				<body>
					<a href="">Empty</a>
					<a href="/page">Page</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		// Empty href points to current page, should be normalized
		expect(links.length).toBeGreaterThanOrEqual(1);
	});

	it("should handle missing href attribute", () => {
		const html = `
			<html>
				<body>
					<a>No href</a>
					<a href="/page">Page</a>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(1);
		expect(links).toContain("https://example.com/page");
	});

	it("should handle complex HTML with many links", () => {
		const html = `
			<html>
				<body>
					<nav>
						<a href="/">Home</a>
						<a href="/about">About</a>
					</nav>
					<main>
						<a href="/article/1">Article 1</a>
						<a href="/article/2">Article 2</a>
					</main>
					<footer>
						<a href="/contact">Contact</a>
					</footer>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(5);
		expect(links).toContain("https://example.com/");
		expect(links).toContain("https://example.com/about");
		expect(links).toContain("https://example.com/article/1");
		expect(links).toContain("https://example.com/article/2");
		expect(links).toContain("https://example.com/contact");
	});

	it("should handle empty HTML", () => {
		const html = "";
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(0);
	});

	it("should handle HTML without links", () => {
		const html = `
			<html>
				<body>
					<p>No links here</p>
				</body>
			</html>
		`;
		const visited = new Set<string>();

		const links = extractLinks(html, "https://example.com", visited, baseConfig);

		expect(links).toHaveLength(0);
	});
});
