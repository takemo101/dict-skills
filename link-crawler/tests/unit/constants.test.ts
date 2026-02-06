import { describe, expect, it } from "vitest";
import { PATHS } from "../../src/constants.js";

describe("PATHS.PLAYWRIGHT_PATHS", () => {
	it("should not include undefined in paths when HOME is not set", () => {
		const paths = PATHS.PLAYWRIGHT_PATHS;

		// パス配列に"undefined"文字列が含まれていないことを確認
		for (const path of paths) {
			expect(path).not.toContain("undefined");
			expect(typeof path).toBe("string");
			expect(path.length).toBeGreaterThan(0);
		}
	});

	it("should include all valid playwright-cli paths", () => {
		const paths = PATHS.PLAYWRIGHT_PATHS;

		// 最低限2つのパスが含まれている（/opt/homebrew, /usr/local）
		expect(paths.length).toBeGreaterThanOrEqual(2);

		// 既知のパスが含まれているか
		expect(paths).toContain("/opt/homebrew/bin/playwright-cli");
		expect(paths).toContain("/usr/local/bin/playwright-cli");
	});

	it("should be an array of strings", () => {
		const paths = PATHS.PLAYWRIGHT_PATHS;
		expect(Array.isArray(paths)).toBe(true);
		expect(paths.every((p) => typeof p === "string")).toBe(true);
	});
});

describe("PATHS.NODE_PATHS", () => {
	it("should be an array of valid node paths", () => {
		const paths = PATHS.NODE_PATHS;
		expect(Array.isArray(paths)).toBe(true);
		expect(paths.length).toBeGreaterThan(0);
		expect(paths.every((p) => typeof p === "string")).toBe(true);
	});

	it("should not contain undefined in any path", () => {
		const paths = PATHS.NODE_PATHS;
		for (const path of paths) {
			expect(path).not.toContain("undefined");
		}
	});
});
