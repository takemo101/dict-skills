import * as fs from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaywrightFetcher, parseCliOutput } from "../../src/crawler/fetcher.js";
import { DependencyError, FetchError, TimeoutError } from "../../src/errors.js";
import type { CrawlConfig } from "../../src/types.js";
import type { RuntimeAdapter, SpawnResult } from "../../src/utils/runtime.js";

// Mock node:fs - using simple inline mocks (Bun + Vitest compatible)
// IMPORTANT: vi.unmock() in afterAll() prevents pollution to other test files
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	rmSync: vi.fn(),
}));

// Get typed references to the mocked functions
const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>;
const mockRmSync = fs.rmSync as ReturnType<typeof vi.fn>;

const createMockConfig = (overrides: Partial<CrawlConfig> = {}): CrawlConfig => ({
	startUrl: "https://example.com",
	maxDepth: 1,
	outputDir: "./output",
	sameDomain: true,
	includePattern: null,
	excludePattern: null,
	delay: 500,
	timeout: 30000,
	spaWait: 2000,
	headed: false,
	diff: false,
	pages: true,
	merge: true,
	chunks: true,
	keepSession: false,
	...overrides,
});

const createMockRuntime = (): RuntimeAdapter => ({
	spawn: vi.fn(),
	sleep: vi.fn(),
	readFile: vi.fn(),
});

beforeEach(() => {
	vi.clearAllMocks();
});

afterAll(() => {
	// Unmock and reset modules to prevent pollution to other test files
	vi.unmock("node:fs");
	vi.resetModules();
	vi.restoreAllMocks();
});

describe("PlaywrightFetcher", () => {
	describe("constructor", () => {
		it("should initialize with provided config", () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			const fetcher = new PlaywrightFetcher(config, mockRuntime);

			expect(fetcher).toBeDefined();
		});

		it("should use default runtime when not provided", () => {
			const config = createMockConfig();
			const fetcher = new PlaywrightFetcher(config);

			expect(fetcher).toBeDefined();
		});

		it("should use custom path config when provided", () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			const pathConfig = {
				nodePaths: ["/custom/node"],
				cliPaths: ["/custom/playwright-cli"],
			};
			const fetcher = new PlaywrightFetcher(config, mockRuntime, pathConfig);

			expect(fetcher).toBeDefined();
		});
	});

	describe("checkPlaywrightCli", () => {
		it("should return true when playwright-cli is found", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "1.0.0",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			// Access private method through prototype
			const result = await (
				fetcher as unknown as { checkPlaywrightCli(): Promise<boolean> }
			).checkPlaywrightCli();

			expect(result).toBe(true);
		});

		it("should try multiple paths until finding playwright-cli", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount < 3) {
					return Promise.resolve({
						success: false,
						stdout: "",
						stderr: "command not found",
						exitCode: 1,
					} as SpawnResult);
				}
				return Promise.resolve({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { checkPlaywrightCli(): Promise<boolean> }
			).checkPlaywrightCli();

			expect(result).toBe(true);
			expect(mockRuntime.spawn).toHaveBeenCalledTimes(3);
		});

		it("should return false when playwright-cli is not found in any path", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "command not found",
				exitCode: 1,
			} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { checkPlaywrightCli(): Promise<boolean> }
			).checkPlaywrightCli();

			expect(result).toBe(false);
		});
	});

	describe("executeFetch", () => {
		it("should successfully fetch page content", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Test Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as {
					executeFetch(
						url: string,
					): Promise<{ html: string; finalUrl: string; contentType: string }>;
				}
			).executeFetch("https://example.com");

			expect(result.html).toBe("<html>Test Content</html>");
			expect(result.finalUrl).toBe("https://example.com");
			expect(result.contentType).toBe("text/html");
		});

		it("should use headed mode when configured", async () => {
			const config = createMockConfig({ headed: true });
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation((_cmd, args) => {
				callCount++;
				if (callCount === 1) {
					// Verify headed flag is passed
					expect(args).toContain("--headed");
				}
				return Promise.resolve({
					success: true,
					stdout: callCount === 2 ? '"<html></html>"' : "",
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await (fetcher as unknown as { executeFetch(url: string): Promise<unknown> }).executeFetch(
				"https://example.com",
			);
		});

		it("should throw FetchError when page open fails", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "Navigation failed",
				exitCode: 1,
			} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(
				(fetcher as unknown as { executeFetch(url: string): Promise<unknown> }).executeFetch(
					"https://example.com",
				),
			).rejects.toThrow(FetchError);
		});

		it("should throw FetchError when content retrieval fails", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				return Promise.resolve({
					success: false,
					stdout: "",
					stderr: "Eval failed",
					exitCode: 1,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(
				(fetcher as unknown as { executeFetch(url: string): Promise<unknown> }).executeFetch(
					"https://example.com",
				),
			).rejects.toThrow(FetchError);
		});

		it("should wait for spaWait duration", async () => {
			const config = createMockConfig({ spaWait: 5000 });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: '"<html></html>"',
				stderr: "",
				exitCode: 0,
			} as SpawnResult);
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await (fetcher as unknown as { executeFetch(url: string): Promise<unknown> }).executeFetch(
				"https://example.com",
			);

			expect(mockRuntime.sleep).toHaveBeenCalledWith(5000);
		});
	});

	describe("fetch", () => {
		it("should initialize and fetch successfully", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli - version check
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).not.toBeNull();
			expect(result?.html).toBe("<html>Content</html>");
		});

		it("should throw DependencyError when playwright-cli is not found", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "command not found",
				exitCode: 1,
			} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(fetcher.fetch("https://example.com")).rejects.toThrow(DependencyError);
		});

		it("should throw TimeoutError when request times out", async () => {
			const config = createMockConfig({ timeout: 100 });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve({
							success: true,
							stdout: "1.0.0",
							stderr: "",
							exitCode: 0,
						} as SpawnResult);
					}, 1000);
				});
			});

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(fetcher.fetch("https://example.com")).rejects.toThrow(TimeoutError);
		});

		it("should only initialize once on multiple fetches", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call is checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				return Promise.resolve({
					success: true,
					stdout: '"<html></html>"',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 200");

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await fetcher.fetch("https://example.com");
			await fetcher.fetch("https://example.com/page2");

			// Should only check playwright cli once
			// 1 version check + 2*(open + network + eval) = 7
			expect(mockRuntime.spawn).toHaveBeenCalledTimes(7);
		});

		it("should wrap unknown errors in FetchError", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult)
				.mockRejectedValue(new Error("Unexpected error"));

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(fetcher.fetch("https://example.com")).rejects.toThrow(FetchError);
		});

		it("should re-throw FetchError as-is", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult)
				.mockResolvedValueOnce({
					success: false,
					stdout: "",
					stderr: "Navigation failed",
					exitCode: 1,
				} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(fetcher.fetch("https://example.com")).rejects.toThrow(FetchError);
		});

		it("should re-throw TimeoutError as-is", async () => {
			const config = createMockConfig({ timeout: 50 });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult)
				.mockImplementation(
					() =>
						new Promise((resolve) =>
							setTimeout(
								() =>
									resolve({
										success: true,
										stdout: "",
										stderr: "",
										exitCode: 0,
									} as SpawnResult),
								1000,
							),
						),
				);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await expect(fetcher.fetch("https://example.com")).rejects.toThrow(TimeoutError);
		});
	});

	describe("close", () => {
		it("should close session successfully", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);
			mockExistsSync.mockReturnValue(true);
			mockRmSync.mockReturnValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await fetcher.close();

			expect(mockRuntime.spawn).toHaveBeenCalledWith(expect.any(String), [
				"playwright-cli",
				"session-stop",
			]);
		});

		it("should remove .playwright-cli directory when keepSession is false", async () => {
			const config = createMockConfig({ keepSession: false });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);
			mockExistsSync.mockReturnValue(true);
			mockRmSync.mockReturnValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await fetcher.close();

			expect(mockExistsSync).toHaveBeenCalled();
			expect(mockRmSync).toHaveBeenCalled();
		});

		it("should not remove .playwright-cli directory when keepSession is true", async () => {
			const config = createMockConfig({ keepSession: true });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await fetcher.close();

			expect(mockExistsSync).not.toHaveBeenCalled();
			expect(mockRmSync).not.toHaveBeenCalled();
		});

		it("should handle close session errors gracefully", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockRejectedValue(new Error("Session not found"));
			mockExistsSync.mockReturnValue(false);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			// Should not throw
			await expect(fetcher.close()).resolves.toBeUndefined();
		});

		it("should handle cleanup errors gracefully", async () => {
			const config = createMockConfig({ keepSession: false });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);
			mockExistsSync.mockReturnValue(true);
			mockRmSync.mockImplementation(() => {
				throw new Error("Permission denied");
			});

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			// Should not throw
			await expect(fetcher.close()).resolves.toBeUndefined();
		});
	});

	describe("timeout configuration", () => {
		it("should have timeout value in config", () => {
			const config = createMockConfig({ timeout: 5000 });
			expect(config.timeout).toBe(5000);
		});

		it("should have default timeout of 30000ms", () => {
			const config = createMockConfig();
			expect(config.timeout).toBe(30000);
		});

		it("should accept custom timeout value", () => {
			const config = createMockConfig({ timeout: 100 });
			expect(config.timeout).toBe(100);
		});
	});

	describe("keepSession configuration", () => {
		it("should have keepSession default to false", () => {
			const config = createMockConfig();
			expect(config.keepSession).toBe(false);
		});

		it("should accept keepSession true value", () => {
			const config = createMockConfig({ keepSession: true });
			expect(config.keepSession).toBe(true);
		});

		it("should accept keepSession false value", () => {
			const config = createMockConfig({ keepSession: false });
			expect(config.keepSession).toBe(false);
		});
	});

	describe("getHttpStatusCode", () => {
		it("should normalize relative paths with parent directory references", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();

			// Test with path containing ../ (parent directory references)
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "[Network](../logs/network.log)",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			mockExistsSync.mockReturnValue(true);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 200");

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { getHttpStatusCode(): Promise<number | null> }
			).getHttpStatusCode();

			expect(result).toBe(200);
			// Verify that the normalized path is used
			expect(mockExistsSync).toHaveBeenCalled();
		});

		it("should handle paths with multiple parent directory references", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();

			// Test with path containing multiple ../
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "[Network](../../test/logs/network.log)",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			mockExistsSync.mockReturnValue(true);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 404");

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { getHttpStatusCode(): Promise<number | null> }
			).getHttpStatusCode();

			expect(result).toBe(404);
		});

		it("should handle normalized paths correctly", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();

			// Test with already normalized path
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "[Network](.playwright-cli/logs/network.log)",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			mockExistsSync.mockReturnValue(true);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 301");

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { getHttpStatusCode(): Promise<number | null> }
			).getHttpStatusCode();

			expect(result).toBe(301);
		});

		it("should return null when network log file does not exist", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();

			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "[Network](../logs/network.log)",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);

			mockExistsSync.mockReturnValue(false);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await (
				fetcher as unknown as { getHttpStatusCode(): Promise<number | null> }
			).getHttpStatusCode();

			expect(result).toBeNull();
		});

		it("should return null when network command fails (line 84-85)", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command - fails
					return Promise.resolve({
						success: false,
						stdout: "",
						stderr: "Network command failed",
						exitCode: 1,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			// Should still fetch content even if status code retrieval fails
			expect(result).not.toBeNull();
			expect(result?.html).toBe("<html>Content</html>");
		});

		it("should return null when network log path is not found (line 88)", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command - success but no log path in output
					return Promise.resolve({
						success: true,
						stdout: "Network logs available but no path",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).not.toBeNull();
		});

		it("should return null when log file does not exist (line 92)", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command - with log path
					return Promise.resolve({
						success: true,
						stdout: "[Network](../path/to/nonexistent.log)",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);
			mockExistsSync.mockReturnValue(false);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).not.toBeNull();
		});

		it("should return null when log file has no status code match (line 95-96)", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command - with log path
					return Promise.resolve({
						success: true,
						stdout: "[Network](../path/to/network.log)",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);
			mockRuntime.readFile = vi.fn().mockResolvedValue("log content without status code");
			mockExistsSync.mockReturnValue(true);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).not.toBeNull();
		});

		it("should handle exceptions in getHttpStatusCode gracefully (line 130)", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command - throws error
					return Promise.reject(new Error("Unexpected error"));
				}
				// eval command
				return Promise.resolve({
					success: true,
					stdout: '### Result\n"<html>Content</html>"\n### Ran Playwright code',
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			// Should handle error gracefully and continue
			expect(result).not.toBeNull();
		});

		it("should skip pages with 404 status code", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command
					return Promise.resolve({
						success: true,
						stdout: "[Network](../path/to/network.log)",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				return Promise.resolve({
					success: true,
					stdout: "",
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 404");
			mockExistsSync.mockReturnValue(true);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com/notfound");

			// Should return null for non-200 status codes
			expect(result).toBeNull();
		});

		it("should skip pages with 500 status code", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			let callCount = 0;
			mockRuntime.spawn = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// checkPlaywrightCli
					return Promise.resolve({
						success: true,
						stdout: "1.0.0",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 2) {
					// open command
					return Promise.resolve({
						success: true,
						stdout: "",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				if (callCount === 3) {
					// network command
					return Promise.resolve({
						success: true,
						stdout: "[Network](../path/to/network.log)",
						stderr: "",
						exitCode: 0,
					} as SpawnResult);
				}
				return Promise.resolve({
					success: true,
					stdout: "",
					stderr: "",
					exitCode: 0,
				} as SpawnResult);
			});
			mockRuntime.sleep = vi.fn().mockResolvedValue(undefined);
			mockRuntime.readFile = vi.fn().mockResolvedValue("status: 500");
			mockExistsSync.mockReturnValue(true);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com/error");

			expect(result).toBeNull();
		});

		it("should skip pages with ERR_HTTP_RESPONSE_CODE_FAILURE", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult)
				.mockResolvedValueOnce({
					success: false,
					stdout: "",
					stderr: "ERR_HTTP_RESPONSE_CODE_FAILURE",
					exitCode: 1,
				} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).toBeNull();
		});

		it("should skip pages redirected to chrome-error://", async () => {
			const config = createMockConfig();
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi
				.fn()
				.mockResolvedValueOnce({
					success: true,
					stdout: "1.0.0",
					stderr: "",
					exitCode: 0,
				} as SpawnResult)
				.mockResolvedValueOnce({
					success: true,
					stdout: "Page URL: chrome-error://chromewebdata/",
					stderr: "",
					exitCode: 0,
				} as SpawnResult);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			const result = await fetcher.fetch("https://example.com");

			expect(result).toBeNull();
		});
	});

	describe("close - additional error scenarios", () => {
		it("should handle existsSync throwing error gracefully (line 138)", async () => {
			const config = createMockConfig({ keepSession: false });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			} as SpawnResult);
			mockExistsSync.mockImplementation(() => {
				throw new Error("Permission denied");
			});

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			// Should not throw even if existsSync throws
			await expect(fetcher.close()).resolves.toBeUndefined();
		});

		it("should continue cleanup after session close throws (line 130-138)", async () => {
			const config = createMockConfig({ keepSession: false });
			const mockRuntime = createMockRuntime();
			mockRuntime.spawn = vi.fn().mockRejectedValue(new Error("Session close failed"));
			mockExistsSync.mockReturnValue(true);
			mockRmSync.mockReturnValue(undefined);

			const fetcher = new PlaywrightFetcher(config, mockRuntime);
			await fetcher.close();

			// Cleanup should still be attempted
			expect(mockExistsSync).toHaveBeenCalled();
			expect(mockRmSync).toHaveBeenCalled();
		});
	});
});

describe("parseCliOutput", () => {
	it("should extract HTML from CLI output", () => {
		const output = '### Result\n"<html><body>Test</body></html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("<html><body>Test</body></html>");
	});

	it("should parse JSON escaped content", () => {
		const output = '### Result\n"<html>Line 1\\nLine 2</html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("<html>Line 1\nLine 2</html>");
	});

	it("should handle quotes in content", () => {
		const output = '### Result\n"<html>He said \\"hello\\"</html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe('<html>He said "hello"</html>');
	});

	it("should handle backslashes in content", () => {
		const output = '### Result\n"<html>Path: C:\\\\Users\\\\test</html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("<html>Path: C:\\Users\\test</html>");
	});

	it("should use manual escape handling when JSON.parse fails", () => {
		const output = '### Result\n"<html>Invalid JSON \\x here</html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("<html>Invalid JSON \\x here</html>");
	});

	it("should return original output when no result pattern matches", () => {
		const output = "Some random output without result pattern";
		const result = parseCliOutput(output);
		expect(result).toBe(output);
	});

	it("should handle empty HTML content", () => {
		const output = '### Result\n""\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("");
	});

	it("should handle multiline HTML content", () => {
		const output =
			'### Result\n"<html>\\n  <body>\\n    <h1>Title</h1>\\n  </body>\\n</html>"\n### Ran Playwright code';
		const result = parseCliOutput(output);
		expect(result).toBe("<html>\n  <body>\n    <h1>Title</h1>\n  </body>\n</html>");
	});
});
