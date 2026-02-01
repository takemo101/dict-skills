import type { CrawlConfig, Fetcher, FetchResult } from "../types.js";

/** 静的サイト用 Fetcher (fetch + JSDOM) */
export class StaticFetcher implements Fetcher {
	constructor(private config: CrawlConfig) {}

	async fetch(url: string): Promise<FetchResult | null> {
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
				},
				signal: AbortSignal.timeout(this.config.timeout),
			});

			if (!response.ok) {
				console.error(`  ✗ HTTP ${response.status}: ${url}`);
				return null;
			}

			const contentType = response.headers.get("content-type") || "";
			const html = await response.text();

			return {
				html,
				finalUrl: response.url,
				contentType,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`  ✗ Error: ${message} - ${url}`);
			return null;
		}
	}
}
