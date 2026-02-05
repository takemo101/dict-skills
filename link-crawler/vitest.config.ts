import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		// Disable file-level parallelism to prevent test interference
		// Some tests (e.g., fetcher.test.ts) use module-level mocks that can affect other files
		// Running tests sequentially ensures proper isolation
		fileParallelism: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/crawl.ts"],
		},
	},
});
