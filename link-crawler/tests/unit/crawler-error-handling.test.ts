import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Crawler } from "../../src/crawler/index.js";
import type { CrawlLogger } from "../../src/crawler/logger.js";
import { FetchError, TimeoutError } from "../../src/errors.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../../src/types.js";

describe("Crawler - Error Handling", () => {
	let config: CrawlConfig;
	let mockFetcher: Fetcher;
	let mockLogger: CrawlLogger;
	let crawler: Crawler;

	beforeEach(() => {
		// 基本設定
		config = {
			startUrl: "https://example.com",
			outputDir: "/tmp/test-output",
			maxDepth: 2,
			delay: 0,
			timeout: 5000,
			spaWait: 100,
			sameDomain: true,
			diff: false,
			pages: true,
			merge: false,
			chunks: false,
			headed: false,
			keepSession: false,
		};

		// Fetcherモック
		mockFetcher = {
			fetch: vi.fn(),
			close: vi.fn(),
		};

		// Crawlerインスタンス作成
		crawler = new Crawler(config, mockFetcher);

		// @ts-expect-error - private property access for testing
		mockLogger = crawler.logger;

		// logFetchErrorをスパイ
		vi.spyOn(mockLogger, "logFetchError");
		vi.spyOn(mockLogger, "logDebug");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("fetch() が null を返す場合", () => {
		it("logFetchError() が呼ばれ、クロールは続行する", async () => {
			// fetch() が null を返す（404等）
			(mockFetcher.fetch as Mock).mockResolvedValue(null);

			// クロール実行（エラーでスローされないことを確認）
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() が呼ばれたことを確認
			expect(mockLogger.logFetchError).toHaveBeenCalledWith(
				"https://example.com",
				"Page not available (404 or error page)",
				0,
			);

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("fetch() が FetchError をスローする場合", () => {
		it("エラーがキャッチされ、logFetchError() が呼ばれ、クロールは続行する", async () => {
			const fetchError = new FetchError("Failed to open page: Network error", "https://example.com");
			(mockFetcher.fetch as Mock).mockRejectedValue(fetchError);

			// クロール実行（エラーでスローされないことを確認）
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() が呼ばれたことを確認
			expect(mockLogger.logFetchError).toHaveBeenCalledWith(
				"https://example.com",
				"Failed to open page: Network error",
				0,
			);

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("fetch() が TimeoutError をスローする場合", () => {
		it("エラーがキャッチされ、logFetchError() が呼ばれ、クロールは続行する", async () => {
			const timeoutError = new TimeoutError("Request timeout after 5s (5000ms)", 5000);
			(mockFetcher.fetch as Mock).mockRejectedValue(timeoutError);

			// クロール実行（エラーでスローされないことを確認）
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() が呼ばれたことを確認
			expect(mockLogger.logFetchError).toHaveBeenCalledWith(
				"https://example.com",
				"Request timeout after 5s (5000ms)",
				0,
			);

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("fetch() が汎用 Error をスローする場合", () => {
		it("エラーがキャッチされ、logFetchError() が呼ばれ、クロールは続行する", async () => {
			const genericError = new Error("Unknown error occurred");
			(mockFetcher.fetch as Mock).mockRejectedValue(genericError);

			// クロール実行（エラーでスローされないことを確認）
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() が呼ばれたことを確認
			expect(mockLogger.logFetchError).toHaveBeenCalledWith(
				"https://example.com",
				"Unknown error occurred",
				0,
			);

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("fetch() が非Errorオブジェクトをスローする場合", () => {
		it("文字列に変換され、logFetchError() が呼ばれ、クロールは続行する", async () => {
			(mockFetcher.fetch as Mock).mockRejectedValue("String error");

			// クロール実行（エラーでスローされないことを確認）
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() が呼ばれたことを確認
			expect(mockLogger.logFetchError).toHaveBeenCalledWith("https://example.com", "String error", 0);

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("fetch() が成功した場合", () => {
		it("logFetchError() は呼ばれず、通常の処理が続行される", async () => {
			const successResult: FetchResult = {
				html: "<html><head><title>Test</title></head><body><p>Content</p></body></html>",
				finalUrl: "https://example.com",
				contentType: "text/html",
			};
			(mockFetcher.fetch as Mock).mockResolvedValue(successResult);

			// クロール実行
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// logFetchError() は呼ばれない
			expect(mockLogger.logFetchError).not.toHaveBeenCalled();

			// fetch() は1回だけ呼ばれる
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("複数ページのクロールでエラーが発生した場合", () => {
		it("エラーページはスキップされ、他のページは正常にクロールされる", async () => {
			// 1ページ目: 成功
			const successResult: FetchResult = {
				html: '<html><head><title>Page 1</title></head><body><a href="https://example.com/page2">Link</a></body></html>',
				finalUrl: "https://example.com",
				contentType: "text/html",
			};

			// 2ページ目: エラー
			const fetchError = new FetchError("Network error", "https://example.com/page2");

			(mockFetcher.fetch as Mock)
				.mockResolvedValueOnce(successResult) // 1回目: 成功
				.mockRejectedValueOnce(fetchError); // 2回目: エラー

			// クロール実行
			// @ts-expect-error - private method access for testing
			await expect(crawler.crawl("https://example.com", 0)).resolves.toBeUndefined();

			// fetch() は2回呼ばれる（1ページ目 + 2ページ目）
			expect(mockFetcher.fetch).toHaveBeenCalledTimes(2);

			// logFetchError() は1回だけ呼ばれる（2ページ目のエラー）
			expect(mockLogger.logFetchError).toHaveBeenCalledTimes(1);
			expect(mockLogger.logFetchError).toHaveBeenCalledWith(
				"https://example.com/page2",
				"Network error",
				1, // depth 1
			);
		});
	});
});
