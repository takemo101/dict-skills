import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		fileParallelism: false,
		include: ["tests/**/*.test.ts"],
		// ファイル間の並列実行を無効化してテスト分離問題を解消
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
