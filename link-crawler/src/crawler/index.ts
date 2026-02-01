import { join } from "node:path";
import { JSDOM } from "jsdom";
import { computeHash, Hasher } from "../diff/hasher.js";
import { OutputWriter } from "../output/writer.js";
import { htmlToMarkdown } from "../parser/converter.js";
import { extractContent, extractMetadata } from "../parser/extractor.js";
import { extractLinks } from "../parser/links.js";
import type { CrawlConfig, Fetcher } from "../types.js";
import { PlaywrightFetcher } from "./fetcher.js";

/** クローラーエンジン */
export class Crawler {
	private fetcher: Fetcher;
	private writer: OutputWriter;
	private hasher: Hasher;
	private visited = new Set<string>();
	private skippedCount = 0;

	constructor(private config: CrawlConfig) {
		this.fetcher = new PlaywrightFetcher(config);
		this.writer = new OutputWriter(config);
		this.hasher = new Hasher();
	}

	/** クロール開始 */
	async run(): Promise<void> {
		console.log(`\n🕷️  Link Crawler v2.0`);
		console.log(`   URL: ${this.config.startUrl}`);
		console.log(`   Depth: ${this.config.maxDepth}`);
		console.log(`   Output: ${this.config.outputDir}`);
		console.log(`   Mode: playwright-cli`);
		console.log(`   Same domain only: ${this.config.sameDomain}`);
		console.log(`   Diff mode: ${this.config.diff}`);
		console.log("");

		// 差分モード時は既存ハッシュを読み込む
		if (this.config.diff) {
			const indexPath = join(this.config.outputDir, "index.json");
			await this.hasher.loadHashes(indexPath);
			if (this.hasher.size > 0) {
				console.log(`📊 Loaded ${this.hasher.size} existing page hashes\n`);
			}
		}

		try {
			await this.crawl(this.config.startUrl, 0);
		} finally {
			await this.fetcher.close?.();
		}

		const indexPath = this.writer.saveIndex();
		const result = this.writer.getResult();

		console.log(`\n✅ Crawl complete!`);
		console.log(`   Pages: ${result.totalPages}`);
		if (this.config.diff && this.skippedCount > 0) {
			console.log(`   Skipped (unchanged): ${this.skippedCount}`);
		}
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

		// ハッシュ計算
		const hash = computeHash(markdown);

		// 差分モード時：変更がなければスキップ
		if (this.config.diff && !this.hasher.isChanged(url, hash)) {
			this.skippedCount++;
			console.log(`${indent}  ⏭️  Skipped (unchanged)`);
		} else {
			// 保存（ハッシュ付き）
			const pageFile = this.writer.savePage(url, markdown, depth, links, metadata, title, hash);
			console.log(`${indent}  ✓ Saved: ${pageFile} (${links.length} links found)`);
		}

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
