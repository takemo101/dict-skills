import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Hasher, computeHash } from "../../src/diff/hasher.js";

describe("computeHash", () => {
	it("should compute SHA256 hash of content", () => {
		const hash = computeHash("hello world");
		expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
	});

	it("should return different hashes for different content", () => {
		const hash1 = computeHash("content A");
		const hash2 = computeHash("content B");
		expect(hash1).not.toBe(hash2);
	});

	it("should return same hash for same content", () => {
		const hash1 = computeHash("same content");
		const hash2 = computeHash("same content");
		expect(hash1).toBe(hash2);
	});
});

describe("Hasher", () => {
	const testDir = "./test-temp-hasher";
	const indexPath = join(testDir, "index.json");

	beforeEach(() => {
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("should load hashes from index.json", async () => {
		const indexData = {
			pages: [
				{ url: "https://example.com/page1", hash: "hash1" },
				{ url: "https://example.com/page2", hash: "hash2" },
			],
		};
		writeFileSync(indexPath, JSON.stringify(indexData));

		const hasher = new Hasher();
		await hasher.loadHashes(indexPath);

		expect(hasher.size).toBe(2);
		expect(hasher.getHash("https://example.com/page1")).toBe("hash1");
		expect(hasher.getHash("https://example.com/page2")).toBe("hash2");
	});

	it("should return undefined for non-existent URL", async () => {
		const hasher = new Hasher();
		await hasher.loadHashes(indexPath); // non-existent file

		expect(hasher.getHash("https://example.com/unknown")).toBeUndefined();
	});

	it("should detect new pages as changed", async () => {
		const hasher = new Hasher();
		await hasher.loadHashes(indexPath); // no existing hashes

		expect(hasher.isChanged("https://example.com/new", "somehash")).toBe(true);
	});

	it("should detect unchanged pages", async () => {
		const indexData = {
			pages: [{ url: "https://example.com/page1", hash: "existinghash" }],
		};
		writeFileSync(indexPath, JSON.stringify(indexData));

		const hasher = new Hasher();
		await hasher.loadHashes(indexPath);

		expect(hasher.isChanged("https://example.com/page1", "existinghash")).toBe(false);
	});

	it("should detect changed pages", async () => {
		const indexData = {
			pages: [{ url: "https://example.com/page1", hash: "oldhash" }],
		};
		writeFileSync(indexPath, JSON.stringify(indexData));

		const hasher = new Hasher();
		await hasher.loadHashes(indexPath);

		expect(hasher.isChanged("https://example.com/page1", "newhash")).toBe(true);
	});

	it("should handle malformed index.json gracefully", async () => {
		writeFileSync(indexPath, "invalid json");

		const hasher = new Hasher();
		await hasher.loadHashes(indexPath);

		expect(hasher.size).toBe(0);
	});

	it("should handle missing pages array", async () => {
		writeFileSync(indexPath, JSON.stringify({ otherData: true }));

		const hasher = new Hasher();
		await hasher.loadHashes(indexPath);

		expect(hasher.size).toBe(0);
	});
});
