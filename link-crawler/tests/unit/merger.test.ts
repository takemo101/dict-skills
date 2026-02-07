import { mkdirSync, rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Merger } from "../../src/output/merger.js";
import type { CrawledPage } from "../../src/types.js";

const testOutputDir = "./test-output-merger";

const createPage = (url: string, title: string | null, file: string): CrawledPage => ({
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
	hash: "",
	crawledAt: new Date().toISOString(),
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

	describe("buildFullContent", () => {
		it("should build full markdown content without writing to file", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", "Page 1", "pages/page-001.md")];
			const pageContents = new Map([["pages/page-001.md", "# Page 1\n\nThis is content."]]);

			const result = merger.buildFullContent(pages, pageContents);

			expect(result).toContain("# Page 1");
			expect(result).toContain("> Source: https://example.com/page1");
			expect(result).toContain("This is content.");
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

			const result = merger.buildFullContent(pages, pageContents);

			expect(result).toContain("---");
			expect(result).toContain("Content 1");
			expect(result).toContain("Content 2");
			// Should have 1 separator for 2 pages
			const separatorMatches = result.match(/---/g);
			expect(separatorMatches).toHaveLength(1);
		});

		it("should handle empty pages array", () => {
			const merger = new Merger(testOutputDir);
			const pages: CrawledPage[] = [];
			const pageContents = new Map<string, string>();

			const result = merger.buildFullContent(pages, pageContents);

			expect(result).toBe("");
		});

		it("should use URL as title when title is null", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", null, "pages/page-001.md")];
			const pageContents = new Map([["pages/page-001.md", "# Original Title\n\nContent"]]);

			const result = merger.buildFullContent(pages, pageContents);

			expect(result).toContain("# https://example.com/page1");
			expect(result).toContain("Content");
		});

		it("should strip frontmatter and title from content", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", "Page 1", "pages/page-001.md")];
			const pageContents = new Map([
				[
					"pages/page-001.md",
					`---
title: Page 1
url: https://example.com/page1
---

# Page 1

Content after frontmatter`,
				],
			]);

			const result = merger.buildFullContent(pages, pageContents);

			expect(result).toContain("# Page 1");
			expect(result).toContain("Content after frontmatter");
			// Should not have duplicate title
			const titleMatches = result.match(/# Page 1/g);
			expect(titleMatches).toHaveLength(1);
		});
	});
});
