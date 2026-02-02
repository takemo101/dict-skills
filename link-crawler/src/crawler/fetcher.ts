import { $ } from "bun";
import type { CrawlConfig, Fetcher, FetchResult } from "../types.js";

/** Playwright-CLI Fetcher (全サイト対応) */
export class PlaywrightFetcher implements Fetcher {
	private sessionId: string;
	private initialized = false;

	constructor(private config: CrawlConfig) {
		this.sessionId = `crawl-${Date.now()}`;
	}

	private async checkPlaywrightCli(): Promise<boolean> {
		try {
			await $`which playwright-cli`.quiet();
			return true;
		} catch {
			return false;
		}
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
			const headedFlag = this.config.headed ? "--headed" : "";

			// ページを開く
			await $`playwright-cli open ${url} --session ${this.sessionId} ${headedFlag}`.quiet();

			// レンダリング待機
			await Bun.sleep(this.config.spaWait);

			// コンテンツ取得
			const result = await $`playwright-cli eval "document.documentElement.outerHTML" --session ${this.sessionId}`.quiet();
			const html = result.text();

			return {
				html,
				finalUrl: url,
				contentType: "text/html",
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`  ✗ Fetch Error: ${message} - ${url}`);
			return null;
		}
	}

	async close(): Promise<void> {
		try {
			await $`playwright-cli close --session ${this.sessionId}`.quiet();
		} catch {
			// セッションが既に閉じている場合は無視
		}
	}
}
