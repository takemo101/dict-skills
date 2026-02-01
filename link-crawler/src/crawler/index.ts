import { JSDOM } from "jsdom";
import { OutputWriter } from "../output/writer.js";
import { htmlToMarkdown } from "../parser/converter.js";
import { extractContent, extractMetadata } from "../parser/extractor.js";
import { extractLinks } from "../parser/links.js";
import type { CrawlConfig, Fetcher } from "../types.js";
import { SPAFetcher } from "./spa.js";
import { StaticFetcher } from "./static.js";

/** クローラーエンジン */
export class Crawler {
	private fetcher: Fetcher;
	private writer: OutputWriter;
	private visited = new Set<string>();

	constructor(private config: CrawlConfig) {
		this.fetcher = config.spa ? new SPAFetcher(config) : new StaticFetcher(config);
		this.writer = new OutputWriter(config);
	}

	/** クロール開始 */
	async run(): Promise<void> {
		console.log(`\n🕷️  Link Crawler v2.0`);
		console.log(`   URL: ${this.config.startUrl}`);
		console.log(`   Depth: ${this.config.maxDepth}`);
		console.log(`   Output: ${this.config.outputDir}`);
		console.log(`   Mode: ${this.config.spa ? "SPA (playwright-cli)" : "Static"}`);
		console.log(`   Same domain only: ${this.config.sameDomain}`);
		console.log("");

		try {
			await this.crawl(this.config.startUrl, 0);
		} finally {
			await this.fetcher.close?.();
		}

		const indexPath = this.writer.saveIndex();
		const result = this.writer.getResult();

		console.log(`\n✅ Crawl complete!`);
		console.log(`   Pages: ${result.totalPages}`);
		console.log(`   Specs: ${result.specs.length}`);
		console.log(`   Index: ${indexPath}`);
	}

	/** 再帰クロール */
	private async crawl(url: string, depth: number): Promise<void> {
		if (depth > this.config.maxDepth || this.visited.has(url)) {
			return;
		}

		this.visited.add(url);
		const indent = "  ".repeat(depth);
		console.log(`${indent}→ [${depth}] ${url}`);

		const result = await this.fetcher.fetch(url);
		if (!result) return;

		const { html, contentType } = result;

		// API仕様ファイルの場合
		if (!contentType.includes("text/html")) {
			this.writer.handleSpec(url, html);
			return;
		}

		// メタデータ抽出
		const dom = new JSDOM(html, { url });
		const metadata = extractMetadata(dom);

		// コンテンツ抽出
		const { title, content } = extractContent(html, url);

		// リンク抽出
		const links = extractLinks(html, url, this.visited, this.config);

		// Markdown変換
		const markdown = content ? htmlToMarkdown(content) : "";

		// 保存
		const pageFile = this.writer.savePage(url, markdown, depth, links, metadata, title);
		console.log(`${indent}  ✓ Saved: ${pageFile} (${links.length} links found)`);

		// 再帰
		if (depth < this.config.maxDepth) {
			for (const link of links) {
				if (!this.visited.has(link)) {
					await Bun.sleep(this.config.delay);
					await this.crawl(link, depth + 1);
				}
			}
		}
	}
}
