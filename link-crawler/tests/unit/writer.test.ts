import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

		expect(pageFile).toBe("pages/page-001.md");

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

		writeFileSync(
			join(testOutputDir, "index.json"),
			JSON.stringify(existingResult, null, 2),
		);

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
});
