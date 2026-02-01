import { describe, it, expect } from "vitest";
import { Chunker } from "../../src/output/chunker.js";

describe("Chunker", () => {
	describe("chunk", () => {
		it("should split content at h1 boundaries", () => {
			const chunker = new Chunker();
			const markdown = `# First Section

This is the content of the first section.

It has multiple paragraphs.

# Second Section

This is the content of the second section.

# Third Section

Final section content.`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(3);
			expect(chunks[0].title).toBe("First Section");
			expect(chunks[0].content).toBe(
				"This is the content of the first section.\n\nIt has multiple paragraphs.",
			);
			expect(chunks[1].title).toBe("Second Section");
			expect(chunks[1].content).toBe("This is the content of the second section.");
			expect(chunks[2].title).toBe("Third Section");
			expect(chunks[2].content).toBe("Final section content.");
		});

		it("should handle markdown without h1", () => {
			const chunker = new Chunker();
			const markdown = `This is content without any h1 header.

It has multiple paragraphs.

## h2 Header

Some content under h2.`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(1);
			expect(chunks[0].title).toBe("Untitled");
			expect(chunks[0].content).toBe(markdown.trim());
		});

		it("should handle multiple h1 headers", () => {
			const chunker = new Chunker();
			const markdown = `# Introduction

Intro content here.

# Getting Started

Getting started content.

# API Reference

API documentation.

# Conclusion

Conclusion content.`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(4);
			expect(chunks[0].title).toBe("Introduction");
			expect(chunks[1].title).toBe("Getting Started");
			expect(chunks[2].title).toBe("API Reference");
			expect(chunks[3].title).toBe("Conclusion");
		});

		it("should handle empty markdown", () => {
			const chunker = new Chunker();
			const markdown = "";

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(0);
		});

		it("should handle whitespace-only markdown", () => {
			const chunker = new Chunker();
			const markdown = "   \n\n   \n";

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(0);
		});

		it("should handle h1 with special characters in title", () => {
			const chunker = new Chunker();
			const markdown = `# Section: "Special" Characters

Content here.

# Section with : colon

More content.`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(2);
			expect(chunks[0].title).toBe('Section: "Special" Characters');
			expect(chunks[1].title).toBe("Section with : colon");
		});

		it("should not confuse h2, h3 with h1", () => {
			const chunker = new Chunker();
			const markdown = `# Main Title

## Subsection

### Sub-subsection

Content here.

# Another Main Title

More content.`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(2);
			expect(chunks[0].title).toBe("Main Title");
			expect(chunks[0].content).toContain("## Subsection");
			expect(chunks[0].content).toContain("### Sub-subsection");
			expect(chunks[1].title).toBe("Another Main Title");
		});

		it("should trim trailing whitespace from content", () => {
			const chunker = new Chunker();
			const markdown = `# Title

Content line 1

Content line 2

`;

			const chunks = chunker.chunk(markdown);

			expect(chunks).toHaveLength(1);
			expect(chunks[0].content).toBe("Content line 1\n\nContent line 2");
		});
	});

	describe("chunkOrDefault", () => {
		it("should return chunks normally when h1 exists", () => {
			const chunker = new Chunker();
			const markdown = `# Section 1

Content 1

# Section 2

Content 2`;

			const chunks = chunker.chunkOrDefault(markdown);

			expect(chunks).toHaveLength(2);
			expect(chunks[0].title).toBe("Section 1");
			expect(chunks[1].title).toBe("Section 2");
		});

		it("should wrap entire content when no h1 exists", () => {
			const chunker = new Chunker();
			const markdown = `## h2 Header

Paragraph 1

Paragraph 2`;

			const chunks = chunker.chunkOrDefault(markdown);

			expect(chunks).toHaveLength(1);
			expect(chunks[0].title).toBe("Untitled");
			expect(chunks[0].content).toBe(markdown.trim());
		});
	});
});
