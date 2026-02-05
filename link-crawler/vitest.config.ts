import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		globalTeardown: "./tests/global-teardown.ts",
		// Disable file-level parallelism to prevent test interference
		// tests/unit/fetcher.test.ts uses module-level vi.mock("node:fs") which can leak
		fileParallelism: false,
		// forksプールを使用して各テストファイルを完全に分離
		// (threadsではなくforksを使用することで、module mocksが他のファイルに影響しない)
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		// テスト間でモックをクリアして分離を確保
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		// 各テストファイルを完全に分離
		isolate: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/crawl.ts"],
		},
	},
});
