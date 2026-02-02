import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../../src/parser/converter.js";

describe("htmlToMarkdown", () => {
	describe("basic conversion", () => {
		it("should convert simple HTML to Markdown", () => {
			const html = "<p>Hello World</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Hello World");
		});

		it("should convert headings", () => {
			const html = "<h1>Title 1</h1><h2>Title 2</h2><h3>Title 3</h3>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("# Title 1");
			expect(result).toContain("## Title 2");
			expect(result).toContain("### Title 3");
		});

		it("should convert strong and em tags", () => {
			const html = "<p><strong>Bold</strong> and <em>italic</em></p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("**Bold**");
			expect(result).toContain("_italic_");
		});

		it("should convert links", () => {
			const html = '<a href="https://example.com">Link Text</a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("[Link Text](https://example.com)");
		});

		it("should convert unordered lists", () => {
			const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("* Item 1");
			expect(result).toContain("* Item 2");
		});

		it("should convert ordered lists", () => {
			const html = "<ol><li>First</li><li>Second</li></ol>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("1. First");
			expect(result).toContain("2. Second");
		});

		it("should convert code blocks", () => {
			const html = "<pre><code>const x = 1;</code></pre>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("```");
			expect(result).toContain("const x = 1;");
		});

		it("should convert inline code", () => {
			const html = "<p>Use <code>console.log()</code> for debugging</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("`console.log()`");
		});

		it("should convert blockquotes", () => {
			const html = "<blockquote><p>Quote text</p></blockquote>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("> Quote text");
		});
	});

	describe("empty link removal", () => {
		it("should remove empty links", () => {
			const html = '<p><a href="https://example.com"></a>Text</p>';
			const result = htmlToMarkdown(html);
			expect(result).not.toContain("[]");
			expect(result).not.toContain("(https://example.com)");
			expect(result).toBe("Text");
		});

		it("should remove links with only whitespace", () => {
			const html = '<p><a href="https://example.com">   </a>Text</p>';
			const result = htmlToMarkdown(html);
			expect(result).not.toContain("https://example.com");
			expect(result).toBe("Text");
		});

		it("should keep links with text content", () => {
			const html = '<a href="https://example.com">Valid Link</a>';
			const result = htmlToMarkdown(html);
			expect(result).toBe("[Valid Link](https://example.com)");
		});
	});

	describe("whitespace normalization", () => {
		it("should normalize multiple spaces to single space", () => {
			const html = "<p>Multiple    spaces    here</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Multiple spaces here");
		});

		it("should remove spaces before commas", () => {
			const html = "<p>Text , more text</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text, more text");
		});

		it("should remove spaces before periods", () => {
			const html = "<p>Text . More text</p>";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Text. More text");
		});

		it("should trim leading and trailing whitespace", () => {
			const html = "   <p>Content</p>   ";
			const result = htmlToMarkdown(html);
			expect(result).toBe("Content");
		});
	});

	describe("newline normalization", () => {
		it("should normalize 3+ newlines to 2 newlines", () => {
			const html = "<p>Paragraph 1</p><br><br><br><p>Paragraph 2</p>";
			const result = htmlToMarkdown(html);
			// Multiple line breaks should be normalized
			const consecutiveNewlines = result.match(/\n{3,}/g);
			expect(consecutiveNewlines).toBeNull();
		});
	});

	describe("broken link removal", () => {
		it("should remove broken link syntax", () => {
			const html = '<p>[[]](https://example.com)</p>';
			const result = htmlToMarkdown(html);
			expect(result).not.toContain("[[]]");
		});
	});

	describe("complex HTML structures", () => {
		it("should handle nested elements", () => {
			const html = `
				<div>
					<h1>Main Title</h1>
					<p>This is a <strong>paragraph</strong> with <em>emphasis</em>.</p>
					<ul>
						<li>Item with <a href="https://example.com">link</a></li>
					</ul>
				</div>
			`;
			const result = htmlToMarkdown(html);
			expect(result).toContain("# Main Title");
			expect(result).toContain("**paragraph**");
			expect(result).toContain("_emphasis_");
			expect(result).toContain("[link](https://example.com)");
		});

		it("should handle tables", () => {
			const html = `
				<table>
					<tr><th>Header 1</th><th>Header 2</th></tr>
					<tr><td>Data 1</td><td>Data 2</td></tr>
				</table>
			`;
			const result = htmlToMarkdown(html);
			// GFM table format
			expect(result).toContain("|");
			expect(result).toContain("Header 1");
			expect(result).toContain("Header 2");
		});

		it("should handle horizontal rules", () => {
			const html = "<p>Before</p><hr><p>After</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("* * *");
		});

		it("should handle images", () => {
			const html = '<img src="image.png" alt="Description">';
			const result = htmlToMarkdown(html);
			expect(result).toContain("![Description](image.png)");
		});
	});

	describe("edge cases", () => {
		it("should handle empty HTML", () => {
			const result = htmlToMarkdown("");
			expect(result).toBe("");
		});

		it("should handle HTML with only whitespace", () => {
			const result = htmlToMarkdown("   \n\t   ");
			expect(result).toBe("");
		});

		it("should handle HTML entities", () => {
			const html = "<p>&lt;div&gt; &amp; &quot;text&quot;</p>";
			const result = htmlToMarkdown(html);
			expect(result).toContain("<div>");
			expect(result).toContain("&");
			expect(result).toContain('"text"');
		});
	});
});
