import { describe, it, expect } from "vitest";
import {
	normalizeUrl,
	isSameDomain,
	shouldCrawl,
	extractLinks,
} from "../../src/parser/links.js";
import type { CrawlConfig } from "../../src/types.js";

describe("normalizeUrl", () => {
	describe("relative URL handling", () => {
		it("should convert relative URL to absolute URL", () => {
			const result = normalizeUrl("/path/to/page", "https://example.com");
			expect(result).toBe("https://example.com/path/to/page");
		});

		it("should handle relative URL without leading slash", () => {
			const result = normalizeUrl("path/to/page", "https://example.com");
			expect(result).toBe("https://example.com/path/to/page");
		});

		it("should handle parent directory references", () => {
			const result = normalizeUrl("../page", "https://example.com/dir/subdir/");
			expect(result).toBe("https://example.com/dir/page");
		});

		it("should handle current directory references", () => {
			const result = normalizeUrl("./page", "https://example.com/dir/");
			expect(result).toBe("https://example.com/dir/page");
		});
	});

	describe("absolute URL handling", () => {
		it("should return absolute URL as is", () => {
			const result = normalizeUrl("https://other.com/page", "https://example.com");
			expect(result).toBe("https://other.com/page");
		});

		it("should preserve query parameters", () => {
			const result = normalizeUrl("https://example.com/page?foo=bar", "https://example.com");
			expect(result).toBe("https://example.com/page?foo=bar");
		});
	});

	describe("fragment removal", () => {
		it("should remove hash fragment from URL", () => {
			const result = normalizeUrl("https://example.com/page#section", "https://example.com");
			expect(result).toBe("https://example.com/page");
		});

		it("should remove fragment from relative URL", () => {
			const result = normalizeUrl("/page#section", "https://example.com");
			expect(result).toBe("https://example.com/page");
		});
	});

	describe("invalid URL handling", () => {
		it("should return null for invalid URL", () => {
			const result = normalizeUrl("not a valid url", "not a base");
			expect(result).toBeNull();
		});
	});
});

describe("isSameDomain", () => {
	it("should return true for same domain", () => {
		const result = isSameDomain("https://example.com/page", "https://example.com/other");
		expect(result).toBe(true);
	});

	it("should return true for same domain with different protocols", () => {
		const result = isSameDomain("http://example.com/page", "https://example.com/other");
		expect(result).toBe(true);
	});

	it("should return true for same domain with different ports", () => {
		const result = isSameDomain("https://example.com:8080/page", "https://example.com/other");
		expect(result).toBe(true);
	});

	it("should return false for different domains", () => {
		const result = isSameDomain("https://other.com/page", "https://example.com/other");
		expect(result).toBe(false);
	});

	it("should return false for subdomains", () => {
		const result = isSameDomain("https://sub.example.com/page", "https://example.com/other");
		expect(result).toBe(false);
	});

	it("should return false for invalid URL", () => {
		const result = isSameDomain("not a url", "https://example.com");
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
		delay: 1000,
		timeout: 30000,
		spaWait: 0,
		headed: false,
		diff: false,
		pages: false,
		merge: false,
		chunks: false,
		...overrides,
	});

	describe("visited URL handling", () => {
		it("should return false for already visited URL", () => {
			const visited = new Set(["https://example.com/page"]);
			const config = createConfig();
			const result = shouldCrawl("https://example.com/page", visited, config);
			expect(result).toBe(false);
		});

		it("should return true for unvisited URL", () => {
			const visited = new Set<string>();
			const config = createConfig();
			const result = shouldCrawl("https://example.com/page", visited, config);
			expect(result).toBe(true);
		});
	});

	describe("same domain filtering", () => {
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
	});

	describe("include pattern filtering", () => {
		it("should return true when URL matches include pattern", () => {
			const visited = new Set<string>();
			const config = createConfig({ includePattern: /\/docs\// });
			const result = shouldCrawl("https://example.com/docs/page", visited, config);
			expect(result).toBe(true);
		});

		it("should return false when URL does not match include pattern", () => {
			const visited = new Set<string>();
			const config = createConfig({ includePattern: /\/docs\// });
			const result = shouldCrawl("https://example.com/other/page", visited, config);
			expect(result).toBe(false);
		});
	});

	describe("exclude pattern filtering", () => {
		it("should return false when URL matches exclude pattern", () => {
			const visited = new Set<string>();
			const config = createConfig({ excludePattern: /\/admin\// });
			const result = shouldCrawl("https://example.com/admin/page", visited, config);
			expect(result).toBe(false);
		});

		it("should return true when URL does not match exclude pattern", () => {
			const visited = new Set<string>();
			const config = createConfig({ excludePattern: /\/admin\// });
			const result = shouldCrawl("https://example.com/public/page", visited, config);
			expect(result).toBe(true);
		});
	});

	describe("binary file exclusion", () => {
		it("should return false for image files", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/image.png", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/image.jpg", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/image.jpeg", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/image.gif", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/image.svg", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/favicon.ico", visited, config)).toBe(false);
		});

		it("should return false for document files", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/doc.pdf", visited, config)).toBe(false);
		});

		it("should return false for archive files", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/archive.zip", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/archive.tar", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/archive.gz", visited, config)).toBe(false);
		});

		it("should return false for media files", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/video.mp4", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/audio.mp3", visited, config)).toBe(false);
		});

		it("should return false for font files", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/font.woff", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/font.woff2", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/font.ttf", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/font.eot", visited, config)).toBe(false);
		});

		it("should handle case insensitive file extensions", () => {
			const visited = new Set<string>();
			const config = createConfig();
			expect(shouldCrawl("https://example.com/image.PNG", visited, config)).toBe(false);
			expect(shouldCrawl("https://example.com/image.JPG", visited, config)).toBe(false);
		});
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
		delay: 1000,
		timeout: 30000,
		spaWait: 0,
		headed: false,
		diff: false,
		pages: false,
		merge: false,
		chunks: false,
		...overrides,
	});

	describe("basic link extraction", () => {
		it("should extract links from HTML", () => {
			const html = `
				<a href="/page1">Page 1</a>
				<a href="/page2">Page 2</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(2);
			expect(result).toContain("https://example.com/page1");
			expect(result).toContain("https://example.com/page2");
		});

		it("should extract absolute URLs", () => {
			const html = '<a href="https://other.com/page">External</a>';
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toContain("https://other.com/page");
		});
	});

	describe("duplicate removal", () => {
		it("should remove duplicate links", () => {
			const html = `
				<a href="/page">Link 1</a>
				<a href="/page">Link 2</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});
	});

	describe("fragment removal", () => {
		it("should normalize URLs and remove fragments", () => {
			const html = `
				<a href="/page#section1">Link 1</a>
				<a href="/page#section2">Link 2</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});
	});

	describe("special link handling", () => {
		it("should skip hash-only links", () => {
			const html = `
				<a href="#section">Hash Link</a>
				<a href="/page">Normal Link</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});

		it("should skip javascript: links", () => {
			const html = `
				<a href="javascript:void(0)">JS Link</a>
				<a href="/page">Normal Link</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});

		it("should skip mailto: links", () => {
			const html = `
				<a href="mailto:test@example.com">Email</a>
				<a href="/page">Normal Link</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});

		it("should skip links without href", () => {
			const html = `
				<a>No href</a>
				<a href="/page">Normal Link</a>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(1);
			expect(result[0]).toBe("https://example.com/page");
		});
	});

	describe("visited filtering", () => {
		it("should not include already visited URLs", () => {
			const html = '<a href="/page">Link</a>';
			const visited = new Set(["https://example.com/page"]);
			const result = extractLinks(html, "https://example.com", visited, createConfig());
			expect(result).toHaveLength(0);
		});
	});

	describe("complex HTML", () => {
		it("should handle nested elements", () => {
			const html = `
				<div>
					<p><a href="/page1">Link 1</a></p>
					<section>
						<a href="/page2"><span>Link 2</span></a>
					</section>
				</div>
			`;
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(2);
		});

		it("should handle empty HTML", () => {
			const result = extractLinks("", "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(0);
		});

		it("should handle HTML without links", () => {
			const html = "<div><p>No links here</p></div>";
			const result = extractLinks(html, "https://example.com", new Set(), createConfig());
			expect(result).toHaveLength(0);
		});
	});
});
