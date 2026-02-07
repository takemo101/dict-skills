import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		globalTeardown: "./tests/global-teardown.ts",
		// Enable file-level parallelism for faster test execution
		// forks pool provides complete isolation between test files
		fileParallelism: true,
		// forksプールを使用して各テストファイルを完全に分離
		// (threadsではなくforksを使用することで、module mocksが他のファイルに影響しない)
		pool: "forks",
		// Vitest 4: poolOptions moved to top-level
		singleFork: false,
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
			exclude: [],
		},
	},
});
