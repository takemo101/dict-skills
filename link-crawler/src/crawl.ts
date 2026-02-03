#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { parseConfig } from "./config.js";
import { EXIT_CODES } from "./constants.js";
import { Crawler } from "./crawler/index.js";
import { ConfigError, CrawlError, DependencyError, FetchError, TimeoutError } from "./errors.js";

// package.jsonからバージョンを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

program
	.name("crawl")
	.description("Crawl technical documentation sites recursively")
	.argument("<url>", "Starting URL to crawl")
	.option("-d, --depth <num>", "Maximum crawl depth", "1")
	.option("-o, --output <dir>", "Output directory (default: ./.context/<site-name>/)")
	.option("--same-domain", "Only follow same-domain links", true)
	.option("--no-same-domain", "Follow cross-domain links")
	.option("--include <pattern>", "Include URL pattern (regex)")
	.option("--exclude <pattern>", "Exclude URL pattern (regex)")
	.option("--delay <ms>", "Delay between requests in ms", "500")
	.option("--timeout <sec>", "Request timeout in seconds", "30")
	.option("--wait <ms>", "Wait time for page rendering in ms", "2000")
	.option("--headed", "Show browser window", false)
	.option("--diff", "Show diff from previous crawl", false)
	.option("--no-pages", "Skip individual page output")
	.option("--no-merge", "Skip merged output file")
	.option("--chunks", "Enable chunked output files", false)
	.option("--keep-session", "Keep .playwright-cli directory after crawl (for debugging)", false)
	.version(packageJson.version)
	.parse();

const options = program.opts();
const startUrl = program.args[0];

if (!startUrl) {
	program.help();
	process.exit(EXIT_CODES.INVALID_ARGUMENTS);
}

async function main(): Promise<void> {
	try {
		const config = parseConfig(options, startUrl);
		const crawler = new Crawler(config);
		await crawler.run();
		process.exit(EXIT_CODES.SUCCESS);
	} catch (error) {
		if (error instanceof DependencyError) {
			console.error(`✗ ${error.message}`);
			process.exit(EXIT_CODES.DEPENDENCY_ERROR);
		}
		if (error instanceof ConfigError) {
			console.error(`✗ Configuration error: ${error.message}`);
			process.exit(EXIT_CODES.INVALID_ARGUMENTS);
		}
		if (error instanceof FetchError) {
			console.error(`✗ Fetch error at ${error.url}: ${error.message}`);
			process.exit(EXIT_CODES.CRAWL_ERROR);
		}
		if (error instanceof TimeoutError) {
			console.error(`✗ Request timeout after ${error.timeoutMs}ms`);
			process.exit(EXIT_CODES.CRAWL_ERROR);
		}
		// Note: CrawlError check must come after all subclasses (TimeoutError, FetchError, etc.)
		// to ensure specific error handling takes precedence over the generic handler.
		if (error instanceof CrawlError) {
			console.error(`✗ ${error.toString()}`);
			process.exit(EXIT_CODES.CRAWL_ERROR);
		}
		// 未知のエラー
		const message = error instanceof Error ? error.message : String(error);
		console.error(`✗ Fatal error: ${message}`);
		process.exit(EXIT_CODES.GENERAL_ERROR);
	}
}

main();
