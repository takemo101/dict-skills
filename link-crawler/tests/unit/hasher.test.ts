import { describe, it, expect } from "vitest";
import { computeHash, Hasher } from "../../src/diff/hasher.js";

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
	describe("constructor", () => {
		it("should create empty hasher without arguments", () => {
			const hasher = new Hasher();

			expect(hasher.size).toBe(0);
		});

		it("should create hasher with existing hashes", () => {
			const existingHashes = new Map([
				["https://example.com/page1", "hash1"],
				["https://example.com/page2", "hash2"],
			]);
			const hasher = new Hasher(existingHashes);

			expect(hasher.size).toBe(2);
		});
	});

	describe("fromIndexJson", () => {
		it("should create hasher from index.json data", () => {
			const indexData = {
				pages: [
					{ url: "https://example.com/page1", hash: "abc123" },
					{ url: "https://example.com/page2", hash: "def456" },
				],
			};
			const hasher = Hasher.fromIndexJson(indexData);

			expect(hasher.size).toBe(2);
			expect(hasher.getHash("https://example.com/page1")).toBe("abc123");
		});

		it("should handle null input", () => {
			const hasher = Hasher.fromIndexJson(null);

			expect(hasher.size).toBe(0);
		});

		it("should handle empty pages array", () => {
			const hasher = Hasher.fromIndexJson({ pages: [] });

			expect(hasher.size).toBe(0);
		});

		it("should handle missing pages property", () => {
			const hasher = Hasher.fromIndexJson({});

			expect(hasher.size).toBe(0);
		});
	});

	describe("isChanged", () => {
		it("should return true for new URL", () => {
			const hasher = new Hasher();

			const result = hasher.isChanged(
				"https://example.com/new-page",
				"Some content",
			);

			expect(result).toBe(true);
		});

		it("should return false for same content (same hash)", () => {
			const content = "Existing content";
			const hash = computeHash(content);
			const existingHashes = new Map([
				["https://example.com/page1", hash],
			]);
			const hasher = new Hasher(existingHashes);

			const result = hasher.isChanged("https://example.com/page1", content);

			expect(result).toBe(false);
		});

		it("should return true for modified content (different hash)", () => {
			const originalContent = "Original content";
			const hash = computeHash(originalContent);
			const existingHashes = new Map([
				["https://example.com/page1", hash],
			]);
			const hasher = new Hasher(existingHashes);

			const modifiedContent = "Modified content";
			const result = hasher.isChanged(
				"https://example.com/page1",
				modifiedContent,
			);

			expect(result).toBe(true);
		});

		it("should be case-sensitive for URL matching", () => {
			const content = "Some content";
			const hash = computeHash(content);
			const existingHashes = new Map([
				["https://example.com/Page1", hash],
			]);
			const hasher = new Hasher(existingHashes);

			// Different case = new URL
			const result = hasher.isChanged("https://example.com/page1", content);

			expect(result).toBe(true);
		});
	});

	describe("getHash", () => {
		it("should return hash for existing URL", () => {
			const existingHashes = new Map([
				["https://example.com/page1", "abc123"],
			]);
			const hasher = new Hasher(existingHashes);

			expect(hasher.getHash("https://example.com/page1")).toBe("abc123");
		});

		it("should return undefined for non-existing URL", () => {
			const hasher = new Hasher();

			expect(hasher.getHash("https://example.com/unknown")).toBeUndefined();
		});
	});
});
