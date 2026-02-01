import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Merger } from "../../src/output/merger.js";
import type { CrawledPage, PageMetadata } from "../../src/types.js";

const testOutputDir = "./test-output-merger";

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
});

describe("Merger", () => {
	beforeEach(() => {
		mkdirSync(testOutputDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testOutputDir, { recursive: true, force: true });
	});

	describe("stripTitle", () => {
		it("should remove H1 title from markdown", () => {
			const merger = new Merger(testOutputDir);
			const markdown = "# Page Title\n\nSome content here.";

			const result = merger.stripTitle(markdown);

			expect(result).toBe("Some content here.");
		});

		it("should handle markdown without H1", () => {
			const merger = new Merger(testOutputDir);
			const markdown = "Some content without title.";

			const result = merger.stripTitle(markdown);

			expect(result).toBe("Some content without title.");
		});

		it("should skip frontmatter and remove H1", () => {
			const merger = new Merger(testOutputDir);
			const markdown = `---
url: https://example.com
title: "Test"
---

# Page Title

Content after title.`;

			const result = merger.stripTitle(markdown);

			expect(result).toBe("Content after title.");
		});

		it("should remove multiple blank lines after title", () => {
			const merger = new Merger(testOutputDir);
			const markdown = "# Title\n\n\n\nContent";

			const result = merger.stripTitle(markdown);

			expect(result).toBe("Content");
		});
	});

	describe("merge", () => {
		it("should return empty string for empty pages", () => {
			const merger = new Merger(testOutputDir);

			const result = merger.merge([]);

			expect(result).toBe("");
		});

		it("should merge multiple pages with headers", () => {
			const merger = new Merger(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
				createPage("https://example.com/page2", "Page 2", "pages/page-002.md"),
			];

			const result = merger.merge(pages);

			expect(result).toContain("# Page 1");
			expect(result).toContain("> Source: https://example.com/page1");
			expect(result).toContain("# Page 2");
			expect(result).toContain("> Source: https://example.com/page2");
			expect(result).toContain("---");
		});

		it("should use URL as title if title is null", () => {
			const merger = new Merger(testOutputDir);
			const pages = [
				createPage("https://example.com/untitled", null, "pages/page-001.md"),
			];

			const result = merger.merge(pages);

			expect(result).toContain("# https://example.com/untitled");
		});
	});

	describe("writeFull", () => {
		it("should write full.md file", () => {
			const merger = new Merger(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Page 1\n\nThis is content."],
			]);

			const outputPath = merger.writeFull(pages, pageContents);

			expect(outputPath).toBe(join(testOutputDir, "full.md"));
			const content = readFileSync(outputPath, "utf-8");
			expect(content).toContain("# Page 1");
			expect(content).toContain("> Source: https://example.com/page1");
			expect(content).toContain("This is content.");
		});

		it("should merge multiple pages with separators", () => {
			const merger = new Merger(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Page 1", "pages/page-001.md"),
				createPage("https://example.com/page2", "Page 2", "pages/page-002.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Page 1\n\nContent 1"],
				["pages/page-002.md", "# Page 2\n\nContent 2"],
			]);

			const outputPath = merger.writeFull(pages, pageContents);

			const content = readFileSync(outputPath, "utf-8");
			expect(content).toContain("---");
			expect(content).toContain("Content 1");
			expect(content).toContain("Content 2");
		});
	});
});
