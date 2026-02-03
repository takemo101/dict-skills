import { DEFAULTS } from "./constants.js";
import type { CrawlConfig } from "./types.js";
import { generateSiteName } from "./utils/site-name.js";

export function parseConfig(options: Record<string, unknown>, startUrl: string): CrawlConfig {
	// Generate site-specific output directory if not specified
	const defaultOutputDir = `./.context/${generateSiteName(startUrl)}`;
	const outputDir = String(options.output || defaultOutputDir);

	return {
		startUrl,
		maxDepth: Math.min(Number(options.depth) || DEFAULTS.MAX_DEPTH, DEFAULTS.MAX_DEPTH_LIMIT),
		outputDir,
		sameDomain: options.sameDomain !== false,
		includePattern: options.include ? new RegExp(String(options.include)) : null,
		excludePattern: options.exclude ? new RegExp(String(options.exclude)) : null,
		delay: Number(options.delay) || DEFAULTS.DELAY_MS,
		timeout: (Number(options.timeout) || DEFAULTS.TIMEOUT_SEC) * 1000,
		spaWait: Number(options.wait) || DEFAULTS.SPA_WAIT_MS,
		headed: Boolean(options.headed),
		diff: Boolean(options.diff),
		pages: options.pages !== false,
		merge: options.merge !== false,
		chunks: options.chunks === true,
		keepSession: Boolean(options.keepSession),
	};
}
