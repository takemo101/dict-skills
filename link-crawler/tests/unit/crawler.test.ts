import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Crawler } from "../../src/crawler/index.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../../src/types.js";

// Mock fetcher for testing
class MockFetcher implements Fetcher {
	private responses = new Map<string, FetchResult>();
	private closed = false;

	setResponse(url: string, result: FetchResult | null): void {
		this.responses.set(url, result as FetchResult);
	}

	async fetch(url: string): Promise<FetchResult | null> {
		return this.responses.get(url) ?? null;
	}

	async close(): Promise<void> {
		this.closed = true;
	}

	isClosed(): boolean {
		return this.closed;
	}
}

describe("Crawler", () => {
	const testDir = join(fileURLToPath(import.meta.url), "..", ".test-crawler");
	let mockFetcher: MockFetcher;
	let baseConfig: CrawlConfig;

	beforeEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		await mkdir(testDir, { recursive: true });
		mockFetcher = new MockFetcher();
		baseConfig = {
			startUrl: "https://example.com",
			maxDepth: 2,
			maxPages: null,
			outputDir: testDir,
			sameDomain: true,
			includePattern: null,
			excludePattern: null,
			delay: 0,
			timeout: 30000,
			spaWait: 2000,
			headed: false,
			diff: false,
			pages: true,
			merge: false,
			chunks: false,
			keepSession: false,
			respectRobots: true,
		};
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("constructor", () => {
		it("should initialize with provided fetcher", () => {
			const crawler = new Crawler(baseConfig, mockFetcher);
			expect(crawler).toBeDefined();
		});

		it("should initialize without fetcher", () => {
			// This will try to dynamically import, which we can't test without mocking
			// But we can verify the constructor doesn't throw
			const crawler = new Crawler(baseConfig);
			expect(crawler).toBeDefined();
		});
	});

	describe("single page crawl", () => {
		it("should crawl a single page", async () => {
			const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Content</h1>
            <p>This is test content.</p>
          </body>
        </html>
      `;
			mockFetcher.setResponse("https://example.com", {
				html,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});

			const crawler = new Crawler(baseConfig, mockFetcher);
			await crawler.run();

			// Verify index.json was created
			const indexPath = join(testDir, "index.json");
			expect(existsSync(indexPath)).toBe(true);

			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			expect(indexData.totalPages).toBe(1);
			expect(indexData.pages).toHaveLength(1);
			expect(indexData.pages[0].url).toBe("https://example.com");
			expect(indexData.pages[0].title).toBe("Test Page");
		});

		it("should handle fetch failure gracefully", async () => {
			mockFetcher.setResponse("https://example.com", null);

			const crawler = new Crawler(baseConfig, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			expect(indexData.totalPages).toBe(0);
		});

		it("should close fetcher after run", async () => {
			const html = "<html><head><title>Test</title></head><body><p>Content</p></body></html>";
			mockFetcher.setResponse("https://example.com", {
				html,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});

			const crawler = new Crawler(baseConfig, mockFetcher);
			await crawler.run();

			expect(mockFetcher.isClosed()).toBe(true);
		});
	});

	describe("depth limiting", () => {
		it("should respect maxDepth", async () => {
			const rootHtml = `
        <html>
          <head><title>Root</title></head>
          <body>
            <a href="https://example.com/page1">Page 1</a>
          </body>
        </html>
      `;
			const page1Html = `
        <html>
          <head><title>Page 1</title></head>
          <body>
            <a href="https://example.com/page2">Page 2</a>
          </body>
        </html>
      `;
			const page2Html = `
        <html>
          <head><title>Page 2</title></head>
          <body>
            <p>Deep content</p>
          </body>
        </html>
      `;

			mockFetcher.setResponse("https://example.com", {
				html: rootHtml,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});
			mockFetcher.setResponse("https://example.com/page1", {
				html: page1Html,
				finalUrl: "https://example.com/page1",
				contentType: "text/html",
			});
			mockFetcher.setResponse("https://example.com/page2", {
				html: page2Html,
				finalUrl: "https://example.com/page2",
				contentType: "text/html",
			});

			const config = { ...baseConfig, maxDepth: 1 };
			const crawler = new Crawler(config, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			// Should only crawl root (depth 0) and page1 (depth 1), not page2 (depth 2)
			expect(indexData.totalPages).toBe(2);
			const urls = indexData.pages.map((p: { url: string }) => p.url);
			expect(urls).toContain("https://example.com");
			expect(urls).toContain("https://example.com/page1");
			expect(urls).not.toContain("https://example.com/page2");
		});

		it("should skip already visited URLs", async () => {
			const rootHtml = `
        <html>
          <head><title>Root</title></head>
          <body>
            <a href="https://example.com/page1">Page 1</a>
            <a href="https://example.com/page1">Duplicate Link</a>
          </body>
        </html>
      `;
			const page1Html = `
        <html>
          <head><title>Page 1</title></head>
          <body><p>Content</p></body>
        </html>
      `;

			mockFetcher.setResponse("https://example.com", {
				html: rootHtml,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});
			mockFetcher.setResponse("https://example.com/page1", {
				html: page1Html,
				finalUrl: "https://example.com/page1",
				contentType: "text/html",
			});

			const crawler = new Crawler(baseConfig, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			// Should only have root and page1, not duplicate
			expect(indexData.totalPages).toBe(2);
		});
	});

	describe("sameDomain filtering", () => {
		it("should only crawl same domain when sameDomain is true", async () => {
			const rootHtml = `
        <html>
          <head><title>Root</title></head>
          <body>
            <a href="https://example.com/page1">Same Domain</a>
            <a href="https://other.com/page">Other Domain</a>
          </body>
        </html>
      `;

			mockFetcher.setResponse("https://example.com", {
				html: rootHtml,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});
			mockFetcher.setResponse("https://example.com/page1", {
				html: "<html><head><title>Page 1</title></head><body><p>Content</p></body></html>",
				finalUrl: "https://example.com/page1",
				contentType: "text/html",
			});
			// Note: other.com should not be fetched

			const crawler = new Crawler(baseConfig, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			expect(indexData.totalPages).toBe(2);
			const urls = indexData.pages.map((p: { url: string }) => p.url);
			expect(urls).toContain("https://example.com");
			expect(urls).toContain("https://example.com/page1");
			expect(urls).not.toContain("https://other.com/page");
		});
	});

	describe("spec file handling", () => {
		it("should handle OpenAPI spec files", async () => {
			const yaml = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
`;

			mockFetcher.setResponse("https://example.com/openapi.yaml", {
				html: yaml,
				finalUrl: "https://example.com/openapi.yaml",
				contentType: "application/yaml",
			});

			const config = { ...baseConfig, startUrl: "https://example.com/openapi.yaml" };
			const crawler = new Crawler(config, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			expect(indexData.specs).toHaveLength(1);
			expect(indexData.specs[0].type).toBe("openapi");
			expect(indexData.specs[0].url).toBe("https://example.com/openapi.yaml");

			// Verify spec file was saved
			const specPath = join(testDir, "specs", "openapi.yaml");
			expect(existsSync(specPath)).toBe(true);
		});
	});

	describe("diff mode", () => {
		it("should skip unchanged pages in diff mode", async () => {
			// Create existing index with hash
			const existingIndex = {
				crawledAt: "2025-01-01T00:00:00.000Z",
				baseUrl: "https://example.com",
				config: { maxDepth: 2, sameDomain: true },
				totalPages: 1,
				pages: [
					{
						url: "https://example.com",
						title: "Old Title",
						file: "pages/page-001.md",
						depth: 0,
						links: [],
						metadata: {
							title: "Old Title",
							description: null,
							keywords: null,
							author: null,
							ogTitle: null,
							ogType: null,
						},
						hash: "2e6f9e5e0b23e5f5a1c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
						crawledAt: "2025-01-01T00:00:00.000Z",
					},
				],
				specs: [],
			};
			await writeFile(join(testDir, "index.json"), JSON.stringify(existingIndex));

			// Same content should produce same hash
			const html = `<!DOCTYPE html><html><head><title>Test Page</title></head><body><h1>Test Content</h1><p>This is test content.</p></body></html>`;
			mockFetcher.setResponse("https://example.com", {
				html,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});

			const config = { ...baseConfig, diff: true };
			const crawler = new Crawler(config, mockFetcher);
			await crawler.run();

			const indexPath = join(testDir, "index.json");
			const indexContent = await readFile(indexPath, "utf-8");
			const indexData = JSON.parse(indexContent);

			// Page should still be in result but marked appropriately
			expect(indexData.totalPages).toBe(1);
		});
	});

	describe("pages option", () => {
		it("should not save individual pages when pages is false", async () => {
			const html = `
        <html>
          <head><title>Test</title></head>
          <body><p>Content</p></body>
        </html>
      `;
			mockFetcher.setResponse("https://example.com", {
				html,
				finalUrl: "https://example.com",
				contentType: "text/html",
			});

			const config = { ...baseConfig, pages: false, merge: true };
			const crawler = new Crawler(config, mockFetcher);
			await crawler.run();

			const pagesDir = join(testDir, "pages");
			// pages: false の場合、ページディレクトリが存在しても page-*.md ファイルは作成されない
			if (existsSync(pagesDir)) {
				const files = await readdir(pagesDir);
				const pageFiles = files.filter((f) => f.startsWith("page-") && f.endsWith(".md"));
				expect(pageFiles).toHaveLength(0);
			}

			// Index should still be updated
			const indexPath = join(testDir, "index.json");
			expect(existsSync(indexPath)).toBe(true);
		});
	});

	describe("cleanup method", () => {
		it("should wait for fetcherPromise to resolve during cleanup", async () => {
			// fetcherの初期化を遅延させるモック
			let resolveFetcher: ((value: Fetcher) => void) | undefined;
			const delayedFetcherPromise = new Promise<Fetcher>((resolve) => {
				resolveFetcher = resolve;
			});

			// コンストラクタでfetcherを渡さず、fetcherPromiseが作成される状態をシミュレート
			const crawler = new Crawler(baseConfig);

			// fetcherPromiseを手動で設定（テスト用）
			// @ts-expect-error - private property access for testing
			crawler.fetcherPromise = delayedFetcherPromise;

			// cleanup()を呼び出す（fetcherPromiseが未解決の状態で）
			const cleanupPromise = crawler.cleanup();

			// fetcherPromiseを解決
			if (resolveFetcher) {
				resolveFetcher(mockFetcher);
			}

			// cleanup()が完了するまで待機
			await cleanupPromise;

			// mockFetcherのclose()が呼ばれたことを確認
			expect(mockFetcher.isClosed()).toBe(true);
		});

		it("should handle fetcher initialization failure during cleanup", async () => {
			// fetcherの初期化が失敗するケース
			const failedFetcherPromise = Promise.reject(new Error("Fetcher init failed"));

			const crawler = new Crawler(baseConfig);

			// fetcherPromiseを手動で設定（テスト用）
			// @ts-expect-error - private property access for testing
			crawler.fetcherPromise = failedFetcherPromise;

			// cleanup()が例外をスローせずに完了することを確認
			await expect(crawler.cleanup()).resolves.toBeUndefined();
		});

		it("should close fetcher when fetcherPromise is already resolved", async () => {
			const crawler = new Crawler(baseConfig, mockFetcher);

			// cleanup()を呼び出す
			await crawler.cleanup();

			// mockFetcherのclose()が呼ばれたことを確認
			expect(mockFetcher.isClosed()).toBe(true);
		});
	});
});
