import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../../src/parser/converter.js";

describe("htmlToMarkdown", () => {
	describe("HTML to Markdown conversion", () => {
		it("should convert basic HTML to Markdown", () => {
			const html = "<h1>Hello World</h1>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("# Hello World");
		});

		it("should convert paragraphs correctly", () => {
			const html = "<p>First paragraph</p><p>Second paragraph</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("First paragraph");
			expect(result).toContain("Second paragraph");
		});

		it("should convert links to markdown format", () => {
			const html = '<a href="https://example.com">Example Link</a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("[Example Link](https://example.com)");
		});

		it("should convert lists correctly", () => {
			const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
			const result = htmlToMarkdown(html);
			// Turndown uses * for unordered lists by default
			expect(result).toContain("Item 1");
			expect(result).toContain("Item 2");
		});
	});

	describe("Empty link removal", () => {
		it("should remove empty links", () => {
			const html = '<a href="https://example.com"></a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("");
		});

		it("should remove links with only whitespace", () => {
			const html = '<a href="https://example.com">   </a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("");
		});

		it("should keep links with content", () => {
			const html = '<a href="https://example.com">Valid Content</a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("[Valid Content](https://example.com)");
		});
	});

	describe("Multiple newline normalization", () => {
		it("should normalize 3+ newlines to 2", () => {
			const html = "<p>Para 1</p><br><br><br><p>Para 2</p>";
			const result = htmlToMarkdown(html);
			// Should not have 3+ consecutive newlines
			expect(result).not.toMatch(/\n{3,}/);
		});

		it("should keep double newlines for paragraph separation", () => {
			const html = "<p>First paragraph</p><p>Second paragraph</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("\n\n");
		});
	});

	describe("Code block conversion", () => {
		it("should convert code blocks with fenced style", () => {
			const html = "<pre><code>const x = 1;</code></pre>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("```");
			expect(result).toContain("const x = 1;");
		});

		it("should handle inline code", () => {
			const html = "<p>Use <code>console.log()</code> for debugging</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("`console.log()`");
		});

		it("should preserve language hints in code blocks", () => {
			const html = '<pre><code class="language-typescript">const x: number = 1;</code></pre>';
			const result = htmlToMarkdown(html);
			expect(result).toContain("```");
			expect(result).toContain("const x: number = 1;");
		});
	});

	describe("Additional formatting", () => {
		it("should normalize multiple spaces to single space", () => {
			const html = "<p>Multiple   spaces   here</p>";
			const result = htmlToMarkdown(html);
			expect(result).not.toMatch(/ {2,}/);
		});

		it("should remove spaces before commas", () => {
			const html = "<p>Hello , world</p>";
			const result = htmlToMarkdown(html);
			expect(result).not.toContain(" ,");
			expect(result).toContain(",");
		});

		it("should remove spaces before periods", () => {
			const html = "<p>Hello . world</p>";
			const result = htmlToMarkdown(html);
			expect(result).not.toContain(" .");
			expect(result).toContain(".");
		});

		it("should trim whitespace from result", () => {
			const html = "<p>  Content  </p>";
			const result = htmlToMarkdown(html);
			expect(result).not.toMatch(/^\s/);
			expect(result).not.toMatch(/\s$/);
		});

		it("should remove broken links", () => {
			const html = '<p>[\\[ \\]](broken-link)</p>';
			const result = htmlToMarkdown(html);
			// The broken link pattern should be cleaned up
			expect(result).not.toMatch(/\\\[\s*\\\]\([^)]*\)/);
		});
	});
});
