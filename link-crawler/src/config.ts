import type { CrawlConfig } from "./types.js";

export function parseConfig(options: Record<string, unknown>, startUrl: string): CrawlConfig {
	return {
		startUrl,
		maxDepth: Math.min(Number(options.depth) || 1, 10),
		outputDir: String(options.output || "./crawled"),
		sameDomain: options.sameDomain !== false,
		includePattern: options.include ? new RegExp(String(options.include)) : null,
		excludePattern: options.exclude ? new RegExp(String(options.exclude)) : null,
		delay: Number(options.delay) || 500,
		timeout: (Number(options.timeout) || 30) * 1000,
		spaWait: Number(options.wait) || 2000,
		headed: Boolean(options.headed),
	};
}
