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
	// Validate startUrl format
	try {
		new URL(startUrl);
	} catch {
		throw new ConfigError(`Invalid URL: ${startUrl}`, "startUrl");
	}

	// Generate site-specific output directory if not specified
	const defaultOutputDir = `./.context/${generateSiteName(startUrl)}`;
	const outputDir = String(options.output || defaultOutputDir);

	// Parse depth value safely (handle 0 correctly)
	const depthValue = Number(options.depth);
	const maxDepth = Math.max(
		0,
		Math.min(Number.isNaN(depthValue) ? DEFAULTS.MAX_DEPTH : depthValue, DEFAULTS.MAX_DEPTH_LIMIT),
	);

	// Parse maxPages value safely (0 or negative = unlimited)
	const maxPagesValue = Number(options.maxPages);
	const maxPages =
		Number.isNaN(maxPagesValue) || maxPagesValue <= 0 ? null : Math.floor(maxPagesValue);

	const config: CrawlConfig = {
		startUrl,
		maxDepth,
		maxPages,
		outputDir,
		sameDomain: options.sameDomain !== false,
		includePattern: parsePattern(options.include as string | undefined, "include"),
		excludePattern: parsePattern(options.exclude as string | undefined, "exclude"),
		delay: Math.max(
			0,
			Number.isNaN(Number(options.delay)) ? DEFAULTS.DELAY_MS : Number(options.delay),
		),
		timeout:
			Math.max(
				1,
				Number.isNaN(Number(options.timeout)) ? DEFAULTS.TIMEOUT_SEC : Number(options.timeout),
			) * 1000,
		spaWait: Math.max(
			0,
			Number.isNaN(Number(options.wait)) ? DEFAULTS.SPA_WAIT_MS : Number(options.wait),
		),
		headed: Boolean(options.headed),
		diff: Boolean(options.diff),
		pages: options.pages !== false,
		merge: options.merge !== false,
		chunks: options.chunks === true,
		keepSession: Boolean(options.keepSession),
	};

	// Warn when all output formats are disabled
	if (!config.pages && !config.merge && !config.chunks) {
		console.warn(
			"⚠️  Warning: All output formats are disabled (--no-pages --no-merge without --chunks).",
		);
		console.warn("   Only index.json will be generated. Consider adding --chunks.");
	}

	return config;
}
