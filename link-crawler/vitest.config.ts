import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		globalTeardown: "./tests/global-teardown.ts",
		// Disable file-level parallelism to prevent test interference
		// tests/unit/fetcher.test.ts uses module-level vi.mock("node:fs") which can leak
		fileParallelism: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/crawl.ts"],
		},
	},
});
