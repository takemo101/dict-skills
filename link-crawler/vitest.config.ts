import { defineConfig} from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		// Disable file-level parallelism to prevent module mock pollution
		// vi.mock() at module level (especially for node:fs) can leak to other test files
		// even with vi.unmock() in afterAll(). This is a vitest/ESM limitation.
		// See: tests/unit/fetcher.test.ts for the specific mock that requires this.
		fileParallelism: false,
		// Limit concurrency to ensure test isolation
		maxConcurrency: 1,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/crawl.ts"],
		},
	},
});
