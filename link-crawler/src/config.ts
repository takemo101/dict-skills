import type { CrawlConfig } from "./types.js";

export function parseConfig(options: Record<string, unknown>, startUrl: string): CrawlConfig {
	const outputDir = String(options.output || "./crawled");
	return {
		startUrl,
		maxDepth: Math.min(Number(options.depth) || 1, 10),
		outputDir,
		sameDomain: options.sameDomain !== false,
		includePattern: options.include ? new RegExp(String(options.include)) : null,
		excludePattern: options.exclude ? new RegExp(String(options.exclude)) : null,
		delay: Number(options.delay) || 500,
		timeout: (Number(options.timeout) || 30) * 1000,
		spaWait: Number(options.wait) || 2000,
		headed: Boolean(options.headed),
		diff: Boolean(options.diff),
		outputPages: String(options.outputPages || `${outputDir}/pages`),
		outputMerge: String(options.outputMerge || `${outputDir}/merged.md`),
		outputChunks: String(options.outputChunks || `${outputDir}/chunks`),
	};
}
