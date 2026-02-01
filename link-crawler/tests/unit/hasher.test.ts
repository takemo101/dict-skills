import { describe, it, expect, beforeEach } from "vitest";
import { computeHash, Hasher } from "../../src/diff/hasher.js";
import { join } from "node:path";
import { writeFile, mkdir, rm } from "node:fs/promises";

describe("computeHash", () => {
	it("should return consistent hash for same content", () => {
		const content = "Hello, World!";
		const hash1 = computeHash(content);
		const hash2 = computeHash(content);

		expect(hash1).toBe(hash2);
	});

	it("should return different hashes for different content", () => {
		const hash1 = computeHash("Content A");
		const hash2 = computeHash("Content B");

		expect(hash1).not.toBe(hash2);
	});

	it("should return valid SHA256 hex string", () => {
		const hash = computeHash("test");

		// SHA256 produces 64 character hex string
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should handle empty string", () => {
		const hash = computeHash("");

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should handle unicode content", () => {
		const hash1 = computeHash("日本語テスト");
		const hash2 = computeHash("日本語テスト");

		expect(hash1).toBe(hash2);
		expect(hash1).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe("Hasher", () => {
	const testDir = join(import.meta.dirname, ".test-hasher");

	beforeEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		await mkdir(testDir, { recursive: true });
	});

	describe("loadHashes", () => {
		it("should load hashes from index.json", async () => {
			const indexPath = join(testDir, "index.json");
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "abc123" },
					{ url: "https://example.com/page2", hash: "def456" },
				],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBe("abc123");
			expect(hasher.getHash("https://example.com/page2")).toBe("def456");
			expect(hasher.size).toBe(2);
		});

		it("should handle missing index.json", async () => {
			const indexPath = join(testDir, "nonexistent.json");

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});

		it("should handle empty pages array", async () => {
			const indexPath = join(testDir, "index.json");
			await writeFile(indexPath, JSON.stringify({ pages: [] }));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});

		it("should skip pages without hash", async () => {
			const indexPath = join(testDir, "index.json");
			const indexData = {
				pages: [
					{ url: "https://example.com/page1" }, // no hash
					{ url: "https://example.com/page2", hash: "def456" },
				],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBeUndefined();
			expect(hasher.getHash("https://example.com/page2")).toBe("def456");
			expect(hasher.size).toBe(1);
		});

		it("should handle invalid JSON", async () => {
			const indexPath = join(testDir, "index.json");
			await writeFile(indexPath, "{ invalid json }");

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBeUndefined();
			expect(hasher.size).toBe(0);
		});
	});

	describe("isChanged", () => {
		it("should return true for new URL", async () => {
			const hasher = new Hasher();

			const result = hasher.isChanged(
				"https://example.com/new-page",
				"somehash",
			);

			expect(result).toBe(true);
		});

		it("should return false for same hash", async () => {
			const indexPath = join(testDir, "index.json");
			const hash = "abc123def456";
			const indexData = {
				pages: [{ url: "https://example.com/page1", hash }],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			const result = hasher.isChanged("https://example.com/page1", hash);

			expect(result).toBe(false);
		});

		it("should return true for different hash", async () => {
			const indexPath = join(testDir, "index.json");
			const indexData = {
				pages: [{ url: "https://example.com/page1", hash: "original-hash" }],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			const result = hasher.isChanged(
				"https://example.com/page1",
				"modified-hash",
			);

			expect(result).toBe(true);
		});

		it("should be case-sensitive for URL matching", async () => {
			const indexPath = join(testDir, "index.json");
			const hash = "abc123";
			const indexData = {
				pages: [{ url: "https://example.com/Page1", hash }],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			// Different case = new URL = changed
			const result = hasher.isChanged("https://example.com/page1", hash);

			expect(result).toBe(true);
		});
	});

	describe("getHash", () => {
		it("should return hash for existing URL", async () => {
			const indexPath = join(testDir, "index.json");
			const indexData = {
				pages: [{ url: "https://example.com/page1", hash: "abc123" }],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.getHash("https://example.com/page1")).toBe("abc123");
		});

		it("should return undefined for non-existing URL", () => {
			const hasher = new Hasher();

			expect(hasher.getHash("https://example.com/unknown")).toBeUndefined();
		});
	});

	describe("size", () => {
		it("should return 0 for empty hasher", () => {
			const hasher = new Hasher();
			expect(hasher.size).toBe(0);
		});

		it("should return correct count after loading", async () => {
			const indexPath = join(testDir, "index.json");
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "hash1" },
					{ url: "https://example.com/page2", hash: "hash2" },
					{ url: "https://example.com/page3", hash: "hash3" },
				],
			};
			await writeFile(indexPath, JSON.stringify(indexData));

			const hasher = new Hasher();
			await hasher.loadHashes(indexPath);

			expect(hasher.size).toBe(3);
		});
	});
});
