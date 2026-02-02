import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DependencyError, FetchError, TimeoutError } from "../errors.js";
import { PATHS, PATTERNS } from "../constants.js";
import type { RuntimeAdapter } from "../utils/runtime.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../types.js";
import { createRuntimeAdapter } from "../utils/runtime.js";

/** Playwright CLIのパスを検索する設定 */
export interface PlaywrightPathConfig {
	nodePaths: readonly string[];
	cliPaths: readonly string[];
}

/** Playwright-CLI Fetcher (全サイト対応) */
export class PlaywrightFetcher implements Fetcher {
	private sessionId: string;
	private initialized = false;
	private nodePath: string = "node";
	private playwrightPath: string = "playwright-cli";
	private runtime: RuntimeAdapter;
	private pathConfig: PlaywrightPathConfig;

	constructor(
		private config: CrawlConfig,
		runtime?: RuntimeAdapter,
		pathConfig?: PlaywrightPathConfig,
	) {
		this.sessionId = `crawl-${Date.now()}`;
		this.runtime = runtime ?? createRuntimeAdapter();
		this.pathConfig = pathConfig ?? {
			nodePaths: PATHS.NODE_PATHS,
			cliPaths: PATHS.PLAYWRIGHT_PATHS,
		};
	}

	/** Playwright CLIが利用可能かチェック */
	private async checkPlaywrightCli(): Promise<boolean> {
		for (const node of this.pathConfig.nodePaths) {
			for (const cli of this.pathConfig.cliPaths) {
				const result = await this.runtime.spawn(node, [cli, "--version"]);
				if (result.success) {
					this.nodePath = node;
					this.playwrightPath = cli;
					return true;
				}
			}
		}
		return false;
	}

	/** CLIコマンドを実行 */
	private async runCli(
		args: string[],
	): Promise<{ success: boolean; stdout: string; stderr: string }> {
		return this.runtime.spawn(this.nodePath, [this.playwrightPath, ...args]);
	}

	/** フェッチを実行 */
	private async executeFetch(url: string): Promise<FetchResult> {
		const openArgs = ["open", url, "--session", this.sessionId];
		if (this.config.headed) {
			openArgs.push("--headed");
		}

		// ページを開く
		const openResult = await this.runCli(openArgs);
		if (!openResult.success) {
			throw new FetchError(`Failed to open page: ${openResult.stderr}`, url);
		}

		// レンダリング待機
		await this.runtime.sleep(this.config.spaWait);

		// コンテンツ取得
		const result = await this.runCli([
			"eval",
			"document.documentElement.outerHTML",
			"--session",
			this.sessionId,
		]);
		if (!result.success) {
			throw new FetchError(`Failed to get content: ${result.stderr}`, url);
		}

		const html = parseCliOutput(result.stdout);

		return {
			html,
			finalUrl: url,
			contentType: "text/html",
		};
	}

	async fetch(url: string): Promise<FetchResult | null> {
		if (!this.initialized) {
			const hasPlaywright = await this.checkPlaywrightCli();
			if (!hasPlaywright) {
				throw new DependencyError(
					"playwright-cli not found. Install with: npm install -g @playwright/cli",
					"playwright-cli",
				);
			}
			this.initialized = true;
		}

		try {
			// タイムアウト用のPromiseを作成
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new TimeoutError(`Request timeout after ${this.config.timeout}ms`, this.config.timeout));
				}, this.config.timeout);
			});

			// fetchとタイムアウトを競争させる
			return await Promise.race([this.executeFetch(url), timeoutPromise]);
		} catch (error) {
			if (error instanceof FetchError || error instanceof TimeoutError) {
				throw error;
			}
			const message = error instanceof Error ? error.message : String(error);
			throw new FetchError(message, url, error instanceof Error ? error : undefined);
		}
	}

	async close(): Promise<void> {
		try {
			await this.runCli(["close", "--session", this.sessionId]);
		} catch {
			// セッションが既に閉じている場合は無視
		}

		// .playwright-cli ディレクトリをクリーンアップ
		if (!this.config.keepSession) {
			try {
				const cliDir = join(process.cwd(), ".playwright-cli");
				if (existsSync(cliDir)) {
					rmSync(cliDir, { recursive: true, force: true });
				}
			} catch {
				// クリーンアップ失敗は無視
			}
		}
	}
}

/**
 * playwright-cli の出力からHTMLを抽出
 * @param output CLI出力文字列
 * @returns 抽出されたHTML
 */
export function parseCliOutput(output: string): string {
	// 出力形式: ### Result\n"<html>..."\n### Ran Playwright code...
	const resultMatch = output.match(PATTERNS.CLI_RESULT);
	if (resultMatch) {
		// JSON文字列としてパース（エスケープを解除）
		try {
			return JSON.parse(`"${resultMatch[1]}"`);
		} catch {
			// パース失敗時はエスケープを手動で解除
			return resultMatch[1]
				.replace(/\\n/g, "\n")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, "\\");
		}
	}
	// フォールバック: そのまま返す
	return output;
}
