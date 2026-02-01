import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Chunker } from "../../src/output/chunker.js";
import type { CrawledPage, PageMetadata } from "../../src/types.js";

const testOutputDir = "./test-output-chunker";

const createPage = (
	url: string,
	title: string | null,
	file: string,
): CrawledPage => ({
	url,
	title,
	file,
	depth: 0,
	links: [],
	metadata: {
		title,
		description: null,
		keywords: null,
		author: null,
		ogTitle: null,
		ogType: null,
	},
	hash: "abc123",
	crawledAt: new Date().toISOString(),
});

describe("Chunker", () => {
	beforeEach(() => {
		mkdirSync(testOutputDir, { recursive: true });
		mkdirSync(join(testOutputDir, "chunks"), { recursive: true });
	});

	afterEach(() => {
		rmSync(testOutputDir, { recursive: true, force: true });
	});

	describe("chunk", () => {
		it("should return empty array for empty content", () => {
			const chunker = new Chunker(testOutputDir);
			const result = chunker.chunk("");
			expect(result).toEqual([]);
		});

		it("should return single chunk for small content", () => {
			const chunker = new Chunker(testOutputDir);
			const content = "Small content.";
			const result = chunker.chunk(content);
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(content);
		});

		it("should split large content into multiple chunks", () => {
			const chunker = new Chunker(testOutputDir, { chunkSize: 50, overlap: 10 });
			const content = "Paragraph 1 with more text\n\nParagraph 2 with more text\n\nParagraph 3 with more text\n\nParagraph 4 with more text";
			const result = chunker.chunk(content);
			expect(result.length).toBeGreaterThan(1);
		});
	});

	describe("writeChunks", () => {
		it("should write chunk files", () => {
			const chunker = new Chunker(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Page 1\n\nThis is content that should be chunked.".repeat(50)],
			]);

			const chunkFiles = chunker.writeChunks(pages, pageContents);

			expect(chunkFiles.length).toBeGreaterThan(0);
			for (const file of chunkFiles) {
				const chunkPath = join(testOutputDir, file);
				expect(existsSync(chunkPath)).toBe(true);
			}
		});

		it("should include source URL and title in chunks", () => {
			const chunker = new Chunker(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Page 1\n\nThis is content that should be chunked.".repeat(50)],
			]);

			const chunkFiles = chunker.writeChunks(pages, pageContents);
			const chunkPath = join(testOutputDir, chunkFiles[0]);
			const content = readFileSync(chunkPath, "utf-8");

			expect(content).toContain("Source: https://example.com/page1");
			expect(content).toContain("Chunk 1 - Page 1");
		});

		it("should handle empty content gracefully", () => {
			const chunker = new Chunker(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
			];
			const pageContents = new Map([["pages/page-001.md", ""]]);

			const chunkFiles = chunker.writeChunks(pages, pageContents);

			expect(chunkFiles).toEqual([]);
		});
	});

	describe("generateIndex", () => {
		it("should generate chunk index", () => {
			const chunker = new Chunker(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Page 1\n\nThis is content that should be chunked.".repeat(50)],
			]);

			const index = chunker.generateIndex(pages, pageContents);

			expect(index.length).toBeGreaterThan(0);
			expect(index[0]).toHaveProperty("id");
			expect(index[0]).toHaveProperty("file");
			expect(index[0]).toHaveProperty("sourceUrl");
			expect(index[0]).toHaveProperty("sourceTitle");
			expect(index[0]).toHaveProperty("part");
			expect(index[0]).toHaveProperty("totalParts");
		});
	});
});
