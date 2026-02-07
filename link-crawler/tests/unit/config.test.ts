import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../../src/config.js";
import { ConfigError } from "../../src/errors.js";

describe("parseConfig", () => {
	it("should parse config with default values", () => {
		const config = parseConfig({}, "https://example.com");

		expect(config.startUrl).toBe("https://example.com");
		expect(config.maxDepth).toBe(1);
		expect(config.outputDir).toBe("./.context/example");
		expect(config.sameDomain).toBe(true);
		expect(config.delay).toBe(500);
		expect(config.timeout).toBe(30000);
		expect(config.spaWait).toBe(2000);
		expect(config.headed).toBe(false);
		expect(config.diff).toBe(false);
		expect(config.pages).toBe(true);
		expect(config.merge).toBe(true);
		expect(config.chunks).toBe(false);
		expect(config.keepSession).toBe(false);
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

	it("should handle depth 0 correctly", () => {
		const config = parseConfig({ depth: 0 }, "https://example.com");

		expect(config.maxDepth).toBe(0);
	});

	it("should handle depth as string '0' correctly", () => {
		const config = parseConfig({ depth: "0" }, "https://example.com");

		expect(config.maxDepth).toBe(0);
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

	it("should parse keepSession option", () => {
		const configWithKeep = parseConfig({ keepSession: true }, "https://example.com");
		expect(configWithKeep.keepSession).toBe(true);

		const configWithoutKeep = parseConfig({ keepSession: false }, "https://example.com");
		expect(configWithoutKeep.keepSession).toBe(false);

		const configDefault = parseConfig({}, "https://example.com");
		expect(configDefault.keepSession).toBe(false);
	});

	it("should generate site-specific output directory from URL", () => {
		const config1 = parseConfig({}, "https://nextjs.org/docs");
		expect(config1.outputDir).toBe("./.context/nextjs-docs");

		const config2 = parseConfig({}, "https://docs.python.org/3/");
		expect(config2.outputDir).toBe("./.context/python-3");

		const config3 = parseConfig({}, "https://www.example.com");
		expect(config3.outputDir).toBe("./.context/example");
	});

	it("should allow custom output directory to override default", () => {
		const config = parseConfig({ output: "./custom-dir" }, "https://nextjs.org/docs");
		expect(config.outputDir).toBe("./custom-dir");
	});

	it("should allow legacy ./.context directory to be specified explicitly", () => {
		const config = parseConfig({ output: "./.context" }, "https://nextjs.org/docs");
		expect(config.outputDir).toBe("./.context");
	});
});

describe("parseConfig - regex pattern validation", () => {
	it("should throw ConfigError for invalid include pattern", () => {
		expect(() => {
			parseConfig({ include: "[invalid" }, "https://example.com");
		}).toThrow(ConfigError);

		expect(() => {
			parseConfig({ include: "[invalid" }, "https://example.com");
		}).toThrowError(/Invalid include pattern/);
	});

	it("should throw ConfigError for invalid exclude pattern", () => {
		expect(() => {
			parseConfig({ exclude: "(unclosed" }, "https://example.com");
		}).toThrow(ConfigError);

		expect(() => {
			parseConfig({ exclude: "(unclosed" }, "https://example.com");
		}).toThrowError(/Invalid exclude pattern/);
	});

	it("should include original regex error in message", () => {
		expect(() => {
			parseConfig({ include: "[invalid" }, "https://example.com");
		}).toThrowError(/(?:missing terminating|Unterminated character class)/);
	});

	it("should continue to work with valid patterns after error fix", () => {
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

	it("should set configKey in ConfigError", () => {
		try {
			parseConfig({ include: "[invalid" }, "https://example.com");
			expect.fail("Should have thrown ConfigError");
		} catch (error) {
			expect(error).toBeInstanceOf(ConfigError);
			expect((error as ConfigError).configKey).toBe("include");
		}

		try {
			parseConfig({ exclude: "(unclosed" }, "https://example.com");
			expect.fail("Should have thrown ConfigError");
		} catch (error) {
			expect(error).toBeInstanceOf(ConfigError);
			expect((error as ConfigError).configKey).toBe("exclude");
		}
	});
});

describe("parseConfig - output format warnings", () => {
	it("should warn when all output formats are disabled", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		parseConfig({ pages: false, merge: false, chunks: false }, "https://example.com");

		expect(consoleSpy).toHaveBeenCalledWith(
			"⚠️  Warning: All output formats are disabled (--no-pages --no-merge without --chunks).",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"   Only index.json will be generated. Consider adding --chunks.",
		);

		consoleSpy.mockRestore();
	});

	it("should not warn when at least one output format is enabled - pages", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		parseConfig({ pages: true, merge: false, chunks: false }, "https://example.com");

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("should not warn when at least one output format is enabled - merge", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		parseConfig({ pages: false, merge: true, chunks: false }, "https://example.com");

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("should not warn when at least one output format is enabled - chunks", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		parseConfig({ pages: false, merge: false, chunks: true }, "https://example.com");

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("should not warn with default configuration", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		parseConfig({}, "https://example.com");

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});

describe("parseConfig - URL validation", () => {
	it("should throw ConfigError for invalid URL", () => {
		expect(() => {
			parseConfig({}, "not-a-url");
		}).toThrow(ConfigError);

		expect(() => {
			parseConfig({}, "not-a-url");
		}).toThrowError(/Invalid URL: not-a-url/);
	});

	it("should throw ConfigError for empty string URL", () => {
		expect(() => {
			parseConfig({}, "");
		}).toThrow(ConfigError);

		expect(() => {
			parseConfig({}, "");
		}).toThrowError(/Invalid URL/);
	});

	it("should throw ConfigError for malformed URL", () => {
		expect(() => {
			parseConfig({}, "://missing-protocol");
		}).toThrow(ConfigError);

		expect(() => {
			parseConfig({}, "just some text");
		}).toThrow(ConfigError);
	});

	it("should set configKey to 'startUrl' in ConfigError", () => {
		try {
			parseConfig({}, "invalid-url");
			expect.fail("Should have thrown ConfigError");
		} catch (error) {
			expect(error).toBeInstanceOf(ConfigError);
			expect((error as ConfigError).configKey).toBe("startUrl");
		}
	});

	it("should accept valid URLs", () => {
		const config1 = parseConfig({}, "https://example.com");
		expect(config1.startUrl).toBe("https://example.com");

		const config2 = parseConfig({}, "http://localhost:3000");
		expect(config2.startUrl).toBe("http://localhost:3000");

		const config3 = parseConfig({}, "https://example.com/path/to/page");
		expect(config3.startUrl).toBe("https://example.com/path/to/page");
	});
});
