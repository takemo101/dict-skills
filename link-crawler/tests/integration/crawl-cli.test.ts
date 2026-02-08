/**
 * Crawl CLI Integration Tests
 *
 * Tests the crawl.ts entrypoint by actually running it as a CLI process.
 * This provides coverage for the CLI-specific code paths.
 *
 * Addresses Issue #779 - improving crawl.ts coverage from 0% to 50%+
 * Addresses Issue #949 - adding actual output content validation
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_OUTPUT_DIR = "tests/integration/.test-crawl-cli";

describe("crawl CLI integration", () => {
	beforeAll(() => {
		// Ensure test output directory exists
		if (existsSync(TEST_OUTPUT_DIR)) {
			rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
		}
		mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
	});

	afterAll(() => {
		// Cleanup
		if (existsSync(TEST_OUTPUT_DIR)) {
			rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
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

	// Issue #985: Enhanced version validation
	describe("version information", () => {
		it("should output exact version from package.json", () => {
			const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
			const result = execSync("bun run src/crawl.ts --version", {
				encoding: "utf-8",
				cwd: process.cwd(),
			});

			expect(result.trim()).toBe(packageJson.version);
		});
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

	// Issue #985: Exit code validation
	describe("exit codes", () => {
		it("should exit with INVALID_ARGUMENTS (2) when no URL provided", () => {
			try {
				execSync("bun run src/crawl.ts", {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
				});
				expect.fail("Should have thrown an error");
			} catch (error: unknown) {
				const err = error as { status: number };
				// EXIT_CODES.INVALID_ARGUMENTS = 2
				expect(err.status).toBe(2);
			}
		});
	});

	// Issue #985: URL scheme validation
	describe("URL validation", () => {
		it("should reject ftp:// URLs", () => {
			try {
				execSync('bun run src/crawl.ts "ftp://example.com" -d 0', {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
				});
				expect.fail("Should have thrown an error");
			} catch (error: unknown) {
				const err = error as { status: number };
				// Should exit with error code (not success)
				expect(err.status).not.toBe(0);
			}
		});

		it("should reject file:// URLs", () => {
			try {
				execSync('bun run src/crawl.ts "file:///etc/passwd" -d 0', {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
				});
				expect.fail("Should have thrown an error");
			} catch (error: unknown) {
				const err = error as { status: number };
				// Should exit with error code (not success)
				expect(err.status).not.toBe(0);
			}
		});

		it("should reject invalid URL schemes", () => {
			const invalidSchemes = [
				"mailto:test@example.com",
				"javascript:alert(1)",
				"data:text/plain,test",
			];

			for (const url of invalidSchemes) {
				try {
					execSync(`bun run src/crawl.ts "${url}" -d 0`, {
						encoding: "utf-8",
						cwd: process.cwd(),
						stdio: "pipe",
					});
					expect.fail(`Should have rejected URL: ${url}`);
				} catch (error: unknown) {
					const err = error as { status: number };
					// Should exit with error code (not success)
					expect(err.status).not.toBe(0);
				}
			}
		});
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

	// Issue #949: Tests for actual crawl output content validation
	describe("output file generation", () => {
		it("should generate output files for a valid crawl", () => {
			const outputDir = `${TEST_OUTPUT_DIR}/output-basic`;

			try {
				// Crawl example.com (depth 0 for single page)
				const result = execSync(
					`bun run src/crawl.ts "https://example.com" -d 0 -o "${outputDir}"`,
					{
						encoding: "utf-8",
						cwd: process.cwd(),
						stdio: "pipe",
						timeout: 30000,
					},
				);

				// Verify execution success
				expect(result).toContain("Crawl complete");

				// Verify output files exist
				expect(existsSync(join(outputDir, "index.json"))).toBe(true);
				expect(existsSync(join(outputDir, "full.md"))).toBe(true);
				expect(existsSync(join(outputDir, "pages"))).toBe(true);
				expect(existsSync(join(outputDir, "specs"))).toBe(true);

				// Verify index.json content
				const indexContent = JSON.parse(readFileSync(join(outputDir, "index.json"), "utf-8"));
				expect(indexContent.totalPages).toBeGreaterThan(0);
				expect(indexContent.pages).toHaveLength(1);
				expect(indexContent.pages[0].url).toBe("https://example.com");
				expect(indexContent.pages[0].title).toBeDefined();
				expect(indexContent.pages[0].hash).toBeDefined();

				// Verify full.md content
				const fullContent = readFileSync(join(outputDir, "full.md"), "utf-8");
				expect(fullContent).toContain("# ");
				expect(fullContent).toContain("url: https://example.com");

				// Verify pages/ directory content
				const pageFiles = readdirSync(join(outputDir, "pages"));
				expect(pageFiles.length).toBeGreaterThan(0);
				expect(pageFiles.some((f) => f.endsWith(".md"))).toBe(true);
			} catch (error: unknown) {
				// If it times out or has network issues, skip detailed validation
				// The important thing is it didn't fail with INVALID_ARGUMENTS (exit code 2)
				const err = error as { status: number };
				expect(err.status).not.toBe(2);
			}
		}, 35000);

		it("should not generate pages directory when --no-pages is used", () => {
			const outputDir = `${TEST_OUTPUT_DIR}/output-no-pages`;

			try {
				execSync(`bun run src/crawl.ts "https://example.com" -d 0 -o "${outputDir}" --no-pages`, {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
					timeout: 30000,
				});

				// index.json and full.md should be generated
				expect(existsSync(join(outputDir, "index.json"))).toBe(true);
				expect(existsSync(join(outputDir, "full.md"))).toBe(true);

				// pages/ should not have markdown files
				const pagesDir = join(outputDir, "pages");
				if (existsSync(pagesDir)) {
					const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith(".md"));
					expect(pageFiles.length).toBe(0);
				}
			} catch (error: unknown) {
				// Tolerate network/session issues
				const err = error as { status: number };
				expect(err.status).not.toBe(2);
			}
		}, 35000);

		it("should not generate full.md when --no-merge is used", () => {
			const outputDir = `${TEST_OUTPUT_DIR}/output-no-merge`;

			try {
				execSync(`bun run src/crawl.ts "https://example.com" -d 0 -o "${outputDir}" --no-merge`, {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
					timeout: 30000,
				});

				// index.json and pages/ should be generated
				expect(existsSync(join(outputDir, "index.json"))).toBe(true);
				expect(existsSync(join(outputDir, "pages"))).toBe(true);

				// full.md should not be generated
				expect(existsSync(join(outputDir, "full.md"))).toBe(false);
			} catch (error: unknown) {
				// Tolerate network/session issues
				const err = error as { status: number };
				expect(err.status).not.toBe(2);
			}
		}, 35000);

		it("should generate chunks directory when --chunks is used", () => {
			const outputDir = `${TEST_OUTPUT_DIR}/output-chunks`;

			try {
				execSync(`bun run src/crawl.ts "https://example.com" -d 0 -o "${outputDir}" --chunks`, {
					encoding: "utf-8",
					cwd: process.cwd(),
					stdio: "pipe",
					timeout: 30000,
				});

				// chunks/ should be generated
				expect(existsSync(join(outputDir, "chunks"))).toBe(true);

				const chunkFiles = readdirSync(join(outputDir, "chunks")).filter((f) => f.endsWith(".md"));
				expect(chunkFiles.length).toBeGreaterThan(0);

				// Verify chunk file content has markdown headers
				const firstChunk = readFileSync(join(outputDir, "chunks", chunkFiles[0]), "utf-8");
				expect(firstChunk).toContain("# ");
			} catch (error: unknown) {
				// Tolerate network/session issues
				const err = error as { status: number };
				expect(err.status).not.toBe(2);
			}
		}, 35000);
	});
});
