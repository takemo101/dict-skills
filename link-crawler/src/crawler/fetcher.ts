import type { CrawlConfig, Fetcher, FetchResult } from "../types.js";

/** コマンドを実行してstdoutを返す */
async function exec(cmd: string, args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
	try {
		const proc = Bun.spawn([cmd, ...args], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;
		return { success: exitCode === 0, stdout, stderr };
	} catch {
		return { success: false, stdout: "", stderr: "command not found" };
	}
}

/** playwright-cli のパスを取得（node経由で実行） */
async function findPlaywrightCli(): Promise<{ node: string; cli: string } | null> {
	const nodePaths = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "node"];
	const cliPaths = [
		"/opt/homebrew/bin/playwright-cli",
		"/usr/local/bin/playwright-cli",
		`${process.env.HOME}/.npm-global/bin/playwright-cli`,
	];
	
	for (const node of nodePaths) {
		for (const cli of cliPaths) {
			const result = await exec(node, [cli, "--version"]);
			if (result.success) {
				return { node, cli };
			}
		}
	}
	return null;
}

/** Playwright-CLI Fetcher (全サイト対応) */
export class PlaywrightFetcher implements Fetcher {
	private sessionId: string;
	private initialized = false;
	private nodePath: string = "node";
	private playwrightPath: string = "playwright-cli";

	constructor(private config: CrawlConfig) {
		this.sessionId = `crawl-${Date.now()}`;
	}

	private async checkPlaywrightCli(): Promise<boolean> {
		const result = await findPlaywrightCli();
		if (result) {
			this.nodePath = result.node;
			this.playwrightPath = result.cli;
			return true;
		}
		return false;
	}

	private async runCli(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
		return exec(this.nodePath, [this.playwrightPath, ...args]);
	}

	private async executeFetch(url: string): Promise<FetchResult> {
		const openArgs = ["open", url, "--session", this.sessionId];
		if (this.config.headed) {
			openArgs.push("--headed");
		}

		// ページを開く
		await this.runCli(openArgs);

		// レンダリング待機
		await Bun.sleep(this.config.spaWait);

		// コンテンツ取得
		const result = await this.runCli(["eval", "document.documentElement.outerHTML", "--session", this.sessionId]);
		const html = this.parseCliOutput(result.stdout);

		return {
			html,
			finalUrl: url,
			contentType: "text/html",
		};
	}

	/** playwright-cli の出力からHTMLを抽出 */
	private parseCliOutput(output: string): string {
		// 出力形式: ### Result\n"<html>..."\n### Ran Playwright code...
		const resultMatch = output.match(/^### Result\n"([\s\S]*)"\n### Ran Playwright code/);
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

	async fetch(url: string): Promise<FetchResult | null> {
		if (!this.initialized) {
			const hasPlaywright = await this.checkPlaywrightCli();
			if (!hasPlaywright) {
				console.error("✗ playwright-cli not found. Install with: npm install -g @playwright/cli");
				process.exit(3);
			}
			this.initialized = true;
		}

		try {
			// タイムアウト用のPromiseを作成
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Request timeout after ${this.config.timeout}ms`));
				}, this.config.timeout);
			});

			// fetchとタイムアウトを競争させる
			return await Promise.race([this.executeFetch(url), timeoutPromise]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`  ✗ Fetch Error: ${message} - ${url}`);
			return null;
		}
	}

	async close(): Promise<void> {
		try {
			await this.runCli(["close", "--session", this.sessionId]);
		} catch {
			// セッションが既に閉じている場合は無視
		}
	}
}
