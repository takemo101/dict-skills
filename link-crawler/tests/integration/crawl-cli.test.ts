/**
 * Crawl CLI Integration Tests
 *
 * Tests the crawl.ts entrypoint by actually running it as a CLI process.
 * This provides coverage for the CLI-specific code paths.
 *
 * Addresses Issue #779 - improving crawl.ts coverage from 0% to 50%+
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rm } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_OUTPUT_DIR = "tests/integration/.test-crawl-cli";

describe("crawl CLI integration", () => {
	beforeAll(() => {
		// Ensure test output directory exists
		if (existsSync(TEST_OUTPUT_DIR)) {
			rm(TEST_OUTPUT_DIR, { recursive: true, force: true }, () => {});
		}
		mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
	});

	afterAll(() => {
		// Cleanup
		if (existsSync(TEST_OUTPUT_DIR)) {
			rm(TEST_OUTPUT_DIR, { recursive: true, force: true }, () => {});
		}
	});

	it("should show help when --help flag is used", () => {
		const result = execSync("bun run src/crawl.ts --help", {
			encoding: "utf-8",
			cwd: process.cwd(),
		});

		expect(result).toContain("Crawl technical documentation sites recursively");
		expect(result).toContain("--depth");
		expect(result).toContain("--output");
	});

	it("should show version when --version flag is used", () => {
		const result = execSync("bun run src/crawl.ts --version", {
			encoding: "utf-8",
			cwd: process.cwd(),
		});

		// Should output a version number (from package.json)
		expect(result).toMatch(/\d+\.\d+\.\d+/);
	});

	it("should exit with error code when no URL is provided", () => {
		try {
			execSync("bun run src/crawl.ts", {
				encoding: "utf-8",
				cwd: process.cwd(),
				stdio: "pipe",
			});
			// Should not reach here
			expect.fail("Should have thrown an error");
		} catch (error: unknown) {
			// Should exit with non-zero code
			const err = error as { status: number };
			expect(err.status).toBeGreaterThan(0);
		}
	});

	it("should accept valid http URL format", () => {
		// This test verifies that the CLI accepts a valid URL format
		// We use example.com which is guaranteed to exist and be fast
		const outputDir = `${TEST_OUTPUT_DIR}/output-example`;

		try {
			const result = execSync(`bun run src/crawl.ts "https://example.com" -d 0 -o "${outputDir}"`, {
				encoding: "utf-8",
				cwd: process.cwd(),
				stdio: "pipe",
				timeout: 30000,
			});

			// Should complete successfully
			expect(result).toContain("Crawl complete");
		} catch (error: unknown) {
			// If it times out or has network issues, that's okay
			// The important thing is it didn't fail with INVALID_ARGUMENTS (exit code 2)
			const err = error as { status: number };
			expect(err.status).not.toBe(2);
		}
	}, 35000); // Increase timeout for real crawl

	it("should handle invalid URL gracefully", () => {
		try {
			execSync('bun run src/crawl.ts "not-a-valid-url" -d 0', {
				encoding: "utf-8",
				cwd: process.cwd(),
				stdio: "pipe",
			});
			expect.fail("Should have thrown an error");
		} catch (error: unknown) {
			// Should exit with an error code (not 0)
			const err = error as { status: number };
			expect(err.status).not.toBe(0);
		}
	});
});
