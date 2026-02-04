import { DEFAULTS } from "./constants.js";
import { ConfigError } from "./errors.js";
import type { CrawlConfig } from "./types.js";
import { generateSiteName } from "./utils/site-name.js";

/**
 * Parse a regex pattern string into a RegExp object
 * @param pattern - The regex pattern string
 * @param name - The name of the pattern (for error messages)
 * @returns RegExp object or null if pattern is undefined
 * @throws ConfigError if the pattern is invalid
 */
function parsePattern(pattern: string | undefined, name: string): RegExp | null {
	if (!pattern) return null;
	try {
		return new RegExp(String(pattern));
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		throw new ConfigError(`Invalid ${name} pattern: ${errorMessage}`, name);
	}
}

export function parseConfig(options: Record<string, unknown>, startUrl: string): CrawlConfig {
	// Generate site-specific output directory if not specified
	const defaultOutputDir = `./.context/${generateSiteName(startUrl)}`;
	const outputDir = String(options.output || defaultOutputDir);

	return {
		startUrl,
		maxDepth: Math.min(Number(options.depth) || DEFAULTS.MAX_DEPTH, DEFAULTS.MAX_DEPTH_LIMIT),
		outputDir,
		sameDomain: options.sameDomain !== false,
		includePattern: parsePattern(options.include as string | undefined, "include"),
		excludePattern: parsePattern(options.exclude as string | undefined, "exclude"),
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
