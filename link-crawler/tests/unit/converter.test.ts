import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../../src/parser/converter.js";

describe("htmlToMarkdown", () => {
	describe("HTML to Markdown conversion", () => {
		it("should convert basic HTML to Markdown", () => {
			const html = "<h1>Hello World</h1>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("# Hello World");
		});

		it("should convert h1 to # heading", () => {
			const html = "<h1>Title</h1>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("# Title");
		});

		it("should convert h2 to ## heading", () => {
			const html = "<h2>Subtitle</h2>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("## Subtitle");
		});

		it("should convert p to paragraph", () => {
			const html = "<p>This is a paragraph.</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("This is a paragraph.");
		});

		it("should convert strong to bold", () => {
			const html = "<strong>bold text</strong>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("**bold text**");
		});

		it("should convert em to italic", () => {
			const html = "<em>italic text</em>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("_italic text_");
		});

		it("should convert ul and li to list", () => {
			const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("* Item 1\n* Item 2");
		});

		it("should convert code block to fenced code", () => {
			const html = "<pre><code>const x = 1;</code></pre>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("```\nconst x = 1;\n```");
		});

		it("should convert inline code", () => {
			const html = "<p>Use <code>console.log()</code> for debugging.</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Use `console.log()` for debugging.");
		});

		it("should convert links", () => {
			const html = '<a href="https://example.com">Example</a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("[Example](https://example.com)");
		});

		it("should convert blockquote", () => {
			const html = "<blockquote>This is a quote.</blockquote>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("> This is a quote.");
		});
	});

	describe("Empty link removal", () => {
		it("should remove empty links with no text", () => {
			const html = '<p>Text before <a href="https://example.com"></a> text after.</p>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text before text after.");
		});

		it("should remove empty links with only whitespace", () => {
			const html = '<p>Text before <a href="https://example.com">   </a> text after.</p>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text before text after.");
		});

		it("should keep links with content", () => {
			const html = '<p>Visit <a href="https://example.com">Example</a> now.</p>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("Visit [Example](https://example.com) now.");
		});

		it("should remove broken markdown links", () => {
			const html = '<p>Text [[]](https://example.com) more text</p>';
			const result = htmlToMarkdown(html);
			expect(result).not.toContain("[\[\]");
		});
	});

	describe("Multiple newline normalization", () => {
		it("should normalize three or more consecutive newlines to two", () => {
			// Test actual consecutive newlines in content, not between paragraphs
			const html = "<p>Paragraph with\n\n\n\nmultiple newlines</p>";
			const result = htmlToMarkdown(html);
			expect(result).not.toMatch(/\n{3,}/);
		});

		it("should not have more than two consecutive newlines", () => {
			const html = `
				<h1>Title</h1>
				<p>Para 1</p>
				<p>Para 2</p>
				<p>Para 3</p>
				<p>Para 4</p>
			`;
			const result = htmlToMarkdown(html);
			expect(result).not.toMatch(/\n{3,}/);
		});
	});

	describe("Whitespace normalization", () => {
		it("should normalize multiple spaces to single space", () => {
			const html = "<p>Multiple    spaces    here</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Multiple spaces here");
		});

		it("should remove space before comma", () => {
			const html = "<p>Text , more text</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text, more text");
		});

		it("should remove space before period", () => {
			const html = "<p>Text . More text.</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text. More text.");
		});
	});

	describe("Edge cases", () => {
		it("should handle empty string", () => {
			const result = htmlToMarkdown("");
			expect(result).toBe("");
		});

		it("should handle HTML with only whitespace", () => {
			const result = htmlToMarkdown("   \n\t   ");
			expect(result).toBe("");
		});

		it("should handle nested elements", () => {
			const html = "<p><strong>Bold</strong> and <em>italic</em> text</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("**Bold** and _italic_ text");
		});

		it("should handle ordered lists", () => {
			const html = "<ol><li>First</li><li>Second</li></ol>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("1. First\n2. Second");
		});

		it("should handle tables (GFM)", () => {
			const html = `
				<table>
					<tr><th>Name</th><th>Age</th></tr>
					<tr><td>John</td><td>30</td></tr>
				</table>
			`;
			const result = htmlToMarkdown(html);
			expect(result).toContain("|");
			expect(result).toContain("Name");
			expect(result).toContain("John");
		});
	});
});
