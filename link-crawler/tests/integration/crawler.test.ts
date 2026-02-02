import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { Crawler } from "../../src/crawler/index.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../../src/types.js";

/** テスト用のモックFetcher */
class MockFetcher implements Fetcher {
	private responses: Map<string, { html: string; contentType: string }>;

	constructor(responses: Record<string, { html: string; contentType: string }>) {
		this.responses = new Map(Object.entries(responses));
	}

	async fetch(url: string): Promise<FetchResult | null> {
		const response = this.responses.get(url);
		if (!response) {
			return null;
		}
		return {
			html: response.html,
			finalUrl: url,
			contentType: response.contentType,
		};
	}

	async close(): Promise<void> {
		// 何もしない
	}
}

/** テスト用HTMLを生成 */
function createTestHtml(options: {
	title?: string;
	content?: string;
	links?: string[];
}): string {
	const { title = "Test Page", content = "Test content", links = [] } = options;
	const linkTags = links
		.map((link) => `<a href="${link}">${link}</a>`)
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head>
	<title>${title}</title>
	<meta name="description" content="Test description">
</head>
<body>
	<article>
		<h1>${title}</h1>
		<p>${content}</p>
		${linkTags}
	</article>
</body>
</html>`;
}

/** テスト設定を生成 */
function createTestConfig(
	outputDir: string,
	overrides: Partial<CrawlConfig> = {},
): CrawlConfig {
	return {
		startUrl: "https://example.com",
		maxDepth: 1,
		outputDir,
		sameDomain: true,
		includePattern: null,
		excludePattern: null,
		delay: 0,
		timeout: 30000,
		spaWait: 0,
		headed: false,
		diff: false,
		pages: true,
		merge: false,
		chunks: false,
		...overrides,
	};
}

describe("Crawler Integration", () => {
	const testDir = join(import.meta.dirname, ".test-output");

	beforeEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Basic crawling", () => {
		it("should crawl a single page and save as Markdown", async () => {
			// Arrange
			const config = createTestConfig(testDir);
			const html = createTestHtml({
				title: "Hello World",
				content: "This is a test page content.",
			});
			const fetcher = new MockFetcher({
				"https://example.com": { html, contentType: "text/html" },
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			expect(existsSync(indexPath)).toBe(true);

			const indexContent = await readFile(indexPath, "utf-8");
			const index = JSON.parse(indexContent);

			expect(index.totalPages).toBe(1);
			expect(index.pages[0].url).toBe("https://example.com");
			expect(index.pages[0].title).toBe("Hello World");
			expect(index.pages[0].depth).toBe(0);

			const pagePath = join(testDir, index.pages[0].file);
			expect(existsSync(pagePath)).toBe(true);

			const pageContent = await readFile(pagePath, "utf-8");
			expect(pageContent).toContain("Hello World");
			expect(pageContent).toContain("test page content");
			expect(pageContent).toContain("---"); // frontmatter
		});

		it("should crawl multiple linked pages", async () => {
			// Arrange
			const config = createTestConfig(testDir, { maxDepth: 2 });
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Home",
						content: "Home page",
						links: ["https://example.com/about"],
					}),
					contentType: "text/html",
				},
				"https://example.com/about": {
					html: createTestHtml({
						title: "About",
						content: "About page",
					}),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			expect(index.totalPages).toBe(2);
			expect(index.pages.map((p: { url: string }) => p.url)).toContain(
				"https://example.com",
			);
			expect(index.pages.map((p: { url: string }) => p.url)).toContain(
				"https://example.com/about",
			);
		});

		it("should respect sameDomain option", async () => {
			// Arrange
			const config = createTestConfig(testDir, {
				maxDepth: 2,
				sameDomain: true,
			});
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Home",
						content: "Home page",
						links: [
							"https://example.com/page1",
							"https://other-site.com/external",
						],
					}),
					contentType: "text/html",
				},
				"https://example.com/page1": {
					html: createTestHtml({ title: "Page 1", content: "Internal page" }),
					contentType: "text/html",
				},
				"https://other-site.com/external": {
					html: createTestHtml({ title: "External", content: "External page" }),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			// 同一ドメインのみクロールされる
			expect(index.totalPages).toBe(2);
			expect(index.pages.map((p: { url: string }) => p.url)).not.toContain(
				"https://other-site.com/external",
			);
		});

		it("should handle fetch errors gracefully", async () => {
			// Arrange
			const config = createTestConfig(testDir);
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Home",
						content: "Home page",
						links: ["https://example.com/error-page"],
					}),
					contentType: "text/html",
				},
				// error-page はレスポンスなし（nullを返す）
			});
			const crawler = new Crawler(config, fetcher);

			// Act - エラーがスローされないことを確認
			await expect(crawler.run()).resolves.not.toThrow();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			// エラーページはスキップされ、ホームページのみクロールされる
			expect(index.totalPages).toBe(1);
		});
	});

	describe("Depth control", () => {
		it("should respect maxDepth option", async () => {
			// Arrange
			const config = createTestConfig(testDir, { maxDepth: 1 });
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Depth 0",
						content: "Root page",
						links: ["https://example.com/level1"],
					}),
					contentType: "text/html",
				},
				"https://example.com/level1": {
					html: createTestHtml({
						title: "Depth 1",
						content: "Level 1 page",
						links: ["https://example.com/level2"],
					}),
					contentType: "text/html",
				},
				"https://example.com/level2": {
					html: createTestHtml({ title: "Depth 2", content: "Level 2 page" }),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			// maxDepth=1なので、level2はクロールされない
			expect(index.totalPages).toBe(2);
			expect(index.pages.map((p: { url: string }) => p.url)).not.toContain(
				"https://example.com/level2",
			);
		});
	});

	describe("Output options", () => {
		it("should generate full.md when merge option is enabled", async () => {
			// Arrange
			const config = createTestConfig(testDir, {
				maxDepth: 1,
				merge: true,
				pages: false, // 個別ページは作成しない
			});
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({ title: "Page 1", content: "Content 1" }),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const fullMdPath = join(testDir, "full.md");
			expect(existsSync(fullMdPath)).toBe(true);

			const fullContent = await readFile(fullMdPath, "utf-8");
			expect(fullContent).toContain("Page 1");
			expect(fullContent).toContain("Content 1");
		});

		it("should generate chunks when chunks option is enabled", async () => {
			// Arrange
			const config = createTestConfig(testDir, {
				maxDepth: 1,
				merge: true,
				chunks: true,
				pages: false,
			});
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Test Page",
						content: "A".repeat(5000), // 大きなコンテンツ
					}),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const chunksDir = join(testDir, "chunks");
			expect(existsSync(chunksDir)).toBe(true);

			const chunkFiles = await readdir(chunksDir);
			expect(chunkFiles.length).toBeGreaterThan(0);
			expect(chunkFiles.some((f) => f.endsWith(".md"))).toBe(true);
		});

		it("should not generate pages when pages option is false", async () => {
			// Arrange
			const config = createTestConfig(testDir, {
				pages: false,
				merge: false,
				chunks: false,
			});
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({ title: "Test", content: "Content" }),
					contentType: "text/html",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			expect(index.totalPages).toBe(1);

			// pagesディレクトリにファイルがないことを確認
			const pagesDir = join(testDir, "pages");
			const pageFiles = await readdir(pagesDir);
			const mdFiles = pageFiles.filter((f) => f.endsWith(".md"));
			expect(mdFiles.length).toBe(0);
		});
	});

	describe("Spec file handling", () => {
		it("should detect and save OpenAPI spec files", async () => {
			// Arrange
			const config = createTestConfig(testDir);
			const fetcher = new MockFetcher({
				"https://example.com": {
					html: createTestHtml({
						title: "Home",
						content: "Home page",
						links: ["https://example.com/openapi.json"],
					}),
					contentType: "text/html",
				},
				"https://example.com/openapi.json": {
					html: '{"openapi": "3.0.0"}',
					contentType: "application/json",
				},
			});
			const crawler = new Crawler(config, fetcher);

			// Act
			await crawler.run();

			// Assert
			const indexPath = join(testDir, "index.json");
			const index = JSON.parse(await readFile(indexPath, "utf-8"));

			expect(index.specs.length).toBe(1);
			expect(index.specs[0].url).toBe("https://example.com/openapi.json");
			expect(index.specs[0].type).toBe("openapi");

			const specPath = join(testDir, index.specs[0].file);
			expect(existsSync(specPath)).toBe(true);
		});
	});
});
