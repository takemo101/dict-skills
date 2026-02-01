#!/usr/bin/env node

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { program } from "commander";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// CLI設定
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
	.parse();

const options = program.opts();
const startUrl = program.args[0];

if (!startUrl) {
	program.help();
}

// 設定
const config = {
	maxDepth: Math.min(parseInt(options.depth), 10),
	outputDir: options.output,
	sameDomain: options.sameDomain,
	includePattern: options.include ? new RegExp(options.include) : null,
	excludePattern: options.exclude ? new RegExp(options.exclude) : null,
	delay: parseInt(options.delay),
	timeout: parseInt(options.timeout) * 1000,
};

// クロール状態
const visited = new Set();
const results = {
	crawledAt: new Date().toISOString(),
	baseUrl: startUrl,
	totalPages: 0,
	pages: [],
	specs: [],
};

// API仕様ファイルのパターン
const specPatterns = {
	openapi: /\/(openapi|swagger)\.(ya?ml|json)$/i,
	jsonSchema: /\.schema\.json$|\/schema\.json$/i,
	graphql: /\/schema\.graphql$/i,
};

// HTML→Markdown変換
function htmlToMarkdown(html) {
	const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
	turndown.use(gfm);
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});
	return turndown
		.turndown(html)
		.replace(/\[\\\[\s*\\\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// URLを正規化
function normalizeUrl(url, baseUrl) {
	try {
		const parsed = new URL(url, baseUrl);
		parsed.hash = "";
		return parsed.href;
	} catch {
		return null;
	}
}

// ドメインチェック
function isSameDomain(url, baseUrl) {
	try {
		const urlHost = new URL(url).hostname;
		const baseHost = new URL(baseUrl).hostname;
		return urlHost === baseHost;
	} catch {
		return false;
	}
}

// URLがクロール対象か判定
function shouldCrawl(url) {
	if (visited.has(url)) return false;
	if (config.sameDomain && !isSameDomain(url, startUrl)) return false;
	if (config.includePattern && !config.includePattern.test(url)) return false;
	if (config.excludePattern && config.excludePattern.test(url)) return false;
	
	// バイナリや不要なファイルを除外
	const skipExtensions = /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot)$/i;
	if (skipExtensions.test(url)) return false;
	
	return true;
}

// ページをフェッチ
async function fetchPage(url) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
			},
			signal: AbortSignal.timeout(config.timeout),
		});

		if (!response.ok) {
			console.error(`  ✗ HTTP ${response.status}: ${url}`);
			return null;
		}

		const contentType = response.headers.get("content-type") || "";
		const text = await response.text();

		return { text, contentType, url: response.url };
	} catch (e) {
		console.error(`  ✗ Error: ${e.message} - ${url}`);
		return null;
	}
}

// API仕様ファイルを検出・保存
async function handleSpec(url, content, contentType) {
	for (const [type, pattern] of Object.entries(specPatterns)) {
		if (pattern.test(url)) {
			const filename = url.split("/").pop();
			const specPath = join(config.outputDir, "specs", filename);
			mkdirSync(dirname(specPath), { recursive: true });
			writeFileSync(specPath, content);
			results.specs.push({
				url,
				type,
				file: `specs/${filename}`,
			});
			console.log(`  📋 Spec: ${type} - ${filename}`);
			return true;
		}
	}
	return false;
}

// ページからリンクを抽出
function extractLinks(dom, baseUrl) {
	const links = new Set();
	const anchors = dom.window.document.querySelectorAll("a[href]");
	
	for (const anchor of anchors) {
		const href = anchor.getAttribute("href");
		if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
			continue;
		}
		const normalized = normalizeUrl(href, baseUrl);
		if (normalized && shouldCrawl(normalized)) {
			links.add(normalized);
		}
	}
	
	return Array.from(links);
}

// メタデータを抽出
function extractMetadata(dom) {
	const doc = dom.window.document;
	const getMeta = (name) => {
		const el = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
		return el?.getAttribute("content") || null;
	};

	return {
		title: doc.querySelector("title")?.textContent?.trim() || null,
		description: getMeta("description") || getMeta("og:description"),
		keywords: getMeta("keywords"),
		author: getMeta("author"),
		ogTitle: getMeta("og:title"),
		ogType: getMeta("og:type"),
	};
}

// ページをクロール
async function crawlPage(url, depth) {
	if (depth > config.maxDepth || visited.has(url)) {
		return [];
	}

	visited.add(url);
	const indent = "  ".repeat(depth);
	console.log(`${indent}→ [${depth}] ${url}`);

	const result = await fetchPage(url);
	if (!result) return [];

	const { text, contentType } = result;

	// API仕様ファイルの場合
	if (!contentType.includes("text/html")) {
		await handleSpec(url, text, contentType);
		return [];
	}

	// HTMLをパース
	const dom = new JSDOM(text, { url });
	const metadata = extractMetadata(dom);
	
	// Readabilityでコンテンツを抽出
	const reader = new Readability(dom.window.document.cloneNode(true));
	const article = reader.parse();

	// リンクを抽出
	const links = extractLinks(dom, url);

	// Markdownに変換
	let markdown = "";
	if (article?.content) {
		markdown = htmlToMarkdown(article.content);
	} else {
		// フォールバック: mainタグなどから抽出
		const fallbackDom = new JSDOM(text, { url });
		const body = fallbackDom.window.document;
		body.querySelectorAll("script, style, noscript, nav, header, footer, aside").forEach(el => el.remove());
		const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;
		if (main?.innerHTML) {
			markdown = htmlToMarkdown(main.innerHTML);
		}
	}

	// ページを保存
	const pageNum = String(results.pages.length + 1).padStart(3, "0");
	const pageFile = `pages/page-${pageNum}.md`;
	const pagePath = join(config.outputDir, pageFile);
	mkdirSync(dirname(pagePath), { recursive: true });

	const frontmatter = [
		"---",
		`url: ${url}`,
		`title: "${(metadata.title || "").replace(/"/g, '\\"')}"`,
		metadata.description ? `description: "${metadata.description.replace(/"/g, '\\"')}"` : null,
		metadata.keywords ? `keywords: "${metadata.keywords}"` : null,
		`crawledAt: ${new Date().toISOString()}`,
		`depth: ${depth}`,
		"---",
		"",
	].filter(Boolean).join("\n");

	writeFileSync(pagePath, frontmatter + markdown);

	results.pages.push({
		url,
		title: metadata.title || article?.title,
		file: pageFile,
		depth,
		links,
		metadata,
	});
	results.totalPages++;
	console.log(`${indent}  ✓ Saved: ${pageFile} (${links.length} links found)`);

	return links;
}

// 再帰的にクロール
async function crawl(url, depth = 0) {
	const links = await crawlPage(url, depth);

	if (depth < config.maxDepth) {
		for (const link of links) {
			if (!visited.has(link)) {
				await sleep(config.delay);
				await crawl(link, depth + 1);
			}
		}
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// メイン処理
async function main() {
	console.log(`\n🕷️  Link Crawler`);
	console.log(`   URL: ${startUrl}`);
	console.log(`   Depth: ${config.maxDepth}`);
	console.log(`   Output: ${config.outputDir}`);
	console.log(`   Same domain only: ${config.sameDomain}`);
	console.log("");

	mkdirSync(config.outputDir, { recursive: true });
	mkdirSync(join(config.outputDir, "pages"), { recursive: true });
	mkdirSync(join(config.outputDir, "specs"), { recursive: true });

	await crawl(startUrl);

	// インデックスを保存
	const indexPath = join(config.outputDir, "index.json");
	writeFileSync(indexPath, JSON.stringify(results, null, 2));

	console.log(`\n✅ Crawl complete!`);
	console.log(`   Pages: ${results.totalPages}`);
	console.log(`   Specs: ${results.specs.length}`);
	console.log(`   Index: ${indexPath}`);
}

main().catch(e => {
	console.error(`Fatal error: ${e.message}`);
	process.exit(1);
});
