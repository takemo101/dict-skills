import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { computeHash, Hasher } from "../../src/diff/hasher.js";

describe("computeHash", () => {
	it("should compute SHA256 hash of content", () => {
		const hash = computeHash("hello world");
		// SHA256 hash of "hello world"
		expect(hash).toBe(
			"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
		);
	});

	it("should return different hash for different content", () => {
		const hash1 = computeHash("content1");
		const hash2 = computeHash("content2");
		expect(hash1).not.toBe(hash2);
	});

	it("should return same hash for same content", () => {
		const hash1 = computeHash("same content");
		const hash2 = computeHash("same content");
		expect(hash1).toBe(hash2);
	});

	it("should handle empty string", () => {
		const hash = computeHash("");
		expect(hash).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	it("should handle unicode content", () => {
		const hash = computeHash("こんにちは世界");
		expect(hash).toHaveLength(64); // SHA256 = 256 bits = 64 hex chars
	});
});

describe("Hasher", () => {
	const testDir = join(process.cwd(), "test-temp-hasher");
	let hasher: Hasher;

	beforeEach(async () => {
		hasher = new Hasher();
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("loadHashes", () => {
		it("should load hashes from index.json", async () => {
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "hash1" },
					{ url: "https://example.com/page2", hash: "hash2" },
				],
			};
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);

			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.getHash("https://example.com/page1")).toBe("hash1");
			expect(hasher.getHash("https://example.com/page2")).toBe("hash2");
			expect(hasher.size).toBe(2);
		});

		it("should handle missing file gracefully", async () => {
			await hasher.loadHashes(join(testDir, "nonexistent.json"));

			expect(hasher.getHash("https://example.com")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});

		it("should handle pages without hash", async () => {
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "hash1" },
					{ url: "https://example.com/page2" }, // no hash
				],
			};
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);

			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.getHash("https://example.com/page1")).toBe("hash1");
			expect(hasher.getHash("https://example.com/page2")).toBeUndefined();
			expect(hasher.size).toBe(1);
		});

		it("should handle empty pages array", async () => {
			const indexData = { pages: [] };
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);

			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.getHash("https://example.com")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});

		it("should handle index without pages key", async () => {
			const indexData = { baseUrl: "https://example.com" };
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);

			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.getHash("https://example.com")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});
	});

	describe("isChanged", () => {
		beforeEach(async () => {
			const indexData = {
				pages: [{ url: "https://example.com/existing", hash: "oldhash" }],
			};
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);
			await hasher.loadHashes(join(testDir, "index.json"));
		});

		it("should return true for new URL", () => {
			expect(hasher.isChanged("https://example.com/new", "newhash")).toBe(
				true,
			);
		});

		it("should return true when hash is different", () => {
			expect(
				hasher.isChanged("https://example.com/existing", "differenthash"),
			).toBe(true);
		});

		it("should return false when hash is same", () => {
			expect(hasher.isChanged("https://example.com/existing", "oldhash")).toBe(
				false,
			);
		});
	});

	describe("getHash", () => {
		it("should return undefined for unknown URL", () => {
			expect(hasher.getHash("https://unknown.com")).toBeUndefined();
		});

		it("should return hash for known URL", async () => {
			const indexData = {
				pages: [{ url: "https://example.com/known", hash: "knownhash" }],
			};
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);
			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.getHash("https://example.com/known")).toBe("knownhash");
		});
	});

	describe("size", () => {
		it("should return 0 for empty hasher", () => {
			expect(hasher.size).toBe(0);
		});

		it("should return correct count after loading", async () => {
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "hash1" },
					{ url: "https://example.com/page2", hash: "hash2" },
					{ url: "https://example.com/page3", hash: "hash3" },
				],
			};
			await writeFile(
				join(testDir, "index.json"),
				JSON.stringify(indexData),
			);
			await hasher.loadHashes(join(testDir, "index.json"));

			expect(hasher.size).toBe(3);
		});
	});
});
