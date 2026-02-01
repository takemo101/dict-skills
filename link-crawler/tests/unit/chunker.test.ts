import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Chunker } from "../../src/output/chunker.js";

const testOutputDir = "./test-output-chunker";

describe("Chunker", () => {
	beforeEach(() => {
		mkdirSync(testOutputDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testOutputDir, { recursive: true, force: true });
	});

	describe("chunk", () => {
		it("should return empty array for empty markdown", () => {
			const chunker = new Chunker(testOutputDir);
			const result = chunker.chunk("");
			expect(result).toEqual([]);
		});

		it("should return single chunk for markdown without H1", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = "Some content without heading.\n\nMore content.";
			const result = chunker.chunk(markdown);
			expect(result).toHaveLength(1);
			expect(result[0]).toBe(markdown);
		});

		it("should split markdown by H1 headings", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `# First Section

Content of first section.

# Second Section

Content of second section.`;

			const result = chunker.chunk(markdown);

			expect(result).toHaveLength(2);
			expect(result[0]).toContain("# First Section");
			expect(result[0]).toContain("Content of first section.");
			expect(result[1]).toContain("# Second Section");
			expect(result[1]).toContain("Content of second section.");
		});

		it("should handle multiple H1 headings", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `# Section 1
Content 1
# Section 2
Content 2
# Section 3
Content 3`;

			const result = chunker.chunk(markdown);

			expect(result).toHaveLength(3);
			expect(result[0]).toContain("# Section 1");
			expect(result[1]).toContain("# Section 2");
			expect(result[2]).toContain("# Section 3");
		});

		it("should not split by H2 or lower headings", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `# Main Section

## Sub Section

Content here.

### Deep Section

More content.

# Another Main Section

Final content.`;

			const result = chunker.chunk(markdown);

			expect(result).toHaveLength(2);
			expect(result[0]).toContain("## Sub Section");
			expect(result[0]).toContain("### Deep Section");
			expect(result[1]).toContain("# Another Main Section");
		});

		it("should handle frontmatter correctly", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `---
title: Test Document
---

# First Section

Content.

# Second Section

More content.`;

			const result = chunker.chunk(markdown);

			expect(result).toHaveLength(2);
			expect(result[0]).toContain("---");
			expect(result[0]).toContain("title: Test Document");
			expect(result[0]).toContain("# First Section");
		});

		it("should trim whitespace from chunks", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `
# Section

Content.

# Another Section

More content.
`;

			const result = chunker.chunk(markdown);

			expect(result).toHaveLength(2);
			expect(result[0]).not.toMatch(/^\s/);
			expect(result[0]).not.toMatch(/\s$/);
		});
	});

	describe("writeChunks", () => {
		it("should return empty array for empty chunks", () => {
			const chunker = new Chunker(testOutputDir);
			const result = chunker.writeChunks([]);
			expect(result).toEqual([]);
		});

		it("should write chunks with 3-digit zero padding", () => {
			const chunker = new Chunker(testOutputDir);
			const chunks = ["# Chunk 1", "# Chunk 2", "# Chunk 3"];

			const result = chunker.writeChunks(chunks);

			expect(result).toHaveLength(3);
			expect(result[0]).toContain("chunk-001.md");
			expect(result[1]).toContain("chunk-002.md");
			expect(result[2]).toContain("chunk-003.md");
		});

		it("should write chunk content to files", () => {
			const chunker = new Chunker(testOutputDir);
			const chunks = ["# First Chunk\n\nContent 1", "# Second Chunk\n\nContent 2"];

			chunker.writeChunks(chunks);

			const content1 = readFileSync(join(testOutputDir, "chunks", "chunk-001.md"), "utf-8");
			const content2 = readFileSync(join(testOutputDir, "chunks", "chunk-002.md"), "utf-8");

			expect(content1).toBe("# First Chunk\n\nContent 1");
			expect(content2).toBe("# Second Chunk\n\nContent 2");
		});

		it("should create chunks directory", () => {
			const chunker = new Chunker(testOutputDir);
			chunker.writeChunks(["# Test"]);

			const stats = readFileSync(join(testOutputDir, "chunks", "chunk-001.md"));
			expect(stats).toBeDefined();
		});
	});

	describe("chunkAndWrite", () => {
		it("should chunk and write in one operation", () => {
			const chunker = new Chunker(testOutputDir);
			const markdown = `# Section 1

Content 1.

# Section 2

Content 2.`;

			const result = chunker.chunkAndWrite(markdown);

			expect(result).toHaveLength(2);
			expect(result[0]).toContain("chunk-001.md");
			expect(result[1]).toContain("chunk-002.md");

			const content1 = readFileSync(result[0], "utf-8");
			expect(content1).toContain("# Section 1");
		});

		it("should return empty array for empty markdown", () => {
			const chunker = new Chunker(testOutputDir);
			const result = chunker.chunkAndWrite("");
			expect(result).toEqual([]);
		});
	});
});
