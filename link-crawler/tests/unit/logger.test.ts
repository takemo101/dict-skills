import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CrawlLogger } from "../../src/crawler/logger.js";
import type { CrawlConfig } from "../../src/types.js";

describe("CrawlLogger", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let baseConfig: CrawlConfig;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		baseConfig = {
			startUrl: "https://example.com",
			maxDepth: 2,
			outputDir: "./output",
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
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("logStart", () => {
		it("should log start message with URL", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("🕷️  Link Crawler v2.0"));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("https://example.com"));
		});

		it("should log maxDepth configuration", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Depth: 2"));
		});

		it("should log output directory", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Output: ./output"));
		});

		it("should log same domain setting", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Same domain only: true"));
		});

		it("should log diff mode setting", () => {
			const configWithDiff = { ...baseConfig, diff: true };
			const logger = new CrawlLogger(configWithDiff);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Diff mode: true"));
		});

		it("should log pages setting", () => {
			const configWithoutPages = { ...baseConfig, pages: false };
			const logger = new CrawlLogger(configWithoutPages);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Pages: no"));
		});

		it("should log merge setting", () => {
			const configWithMerge = { ...baseConfig, merge: true };
			const logger = new CrawlLogger(configWithMerge);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Merge: yes"));
		});

		it("should log chunks setting", () => {
			const configWithChunks = { ...baseConfig, chunks: true };
			const logger = new CrawlLogger(configWithChunks);
			logger.logStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Chunks: yes"));
		});
	});

	describe("logSkipped", () => {
		it("should log skipped message with indent based on depth", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSkipped(0);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("⏭️  Skipped (unchanged)"));
		});

		it("should increment skipped count when called", () => {
			const logger = new CrawlLogger(baseConfig);
			expect(logger.getSkippedCount()).toBe(0);

			logger.logSkipped(0);
			expect(logger.getSkippedCount()).toBe(1);

			logger.logSkipped(1);
			expect(logger.getSkippedCount()).toBe(2);
		});

		it("should use correct indentation for depth 1", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSkipped(1);

			expect(consoleLogSpy).toHaveBeenCalledWith("    ⏭️  Skipped (unchanged)");
		});

		it("should use correct indentation for depth 2", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSkipped(2);

			expect(consoleLogSpy).toHaveBeenCalledWith("      ⏭️  Skipped (unchanged)");
		});
	});

	describe("logComplete", () => {
		it("should log completion message with total pages", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logComplete(5, 2, "./output/index.json");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✅ Crawl complete!"));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Pages: 5"));
		});

		it("should log specs count", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logComplete(5, 3, "./output/index.json");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Specs: 3"));
		});

		it("should log index path", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logComplete(5, 0, "./output/index.json");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Index: ./output/index.json"));
		});

		it("should display skipped count when in diff mode and has skips", () => {
			const configWithDiff = { ...baseConfig, diff: true };
			const logger = new CrawlLogger(configWithDiff);

			// Simulate some skipped pages
			logger.logSkipped(0);
			logger.logSkipped(0);
			logger.logComplete(5, 0, "./output/index.json");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Skipped (unchanged): 2"));
		});

		it("should not display skipped count when not in diff mode", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSkipped(0);
			logger.logComplete(5, 0, "./output/index.json");

			const skippedCalls = consoleLogSpy.mock.calls.filter(
				(call) => typeof call[0] === "string" && call[0].includes("Skipped"),
			);
			expect(skippedCalls).toHaveLength(1); // Only from logSkipped, not logComplete
		});

		it("should not display skipped count when in diff mode but no skips", () => {
			const configWithDiff = { ...baseConfig, diff: true };
			const logger = new CrawlLogger(configWithDiff);
			logger.logComplete(5, 0, "./output/index.json");

			expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("Skipped (unchanged)"));
		});
	});

	describe("getSkippedCount", () => {
		it("should return 0 initially", () => {
			const logger = new CrawlLogger(baseConfig);
			expect(logger.getSkippedCount()).toBe(0);
		});

		it("should return correct count after multiple skips", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSkipped(0);
			logger.logSkipped(1);
			logger.logSkipped(2);
			expect(logger.getSkippedCount()).toBe(3);
		});
	});

	describe("other log methods", () => {
		it("should log loaded hashes when count > 0", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logLoadedHashes(5);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("📊 Loaded 5 existing page hashes"));
		});

		it("should not log loaded hashes when count is 0", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logLoadedHashes(0);

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it("should log loaded index", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logLoadedIndex(3);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("📂 Loaded existing index.json: 3 pages"));
		});

		it("should log index load failure", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logIndexLoadFailed();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("⚠️ Failed to load existing index.json"));
		});

		it("should log crawl start with correct indentation", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logCrawlStart("https://example.com/page", 1);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("→ [1] https://example.com/page"));
		});

		it("should log page saved", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logPageSaved("page-001.md", 0, 5);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Saved: page-001.md (5 links found)"));
		});

		it("should log cached page", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logPageSaved("page-001.md", 0, 5, true);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Cached: page-001.md (5 links found)"));
		});

		it("should log spec detected", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logSpecDetected("openapi", "openapi.yaml");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("📋 Spec: openapi - openapi.yaml"));
		});

		it("should log fetch error", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logFetchError("https://example.com", "Network error", 0);

			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("✗ Fetch Error: Network error"));
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("https://example.com"));
		});

		it("should log post processing start", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logPostProcessingStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("🔄 Running Post-processing..."));
		});

		it("should log post processing skipped", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logPostProcessingSkipped();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("⚠️  No pages to process"));
		});

		it("should log merger start", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logMergerStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("🔄 Running Merger..."));
		});

		it("should log merger complete", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logMergerComplete("./output/full.md");

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ full.md: ./output/full.md"));
		});

		it("should log chunker start", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logChunkerStart();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("🔄 Running Chunker..."));
		});

		it("should log chunker complete with files", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logChunkerComplete(5);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("✓ chunks: 5 files in chunks/"));
		});

		it("should log chunker complete with no files", () => {
			const logger = new CrawlLogger(baseConfig);
			logger.logChunkerComplete(0);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("ℹ️  No chunks created (content too small)"));
		});
	});
});
