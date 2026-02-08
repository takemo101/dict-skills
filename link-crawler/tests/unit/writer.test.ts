import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OutputWriter } from "../../src/output/writer.js";
import type { CrawlConfig, CrawlResult, PageMetadata } from "../../src/types.js";

const testOutputDir = "./test-output-writer";

const defaultConfig: CrawlConfig = {
	startUrl: "https://example.com",
	maxDepth: 2,
	maxPages: null,
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
	respectRobots: true,
	version: "test-version",
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

	it("should save page with hash and crawledAt", async () => {
		const writer = new OutputWriter(defaultConfig);
		await writer.init();
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

	it("should compute consistent hash for same content", async () => {
		const writer1 = new OutputWriter(defaultConfig);
		await writer1.init();
		const writer2 = new OutputWriter(defaultConfig);
		await writer2.init();
		const markdown = "# Same Content";

		writer1.savePage("https://example.com/p1", markdown, 1, [], defaultMetadata, null);
		writer2.savePage("https://example.com/p2", markdown, 1, [], defaultMetadata, null);

		const hash1 = writer1.getResult().pages[0].hash;
		const hash2 = writer2.getResult().pages[0].hash;

		expect(hash1).toBe(hash2);
	});

	it("should read existing index.json", async () => {
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
		await writer.init();

		const existingHash = writer.getExistingHash("https://example.com/existing");
		expect(existingHash).toBe("abc123");

		const nonExistingHash = writer.getExistingHash("https://example.com/new");
		expect(nonExistingHash).toBeUndefined();
	});

	it("should save index.json with hash and crawledAt fields", async () => {
		const writer = new OutputWriter(defaultConfig);
		await writer.init();
		writer.savePage("https://example.com", "# Content", 0, [], defaultMetadata, "Title");
		writer.saveIndex();

		const indexContent = readFileSync(join(testOutputDir, "index.json"), "utf-8");
		const result = JSON.parse(indexContent) as CrawlResult;

		expect(result.pages[0].hash).toBeDefined();
		expect(result.pages[0].crawledAt).toBeDefined();
	});

	it("should add blank line after frontmatter closing ---", async () => {
		const writer = new OutputWriter(defaultConfig);
		await writer.init();
		const markdown = "## Introduction\n\nThis is content.";

		writer.savePage("https://example.com/page1", markdown, 1, [], defaultMetadata, "Test Page");

		const pagePath = join(testOutputDir, "pages/page-001-test-page.md");
		const content = readFileSync(pagePath, "utf-8");

		// Verify that there's a blank line between frontmatter and content
		// The frontmatter should end with "---\n\n" followed by content
		expect(content).toMatch(/---\n\n## Introduction/);
	});

	it("should include hash in frontmatter", async () => {
		const writer = new OutputWriter(defaultConfig);
		await writer.init();
		const markdown = "# Test Content\n\nThis is test content.";

		const pageFile = writer.savePage(
			"https://example.com/page1",
			markdown,
			1,
			[],
			defaultMetadata,
			"Test Page",
		);

		const pagePath = join(testOutputDir, pageFile);
		const content = readFileSync(pagePath, "utf-8");

		// Verify that hash is included in frontmatter
		expect(content).toMatch(/^---\n/);
		expect(content).toMatch(/\nhash: "[a-f0-9]{64}"\n/);
		expect(content).toMatch(/\n---\n\n/);

		// Verify hash is a SHA-256 hex string (64 characters)
		const hashMatch = content.match(/hash: "([a-f0-9]{64})"/);
		expect(hashMatch).toBeTruthy();
		expect(hashMatch?.[1]).toHaveLength(64);
	});

	describe("filename with title", () => {
		it("should include slugified title in filename", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should use sequential numbers only when title is null", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should use sequential numbers only when title is empty", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should use sequential numbers only when title is whitespace only", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should fallback to title parameter when metadata.title is null", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should convert title to lowercase", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should remove special characters from title", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should replace underscores with hyphens", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should collapse multiple hyphens into one", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should trim leading and trailing hyphens", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should truncate long titles to 50 characters", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should handle titles with multiple spaces", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
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

		it("should handle Japanese titles", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "日本語タイトル" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle mixed alphanumeric and Japanese", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "日本語Englishタイトル123" },
				null,
			);
			// Non-ASCII characters are removed, only ASCII remains
			expect(pageFile).toBe("pages/page-001-english123.md");
		});

		it("should handle Chinese titles (simplified)", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "配置指南" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle Chinese titles (traditional)", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "設定指南" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle Korean titles", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "시작하기 가이드" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should remove emoji from titles", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Getting Started 🚀 Guide 😊" },
				null,
			);
			// Emoji and non-ASCII characters are removed, spaces become hyphens
			expect(pageFile).toBe("pages/page-001-getting-started-guide.md");
		});

		it("should truncate long non-ASCII titles without breaking characters", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			// 60 characters: each Japanese character is one character
			const longTitle =
				"これは非常に長いタイトルで最大文字数の制限を超えていますので切り詰められる必要があります";
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: longTitle },
				null,
			);
			// All non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle Arabic titles", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "دليل البدء" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should handle Cyrillic titles", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Руководство по началу работы" },
				null,
			);
			// Non-ASCII characters are removed, resulting in sequential number only
			expect(pageFile).toBe("pages/page-001.md");
		});

		it("should remove all non-ASCII characters from mixed title", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "Hello世界World" },
				null,
			);
			// Non-ASCII characters (世界) are removed, "HelloWorld" becomes "helloworld"
			expect(pageFile).toBe("pages/page-001-helloworld.md");
		});

		it("should fallback to sequential number when title becomes empty after slugify", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const pageFile = writer.savePage(
				"https://example.com",
				"# Content",
				0,
				[],
				{ ...defaultMetadata, title: "日本語のみ" },
				null,
			);
			// All characters are non-ASCII and removed, resulting in empty string
			expect(pageFile).toBe("pages/page-001.md");
		});
	});

	describe("YAML frontmatter escaping", () => {
		it("should escape double quotes in keywords field", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithQuotes: PageMetadata = {
				...defaultMetadata,
				keywords: 'test, "quoted keyword", another',
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithQuotes,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify escaped quotes in keywords
			expect(content).toMatch(/keywords: "test, \\"quoted keyword\\", another"/);
		});

		it("should escape double quotes in title field", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithQuotes: PageMetadata = {
				...defaultMetadata,
				title: 'Test "quoted" title',
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithQuotes,
				null,
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			expect(content).toMatch(/title: "Test \\"quoted\\" title"/);
		});

		it("should escape double quotes in description field", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithQuotes: PageMetadata = {
				...defaultMetadata,
				description: 'Description with "quotes"',
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithQuotes,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			expect(content).toMatch(/description: "Description with \\"quotes\\""/);
		});

		it("should handle keywords without quotes", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithoutQuotes: PageMetadata = {
				...defaultMetadata,
				keywords: "test, keyword, another",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithoutQuotes,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify keywords remain unchanged
			expect(content).toMatch(/keywords: "test, keyword, another"/);
		});

		it("should escape newline characters in title", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithNewline: PageMetadata = {
				...defaultMetadata,
				title: "Title with\nnewline",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithNewline,
				null,
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify newline is escaped as \n (backslash-n in the file)
			expect(content).toMatch(/title: "Title with\\nnewline"/);
		});

		it("should escape carriage return and newline in description", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithCRLF: PageMetadata = {
				...defaultMetadata,
				description: "Description with\r\nCRLF line ending",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithCRLF,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify CRLF is escaped as \r\n (backslash-r backslash-n in file)
			expect(content).toMatch(/description: "Description with\\r\\nCRLF line ending"/);
		});

		it("should escape backslash in keywords", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithBackslash: PageMetadata = {
				...defaultMetadata,
				keywords: "path\\to\\file, test",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithBackslash,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify backslash is escaped as \\ (two backslashes in file)
			expect(content).toMatch(/keywords: "path\\\\to\\\\file, test"/);
		});

		it("should escape tab character in description", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithTab: PageMetadata = {
				...defaultMetadata,
				description: "Description with\ttab character",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithTab,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify tab is escaped as \t (backslash-t in file)
			expect(content).toMatch(/description: "Description with\\ttab character"/);
		});

		it("should escape multiple special characters in title", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithMultiple: PageMetadata = {
				...defaultMetadata,
				title: 'Title with "quotes"\nand newline',
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithMultiple,
				null,
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify both quotes and newline are escaped
			expect(content).toMatch(/title: "Title with \\"quotes\\"\\nand newline"/);
		});

		it("should escape backslash and quotes in description", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataWithBackslashAndQuotes: PageMetadata = {
				...defaultMetadata,
				description: 'Path is "C:\\Program Files\\App"',
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataWithBackslashAndQuotes,
				"Test",
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify both backslash and quotes are escaped (backslash first)
			expect(content).toMatch(/description: "Path is \\"C:\\\\Program Files\\\\App\\""/);
		});

		it("should handle empty strings without errors", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataEmpty: PageMetadata = {
				...defaultMetadata,
				title: "",
				description: "",
				keywords: "",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataEmpty,
				null,
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify empty strings are handled correctly
			// Empty title is still included (mandatory field)
			expect(content).toMatch(/title: ""/);
			// Empty description and keywords are omitted (optional fields with falsy check)
			expect(content).not.toMatch(/description:/);
			expect(content).not.toMatch(/keywords:/);
		});

		it("should handle strings with only special characters", async () => {
			const writer = new OutputWriter(defaultConfig);
			await writer.init();
			const metadataOnlySpecial: PageMetadata = {
				...defaultMetadata,
				title: "\n\r\t",
				description: "\\\\\\",
			};

			const pageFile = writer.savePage(
				"https://example.com/page1",
				"# Content",
				1,
				[],
				metadataOnlySpecial,
				null,
			);

			const pagePath = join(testOutputDir, pageFile);
			const content = readFileSync(pagePath, "utf-8");

			// Verify all special characters are escaped
			expect(content).toMatch(/title: "\\n\\r\\t"/);
			expect(content).toMatch(/description: "\\\\\\\\\\\\"/);
		});
	});

	describe("diff mode", () => {
		it("should preserve existing files in pages/ directory in diff mode", async () => {
			// 1. 初回クロール（非 diff モード）
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			await writer1.init();
			const pageFile1 = writer1.savePage(
				"https://example.com/page1",
				"# Page 1 Content",
				0,
				[],
				{ ...defaultMetadata, title: "Page 1" },
				null,
			);
			writer1.saveIndex();

			const pagePath1 = join(testOutputDir, pageFile1);

			// ファイルが作成されたことを確認
			expect(readFileSync(pagePath1, "utf-8")).toContain("# Page 1 Content");

			// 2. 差分クロール（diff モード）
			const writer2 = new OutputWriter({ ...defaultConfig, diff: true });
			await writer2.init();

			// 既存ファイルがまだ存在することを確認
			expect(readFileSync(pagePath1, "utf-8")).toContain("# Page 1 Content");

			// 新しいページのみ追加
			const pageFile2 = writer2.savePage(
				"https://example.com/page2",
				"# Page 2 Content",
				0,
				[],
				{ ...defaultMetadata, title: "Page 2" },
				null,
			);
			writer2.saveIndex();

			const pagePath2 = join(testOutputDir, pageFile2);

			// 既存ファイルと新規ファイルの両方が存在することを確認
			expect(readFileSync(pagePath1, "utf-8")).toContain("# Page 1 Content");
			expect(readFileSync(pagePath2, "utf-8")).toContain("# Page 2 Content");

			// ページ番号が連続していることを確認
			expect(pageFile1).toBe("pages/page-001-page-1.md");
			expect(pageFile2).toBe("pages/page-001-page-2.md"); // writer2 の pageCount は 0 から開始
		});

		it("should preserve existing files in specs/ directory in diff mode", async () => {
			// 1. 初回クロール（非 diff モード）
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			await writer1.init();
			const spec1Content = '{"openapi": "3.0.0"}';
			writer1.handleSpec("https://api.example.com/openapi.json", spec1Content);
			writer1.saveIndex();

			const specPath = join(testOutputDir, "specs/openapi.json");
			expect(readFileSync(specPath, "utf-8")).toBe(spec1Content);

			// 2. 差分クロール（diff モード）
			const writer2 = new OutputWriter({ ...defaultConfig, diff: true });
			await writer2.init();

			// 既存ファイルがまだ存在することを確認
			expect(readFileSync(specPath, "utf-8")).toBe(spec1Content);

			// 新しい spec のみ追加
			const spec2Content = '{"swagger": "2.0"}';
			writer2.handleSpec("https://api.example.com/swagger.json", spec2Content);
			writer2.saveIndex();

			// 既存ファイルと新規ファイルの両方が存在することを確認
			expect(readFileSync(specPath, "utf-8")).toBe(spec1Content);
			expect(readFileSync(join(testOutputDir, "specs/swagger.json"), "utf-8")).toBe(spec2Content);
		});

		it("should delete and recreate directories in non-diff mode", async () => {
			// 1. 初回クロール
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			await writer1.init();
			writer1.savePage(
				"https://example.com/page1",
				"# Old Content",
				0,
				[],
				{ ...defaultMetadata, title: "Page 1" },
				null,
			);
			writer1.saveIndex();

			const pagePath = join(testOutputDir, "pages/page-001-page-1.md");
			expect(readFileSync(pagePath, "utf-8")).toContain("# Old Content");

			// 2. 2回目のクロール（非 diff モード）
			const writer2 = new OutputWriter({ ...defaultConfig, diff: false });
			await writer2.init();

			// ディレクトリが削除されたため、ファイルが存在しないことを確認
			expect(() => readFileSync(pagePath, "utf-8")).toThrow();
		});

		it("should cleanup chunks/ directory and full.md in non-diff mode", async () => {
			// 1. 初回実行: chunks/ と full.md を作成
			const chunksDir = join(testOutputDir, "chunks");
			const fullMdPath = join(testOutputDir, "full.md");

			mkdirSync(chunksDir, { recursive: true });
			writeFileSync(join(chunksDir, "chunk-001.md"), "# Chunk 1");
			writeFileSync(join(chunksDir, "chunk-002.md"), "# Chunk 2");
			writeFileSync(fullMdPath, "# Full Content");

			// ファイルが作成されたことを確認
			expect(readFileSync(join(chunksDir, "chunk-001.md"), "utf-8")).toBe("# Chunk 1");
			expect(readFileSync(join(chunksDir, "chunk-002.md"), "utf-8")).toBe("# Chunk 2");
			expect(readFileSync(fullMdPath, "utf-8")).toBe("# Full Content");

			// 2. 非 diff モードで再初期化
			const writer = new OutputWriter({ ...defaultConfig, diff: false });
			await writer.init();

			// chunks/ ディレクトリと full.md が削除されたことを確認
			expect(() => readFileSync(join(chunksDir, "chunk-001.md"), "utf-8")).toThrow();
			expect(() => readFileSync(fullMdPath, "utf-8")).toThrow();
		});

		it("should preserve chunks/ directory and full.md in diff mode", async () => {
			// 1. 初回実行: chunks/ と full.md を作成
			const chunksDir = join(testOutputDir, "chunks");
			const fullMdPath = join(testOutputDir, "full.md");

			mkdirSync(chunksDir, { recursive: true });
			writeFileSync(join(chunksDir, "chunk-001.md"), "# Chunk 1");
			writeFileSync(join(chunksDir, "chunk-002.md"), "# Chunk 2");
			writeFileSync(fullMdPath, "# Full Content");

			// ファイルが作成されたことを確認
			expect(readFileSync(join(chunksDir, "chunk-001.md"), "utf-8")).toBe("# Chunk 1");
			expect(readFileSync(join(chunksDir, "chunk-002.md"), "utf-8")).toBe("# Chunk 2");
			expect(readFileSync(fullMdPath, "utf-8")).toBe("# Full Content");

			// 2. diff モードで再初期化
			const writer = new OutputWriter({ ...defaultConfig, diff: true });
			await writer.init();

			// chunks/ ディレクトリと full.md が保持されていることを確認
			expect(readFileSync(join(chunksDir, "chunk-001.md"), "utf-8")).toBe("# Chunk 1");
			expect(readFileSync(join(chunksDir, "chunk-002.md"), "utf-8")).toBe("# Chunk 2");
			expect(readFileSync(fullMdPath, "utf-8")).toBe("# Full Content");
		});
	});
});
