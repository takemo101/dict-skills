import { JSDOM } from "jsdom";
import type { CrawlConfig } from "../types.js";

/** URL を正規化 */
export function normalizeUrl(url: string, baseUrl: string): string | null {
	try {
		const parsed = new URL(url, baseUrl);
		parsed.hash = "";
		return parsed.href;
	} catch {
		return null;
	}
}

/** 同一ドメインかチェック */
export function isSameDomain(url: string, baseUrl: string): boolean {
	try {
		const urlHost = new URL(url).hostname;
		const baseHost = new URL(baseUrl).hostname;
		return urlHost === baseHost;
	} catch {
		return false;
	}
}

/** クロール対象かどうか判定 */
export function shouldCrawl(url: string, visited: Set<string>, config: CrawlConfig): boolean {
	if (visited.has(url)) return false;
	if (config.sameDomain && !isSameDomain(url, config.startUrl)) return false;
	if (config.includePattern && !config.includePattern.test(url)) return false;
	if (config.excludePattern?.test(url)) return false;

	// バイナリファイルを除外
	const skipExtensions = /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot)$/i;
	if (skipExtensions.test(url)) return false;

	return true;
}

/** HTML からリンクを抽出（JSDOMインスタンスを使用） */
export function extractLinks(dom: JSDOM, visited: Set<string>, config: CrawlConfig): string[];
/** HTML からリンクを抽出（HTML文字列を使用） */
export function extractLinks(
	html: string,
	baseUrl: string,
	visited: Set<string>,
	config: CrawlConfig,
): string[];
/** HTML からリンクを抽出（実装） */
export function extractLinks(
	htmlOrDom: string | JSDOM,
	visitedOrBaseUrl: Set<string> | string,
	configOrVisited: CrawlConfig | Set<string>,
	config?: CrawlConfig,
): string[] {
	let dom: JSDOM;
	let visited: Set<string>;
	let crawlConfig: CrawlConfig;
	let baseUrl: string;

	if (typeof htmlOrDom === "string") {
		// 既存の使い方（html, baseUrl, visited, config）
		if (!config) {
			throw new Error("Config is required when passing HTML string");
		}
		baseUrl = visitedOrBaseUrl as string;
		visited = configOrVisited as Set<string>;
		crawlConfig = config;
		dom = new JSDOM(htmlOrDom, { url: baseUrl });
	} else {
		// 新しい使い方（dom, visited, config）
		dom = htmlOrDom;
		visited = visitedOrBaseUrl as Set<string>;
		crawlConfig = configOrVisited as CrawlConfig;
		baseUrl = dom.window.location.href;
	}

	const links = new Set<string>();
	const anchors = dom.window.document.querySelectorAll("a[href]");

	for (const anchor of anchors) {
		const href = anchor.getAttribute("href");
		if (
			!href ||
			href.startsWith("#") ||
			href.startsWith("javascript:") ||
			href.startsWith("mailto:")
		) {
			continue;
		}

		const normalized = normalizeUrl(href, baseUrl);
		if (normalized && shouldCrawl(normalized, visited, crawlConfig)) {
			links.add(normalized);
		}
	}

	return Array.from(links);
}
