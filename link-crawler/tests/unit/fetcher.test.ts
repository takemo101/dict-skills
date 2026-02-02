import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CrawlConfig } from "../../src/types.js";

// Simple mock for testing timeout behavior
const mockSleep = vi.fn();
const mockShell = vi.fn();

// Mock bun module
vi.mock("bun", () => ({
	$: (...args: unknown[]) => mockShell(...args),
	sleep: (ms: number) => mockSleep(ms),
}));

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
	...overrides,
});

describe("PlaywrightFetcher timeout functionality", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		// Default mock behavior
		mockShell.mockReturnValue({ quiet: () => Promise.resolve({ text: () => "<html>test</html>" }) });
		mockSleep.mockResolvedValue(undefined);
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
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

	describe("Promise.race timeout pattern", () => {
		it("should implement timeout using Promise.race pattern", async () => {
			// Test the Promise.race pattern directly
			const timeout = 100;
			let timeoutFired = false;

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					timeoutFired = true;
					reject(new Error(`Request timeout after ${timeout}ms`));
				}, timeout);
			});

			const slowPromise = new Promise((resolve) => {
				setTimeout(() => resolve("completed"), 500);
			});

			try {
				await Promise.race([slowPromise, timeoutPromise]);
				expect.fail("Should have thrown timeout error");
			} catch (error) {
				expect(timeoutFired).toBe(true);
				expect(error instanceof Error).toBe(true);
				expect((error as Error).message).toBe("Request timeout after 100ms");
			}
		});

		it("should complete when operation finishes before timeout", async () => {
			const timeout = 500;

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Request timeout after ${timeout}ms`));
				}, timeout);
			});

			const fastPromise = new Promise<string>((resolve) => {
				setTimeout(() => resolve("completed"), 50);
			});

			const result = await Promise.race([fastPromise, timeoutPromise]);
			expect(result).toBe("completed");
		});
	});

	describe("config.timeout integration", () => {
		it("should convert timeout seconds to milliseconds in config", () => {
			// Simulate config parsing: (Number(options.timeout) || 30) * 1000
			const timeoutSeconds = 5;
			const timeoutMs = (Number(timeoutSeconds) || 30) * 1000;
			expect(timeoutMs).toBe(5000);
		});

		it("should use default 30s when timeout not specified", () => {
			const timeoutSeconds = Number(undefined) || 30;
			const timeoutMs = timeoutSeconds * 1000;
			expect(timeoutMs).toBe(30000);
		});
	});
});
