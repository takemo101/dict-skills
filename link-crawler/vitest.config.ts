import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
		// ファイル間の並列実行を無効化してテスト分離問題を解消
		fileParallelism: false,
		// 同時実行数を1に制限してテスト分離を確保
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/crawl.ts"],
		},
	},
});
