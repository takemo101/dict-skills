import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
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
			const pages = [createPage("https://example.com/untitled", null, "pages/page-001.md")];

			const result = merger.merge(pages);

			expect(result).toContain("# https://example.com/untitled");
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

	describe("writeFull", () => {
		it("should write full.md file", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", "Page 1", "pages/page-001.md")];
			const pageContents = new Map([["pages/page-001.md", "# Page 1\n\nThis is content."]]);

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

		it("should handle duplicate titles across pages", () => {
			const merger = new Merger(testOutputDir);
			const pages = [
				createPage("https://example.com/page1", "Same Title", "pages/page-001.md"),
				createPage("https://example.com/page2", "Same Title", "pages/page-002.md"),
			];
			const pageContents = new Map([
				["pages/page-001.md", "# Same Title\n\nContent from page 1"],
				["pages/page-002.md", "# Same Title\n\nContent from page 2"],
			]);

			const outputPath = merger.writeFull(pages, pageContents);

			const content = readFileSync(outputPath, "utf-8");
			// Both pages should be present with their content
			expect(content).toContain("Content from page 1");
			expect(content).toContain("Content from page 2");
			// Headers should appear for both pages
			const headerMatches = content.match(/# Same Title/g);
			expect(headerMatches).toHaveLength(2);
		});

		it("should handle empty content in pageContents", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", "Page 1", "pages/page-001.md")];
			const pageContents = new Map<string, string>([]);

			const outputPath = merger.writeFull(pages, pageContents);

			const content = readFileSync(outputPath, "utf-8");
			expect(content).toContain("# Page 1");
			expect(content).toContain("> Source: https://example.com/page1");
			// Should handle missing content gracefully
			expect(content).not.toContain("undefined");
		});

		it("should handle pages with empty markdown content", () => {
			const merger = new Merger(testOutputDir);
			const pages = [createPage("https://example.com/page1", "Page 1", "pages/page-001.md")];
			const pageContents = new Map([["pages/page-001.md", ""]]);

			const outputPath = merger.writeFull(pages, pageContents);

			const content = readFileSync(outputPath, "utf-8");
			expect(content).toContain("# Page 1");
			expect(content).toContain("> Source: https://example.com/page1");
		});

		it("should handle many pages efficiently", () => {
			const merger = new Merger(testOutputDir);
			const pages: CrawledPage[] = [];
			const pageContents = new Map<string, string>();

			for (let i = 1; i <= 10; i++) {
				const file = `pages/page-${String(i).padStart(3, "0")}.md`;
				pages.push(createPage(`https://example.com/page${i}`, `Page ${i}`, file));
				pageContents.set(file, `# Page ${i}\n\nContent ${i}`);
			}

			const outputPath = merger.writeFull(pages, pageContents);

			const content = readFileSync(outputPath, "utf-8");
			expect(content).toContain("# Page 1");
			expect(content).toContain("# Page 10");
			expect(content).toContain("Content 1");
			expect(content).toContain("Content 10");
			// Should have 9 separators for 10 pages
			const separatorMatches = content.match(/---/g);
			expect(separatorMatches).toHaveLength(9);
		});
	});
});
