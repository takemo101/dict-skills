import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PATHS, PATTERNS } from "../constants.js";
import { DependencyError, FetchError, TimeoutError } from "../errors.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../types.js";
import type { RuntimeAdapter } from "../utils/runtime.js";
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
	private async executeFetch(url: string): Promise<FetchResult | null> {
		const openArgs = ["open", url, "--session", this.sessionId];
		if (this.config.headed) {
			openArgs.push("--headed");
		}

		// ページを開く
		const openResult = await this.runCli(openArgs);

		// 404等でページが開けない場合はnullを返してスキップ
		if (!openResult.success) {
			if (
				openResult.stderr.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
				openResult.stdout.includes("chrome-error://")
			) {
				return null;
			}
			throw new FetchError(`Failed to open page: ${openResult.stderr}`, url);
		}

		// エラーページにリダイレクトされた場合はスキップ
		if (
			openResult.stdout.includes("chrome-error://") ||
			openResult.stdout.includes("Page URL: chrome-error://")
		) {
			return null;
		}

		// HTTPステータスコードを確認（networkコマンドを使用）
		const statusCode = await this.getHttpStatusCode();
		if (statusCode !== null && statusCode !== 200) {
			// 200以外はスキップ
			return null;
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

	/** HTTPステータスコードを取得 */
	private async getHttpStatusCode(): Promise<number | null> {
		try {
			const networkResult = await this.runCli(["network", "--session", this.sessionId]);
			if (!networkResult.success) {
				return null;
			}

			// networkログファイルのパスを抽出
			const logMatch = networkResult.stdout.match(/\[Network\]\(([^)]+)\)/);
			if (logMatch) {
				// 相対パスから絶対パスを構築
				const logPath = logMatch[1].replace(/\.\.\/+/g, "");
				const fullPath = join(process.cwd(), logPath);

				if (existsSync(fullPath)) {
					const logContent = await this.runtime.readFile(fullPath);
					// 最後のリクエストのステータスコードを抽出
					const statusMatch = logContent.match(/status:\s*(\d+)/);
					if (statusMatch) {
						return parseInt(statusMatch[1], 10);
					}
				}
			}
			return null;
		} catch {
			return null;
		}
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
					reject(
						new TimeoutError(`Request timeout after ${this.config.timeout}ms`, this.config.timeout),
					);
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
			return resultMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
		}
	}
	// フォールバック: そのまま返す
	return output;
}
