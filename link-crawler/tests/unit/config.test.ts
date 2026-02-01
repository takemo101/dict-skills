import { describe, it, expect } from "vitest";
import { parseConfig } from "../../src/config.js";

describe("parseConfig", () => {
	it("should parse config with default values", () => {
		const config = parseConfig({}, "https://example.com");

		expect(config.startUrl).toBe("https://example.com");
		expect(config.maxDepth).toBe(1);
		expect(config.outputDir).toBe("./crawled");
		expect(config.sameDomain).toBe(true);
		expect(config.delay).toBe(500);
		expect(config.timeout).toBe(30000);
		expect(config.spa).toBe(false);
		expect(config.spaWait).toBe(2000);
		expect(config.headed).toBe(false);
	});

	it("should parse config with custom options", () => {
		const config = parseConfig(
			{
				depth: 3,
				output: "./output",
				sameDomain: true,
				delay: 1000,
				timeout: 60,
			},
			"https://example.com",
		);

		expect(config.maxDepth).toBe(3);
		expect(config.outputDir).toBe("./output");
		expect(config.delay).toBe(1000);
		expect(config.timeout).toBe(60000);
	});

	it("should cap maxDepth at 10", () => {
		const config = parseConfig({ depth: 100 }, "https://example.com");

		expect(config.maxDepth).toBe(10);
	});

	it("should parse include/exclude patterns", () => {
		const config = parseConfig(
			{
				include: "^/docs",
				exclude: "\\.pdf$",
			},
			"https://example.com",
		);

		expect(config.includePattern).toBeInstanceOf(RegExp);
		expect(config.excludePattern).toBeInstanceOf(RegExp);
		expect(config.includePattern?.test("/docs/guide")).toBe(true);
		expect(config.excludePattern?.test("file.pdf")).toBe(true);
	});
});
