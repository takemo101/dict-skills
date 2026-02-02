import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../../src/parser/converter.js";

describe("htmlToMarkdown", () => {
	describe("basic conversion", () => {
		it("should convert headings", () => {
			const html = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("# Title");
			expect(md).toContain("## Subtitle");
			expect(md).toContain("### Section");
		});

		it("should convert paragraphs", () => {
			const html = "<p>This is a paragraph.</p><p>This is another paragraph.</p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("This is a paragraph.");
			expect(md).toContain("This is another paragraph.");
		});

		it("should convert emphasis", () => {
			const html = "<p><strong>Bold</strong> and <em>italic</em></p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("**Bold**");
			expect(md).toContain("_italic_");
		});

		it("should convert links", () => {
			const html = '<p><a href="https://example.com">Link text</a></p>';
			const md = htmlToMarkdown(html);

			expect(md).toContain("[Link text](https://example.com)");
		});

		it("should convert unordered lists", () => {
			const html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("* Item 1");
			expect(md).toContain("* Item 2");
			expect(md).toContain("* Item 3");
		});

		it("should convert ordered lists", () => {
			const html = "<ol><li>First</li><li>Second</li></ol>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("1. First");
			expect(md).toContain("2. Second");
		});
	});

	describe("GFM support", () => {
		it("should convert tables", () => {
			const html = `
				<table>
					<thead>
						<tr><th>Name</th><th>Age</th></tr>
					</thead>
					<tbody>
						<tr><td>Alice</td><td>25</td></tr>
						<tr><td>Bob</td><td>30</td></tr>
					</tbody>
				</table>
			`;
			const md = htmlToMarkdown(html);

			expect(md).toContain("| Name | Age |");
			expect(md).toContain("| --- | --- |");
			expect(md).toContain("| Alice | 25 |");
			expect(md).toContain("| Bob | 30 |");
		});

		it("should convert code blocks", () => {
			const html = "<pre><code>const x = 1;</code></pre>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("```");
			expect(md).toContain("const x = 1;");
		});

		it("should convert inline code", () => {
			const html = "<p>Use <code>console.log()</code> for debugging</p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("`console.log()`");
		});

		it("should convert strikethrough", () => {
			const html = "<p><del>Deleted text</del></p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("~Deleted text~");
		});
	});

	describe("empty link removal", () => {
		it("should remove empty links", () => {
			const html = '<p><a href="https://example.com"></a>Text</p>';
			const md = htmlToMarkdown(html);

			expect(md).not.toContain("[]");
			expect(md).toContain("Text");
		});

		it("should remove whitespace-only links", () => {
			const html = '<p><a href="https://example.com">   </a>Text</p>';
			const md = htmlToMarkdown(html);

			expect(md).not.toContain("[]");
			expect(md).toContain("Text");
		});

		it("should keep links with content", () => {
			const html = '<p><a href="https://example.com">Valid link</a></p>';
			const md = htmlToMarkdown(html);

			expect(md).toContain("[Valid link](https://example.com)");
		});
	});

	describe("whitespace normalization", () => {
		it("should collapse multiple spaces", () => {
			const html = "<p>Multiple   spaces   here</p>";
			const md = htmlToMarkdown(html);

			expect(md).not.toContain("   ");
			expect(md).toContain("Multiple spaces here");
		});

		it("should remove spaces before commas", () => {
			const html = "<p>Text , more text</p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("Text, more text");
			expect(md).not.toContain("Text ,");
		});

		it("should remove spaces before periods", () => {
			const html = "<p>Text . More text</p>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("Text. More text");
			expect(md).not.toContain("Text .");
		});
	});

	describe("newline normalization", () => {
		it("should collapse three or more newlines to two", () => {
			const html = "<p>Para 1</p><br><br><br><p>Para 2</p>";
			const md = htmlToMarkdown(html);

			// Should not have 3+ consecutive newlines
			expect(md).not.toMatch(/\n{3,}/);
		});

		it("should trim whitespace from output", () => {
			const html = "  <p>Content</p>  ";
			const md = htmlToMarkdown(html);

			expect(md).toBe(md.trim());
		});
	});

	describe("edge cases", () => {
		it("should handle empty HTML", () => {
			const md = htmlToMarkdown("");

			expect(md).toBe("");
		});

		it("should handle HTML with only whitespace", () => {
			const md = htmlToMarkdown("   \n\t   ");

			expect(md).toBe("");
		});

		it("should handle nested elements", () => {
			const html = "<div><p><strong>Bold <em>and italic</em></strong></p></div>";
			const md = htmlToMarkdown(html);

			expect(md).toContain("**Bold _and italic_**");
		});

		it("should handle complex documents", () => {
			const html = `
				<article>
					<h1>Article Title</h1>
					<p>This is an introduction with <a href="/link">a link</a>.</p>
					<h2>Section</h2>
					<ul>
						<li>Point 1</li>
						<li>Point 2</li>
					</ul>
				</article>
			`;
			const md = htmlToMarkdown(html);

			expect(md).toContain("# Article Title");
			expect(md).toContain("## Section");
			expect(md).toContain("* Point 1");
			expect(md).toContain("* Point 2");
		});
	});
});
