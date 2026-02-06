import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OutputWriter } from "../../src/output/writer.js";
import type { CrawlConfig, CrawlResult, PageMetadata } from "../../src/types.js";

const testOutputDir = "./test-output-writer";

const defaultConfig: CrawlConfig = {
	startUrl: "https://example.com",
	maxDepth: 2,
	outputDir: testOutputDir,
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
	keepSession: false,
};

const defaultMetadata: PageMetadata = {
	title: "Test Page",
	description: "Test description",
	keywords: null,
	author: null,
	ogTitle: null,
	ogType: null,
};

describe("OutputWriter", () => {
	beforeEach(() => {
		rmSync(testOutputDir, { recursive: true, force: true });
	});

	afterEach(() => {
		rmSync(testOutputDir, { recursive: true, force: true });
	});

	it("should save page with hash and crawledAt", () => {
		const writer = new OutputWriter(defaultConfig);
		const markdown = "# Test Content\n\nThis is test content.";

		const pageFile = writer.savePage(
			"https://example.com/page1",
			markdown,
			1,
			["https://example.com/page2"],
			defaultMetadata,
			"Test Page",
		);

		expect(pageFile).toBe("pages/page-001-test-page.md");

		const result = writer.getResult();
		expect(result.pages).toHaveLength(1);
		expect(result.pages[0].hash).toBeDefined();
		expect(result.pages[0].hash).toHaveLength(64); // SHA-256 hex = 64 chars
		expect(result.pages[0].crawledAt).toBeDefined();
		expect(new Date(result.pages[0].crawledAt).getTime()).not.toBeNaN();
	});

	it("should compute consistent hash for same content", () => {
		const writer1 = new OutputWriter(defaultConfig);
		const writer2 = new OutputWriter(defaultConfig);
		const markdown = "# Same Content";

		writer1.savePage("https://example.com/p1", markdown, 1, [], defaultMetadata, null);
		writer2.savePage("https://example.com/p2", markdown, 1, [], defaultMetadata, null);

		const hash1 = writer1.getResult().pages[0].hash;
		const hash2 = writer2.getResult().pages[0].hash;

		expect(hash1).toBe(hash2);
	});

	it("should read existing index.json", () => {
		// Create initial index.json
		mkdirSync(join(testOutputDir, "pages"), { recursive: true });
		mkdirSync(join(testOutputDir, "specs"), { recursive: true });

		const existingResult: CrawlResult = {
			crawledAt: "2026-01-01T00:00:00.000Z",
			baseUrl: "https://example.com",
			config: { maxDepth: 2, sameDomain: true },
			totalPages: 1,
			pages: [
				{
					url: "https://example.com/existing",
					title: "Existing Page",
					file: "pages/page-001.md",
					depth: 0,
					links: [],
					metadata: defaultMetadata,
					hash: "abc123",
					crawledAt: "2026-01-01T00:00:00.000Z",
				},
			],
			specs: [],
		};

		writeFileSync(join(testOutputDir, "index.json"), JSON.stringify(existingResult, null, 2));

		// Create new writer that should read existing index
		const writer = new OutputWriter(defaultConfig);

		const existingHash = writer.getExistingHash("https://example.com/existing");
		expect(existingHash).toBe("abc123");

		const nonExistingHash = writer.getExistingHash("https://example.com/new");
		expect(nonExistingHash).toBeUndefined();
	});

	it("should save index.json with hash and crawledAt fields", () => {
		const writer = new OutputWriter(defaultConfig);
		writer.savePage("https://example.com", "# Content", 0, [], defaultMetadata, "Title");
		writer.saveIndex();

		const indexContent = readFileSync(join(testOutputDir, "index.json"), "utf-8");
		const result = JSON.parse(indexContent) as CrawlResult;

		expect(result.pages[0].hash).toBeDefined();
		expect(result.pages[0].crawledAt).toBeDefined();
	});

	it("should add blank line after frontmatter closing ---", () => {
		const writer = new OutputWriter(defaultConfig);
		const markdown = "## Introduction\n\nThis is content.";

		writer.savePage("https://example.com/page1", markdown, 1, [], defaultMetadata, "Test Page");

		const pagePath = join(testOutputDir, "pages/page-001-test-page.md");
		const content = readFileSync(pagePath, "utf-8");

		// Verify that there's a blank line between frontmatter and content
		// The frontmatter should end with "---\n\n" followed by content
		expect(content).toMatch(/---\n\n## Introduction/);
	});

	it("should include hash field in frontmatter", () => {
		const writer = new OutputWriter(defaultConfig);
		const markdown = "# Test Content\n\nThis is test content.";

		writer.savePage(
			"https://example.com/page1",
			markdown,
			1,
			["https://example.com/page2"],
			defaultMetadata,
			"Test Page",
		);

		const pagePath = join(testOutputDir, "pages/page-001-test-page.md");
		const content = readFileSync(pagePath, "utf-8");

		// Verify that hash field is present in frontmatter
		expect(content).toMatch(/^---\n/);
		expect(content).toMatch(/\nhash: [a-f0-9]{64}\n/);
		expect(content).toMatch(/\n---\n\n/);
	});

	describe("filename with title", () => {
		it("should include slugified title in filename", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Getting Started Guide" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-getting-started-guide.md");
		});

		it("should use sequential numbers only when title is null", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: null },
				null,
			);
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should use sequential numbers only when title is empty", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "" },
				null,
			);
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should use sequential numbers only when title is whitespace only", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "   " },
				null,
			);
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should fallback to title parameter when metadata.title is null", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: null },
				"Fallback Title",
			);
			expect(pageFile).toBe("pages/page-001-fallback-title.md");
		});

		it("should convert title to lowercase", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "UPPERCASE TITLE" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-uppercase-title.md");
		});

		it("should remove special characters from title", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Title with @#$%^&*() special chars!" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-title-with-special-chars.md");
		});

		it("should replace underscores with hyphens", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "snake_case_title" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-snake-case-title.md");
		});

		it("should collapse multiple hyphens into one", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Title---with---hyphens" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-title-with-hyphens.md");
		});

		it("should trim leading and trailing hyphens", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "-Leading and trailing hyphens-" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-leading-and-trailing-hyphens.md");
		});

		it("should truncate long titles to 50 characters", () => {
			const writer = new OutputWriter(defaultConfig);
			const longTitle = "This is a very long title that exceeds the fifty character limit";
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: longTitle },
				null,
			);
			// The slug should be truncated without trailing hyphen
			expect(pageFile.length).toBeLessThanOrEqual("pages/page-001-".length + 50 + ".md".length);
			expect(pageFile).toMatch(/^pages\/page-\d{3}-[a-z0-9-]+\.md$/);
		});

		it("should handle titles with multiple spaces", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Title   with   multiple   spaces" },
				null,
			);
			expect(pageFile).toBe("pages/page-001-title-with-multiple-spaces.md");
		});

		it("should handle Japanese titles", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "日本語タイトル" },
				null,
			);
			// Japanese characters are removed by slugify (non-ascii), so only the sequential number remains
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle mixed alphanumeric and Japanese", () => {
			const writer = new OutputWriter(defaultConfig);
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "日本語Englishタイトル123" },
				null,
			);
			// Only ascii alphanumeric characters remain (Japanese chars removed, no hyphen added between English and numbers)
			expect(pageFile).toBe("pages/page-001-english123.md");
		});
	});
});
