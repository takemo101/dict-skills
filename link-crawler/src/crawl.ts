#!/usr/bin/env bun
import { program } from "commander";
import { parseConfig } from "./config.js";
import { Crawler } from "./crawler/index.js";

program
	.name("crawl")
	.description("Crawl technical documentation sites recursively")
	.argument("<url>", "Starting URL to crawl")
	.option("-d, --depth <num>", "Maximum crawl depth", "1")
	.option("-o, --output <dir>", "Output directory", "./crawled")
	.option("--same-domain", "Only follow same-domain links", true)
	.option("--no-same-domain", "Follow cross-domain links")
	.option("--include <pattern>", "Include URL pattern (regex)")
	.option("--exclude <pattern>", "Exclude URL pattern (regex)")
	.option("--delay <ms>", "Delay between requests in ms", "500")
	.option("--timeout <sec>", "Request timeout in seconds", "30")
	.option("--spa", "Enable SPA mode (uses playwright-cli)", false)
	.option("--wait <ms>", "Wait time for SPA rendering in ms", "2000")
	.option("--headed", "Show browser window (SPA mode only)", false)
	.parse();

const options = program.opts();
const startUrl = program.args[0];

if (!startUrl) {
	program.help();
	process.exit(2);
}

const config = parseConfig(options, startUrl);
const crawler = new Crawler(config);

crawler.run().catch((error: Error) => {
	console.error(`Fatal error: ${error.message}`);
	process.exit(1);
});
