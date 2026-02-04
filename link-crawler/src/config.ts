import { DEFAULTS } from "./constants.js";
import { ConfigError } from "./errors.js";
import type { CrawlConfig } from "./types.js";
import { generateSiteName } from "./utils/site-name.js";

export function parseConfig(options: Record<string, unknown>, startUrl: string): CrawlConfig {
	// Generate site-specific output directory if not specified
	const defaultOutputDir = `./.context/${generateSiteName(startUrl)}`;
	const outputDir = String(options.output || defaultOutputDir);

	// Validate and parse include pattern
	let includePattern: RegExp | null = null;
	if (options.include) {
		try {
			includePattern = new RegExp(String(options.include));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ConfigError(
				`Invalid regular expression pattern for --include: ${message}`,
				"include",
			);
		}
	}

	// Validate and parse exclude pattern
	let excludePattern: RegExp | null = null;
	if (options.exclude) {
		try {
			excludePattern = new RegExp(String(options.exclude));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ConfigError(
				`Invalid regular expression pattern for --exclude: ${message}`,
				"exclude",
			);
		}
	}

	return {
		startUrl,
		maxDepth: Math.min(Number(options.depth) || DEFAULTS.MAX_DEPTH, DEFAULTS.MAX_DEPTH_LIMIT),
		outputDir,
		sameDomain: options.sameDomain !== false,
		includePattern,
		excludePattern,
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
