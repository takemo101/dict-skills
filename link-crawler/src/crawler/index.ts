import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { computeHash, Hasher } from "../diff/hasher.js";
import { Chunker } from "../output/chunker.js";
import { Merger } from "../output/merger.js";
import { OutputWriter } from "../output/writer.js";
import { htmlToMarkdown } from "../parser/converter.js";
import { extractContent, extractMetadata } from "../parser/extractor.js";
import { extractLinks } from "../parser/links.js";
import type { CrawlConfig, CrawledPage, Fetcher } from "../types.js";
import { PlaywrightFetcher } from "./fetcher.js";

/** クローラーエンジン */
export class Crawler {
	private fetcher: Fetcher;
	private writer: OutputWriter;
	private hasher: Hasher;
	private visited = new Set<string>();
	private skippedCount = 0;
	/** メモリ内のページ内容 (--no-pages時に使用) */
	private pageContents = new Map<string, string>();

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
		console.log(`   Pages: ${this.config.pages ? "yes" : "no"}`);
		console.log(`   Merge: ${this.config.merge ? "yes" : "no"}`);
		console.log(`   Chunks: ${this.config.chunks ? "yes" : "no"}`);
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

		// 後処理: MergerとChunkerの実行
		await this.runPostProcessing(result.pages);

		console.log(`\n✅ Crawl complete!`);
		console.log(`   Pages: ${result.totalPages}`);
		if (this.config.diff && this.skippedCount > 0) {
			console.log(`   Skipped (unchanged): ${this.skippedCount}`);
		}
		console.log(`   Specs: ${result.specs.length}`);
		console.log(`   Index: ${indexPath}`);
	}

	/** 後処理: MergerとChunkerの実行 */
	private async runPostProcessing(pages: CrawledPage[]): Promise<void> {
		if (pages.length === 0) {
			console.log("\n⚠️  No pages to process");
			return;
		}

		// ページ内容を読み込む (--no-pages時はメモリから取得)
		const pageContents = this.config.pages
			? this.loadPageContentsFromDisk(pages)
			: this.pageContents;

		let fullMdContent = "";

		// Merger実行 (--no-merge時はスキップ)
		if (this.config.merge) {
			console.log("\n🔄 Running Merger...");
			const merger = new Merger(this.config.outputDir);
			const fullPath = merger.writeFull(pages, pageContents);
			console.log(`   ✓ full.md: ${fullPath}`);
			// Chunker用に内容を読み込み
			try {
				fullMdContent = readFileSync(fullPath, "utf-8");
			} catch {
				fullMdContent = "";
			}
		} else if (this.config.chunks) {
			// mergeなしでchunksのみの場合は、メモリから結合内容を生成
			const _merger = new Merger(this.config.outputDir);
			fullMdContent = this.buildFullMarkdown(pages, pageContents);
		}

		// Chunker実行 (--no-chunks時はスキップ)
		if (this.config.chunks && fullMdContent) {
			console.log("\n🔄 Running Chunker...");
			const chunker = new Chunker(this.config.outputDir);
			const chunkFiles = chunker.chunkAndWrite(fullMdContent);
			if (chunkFiles.length > 0) {
				console.log(`   ✓ chunks: ${chunkFiles.length} files in chunks/`);
			} else {
				console.log("   ℹ️  No chunks created (content too small)");
			}
		}
	}

	/** Markdownを結合してfull.md内容を生成 */
	private buildFullMarkdown(pages: CrawledPage[], pageContents: Map<string, string>): string {
		const sections: string[] = [];

		for (const page of pages) {
			const title = page.title || page.url;
			const header = `# ${title}`;
			const urlLine = `> Source: ${page.url}`;
			const content = pageContents.get(page.file) || "";
			// frontmatterを除去
			const cleanContent = content.replace(/^---[\s\S]*?---\n*/, "").trim();
			// タイトルを除去
			const lines = cleanContent.split("\n");
			if (lines.length > 0 && lines[0].startsWith("# ")) {
				lines.shift();
				while (lines.length > 0 && lines[0].trim() === "") {
					lines.shift();
				}
			}
			const body = lines.join("\n");

			sections.push(`${header}\n\n${urlLine}\n\n${body}`);
		}

		return sections.join("\n\n---\n\n");
	}

	/** ページ内容をディスクから読み込む */
	private loadPageContentsFromDisk(pages: CrawledPage[]): Map<string, string> {
		const contents = new Map<string, string>();

		for (const page of pages) {
			try {
				const pagePath = join(this.config.outputDir, page.file);
				const content = readFileSync(pagePath, "utf-8");
				contents.set(page.file, content);
			} catch {
				// ファイルが読み込めない場合は空文字
				contents.set(page.file, "");
			}
		}

		return contents;
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
			// ページ出力 (--no-pages時はスキップ)
			if (this.config.pages) {
				const pageFile = this.writer.savePage(url, markdown, depth, links, metadata, title, hash);
				console.log(`${indent}  ✓ Saved: ${pageFile} (${links.length} links found)`);
			} else {
				// メモリに保存 (Merger/Chunker用)
				const pageNum = String(this.writer.getNextPageNumber()).padStart(3, "0");
				const pageFile = `pages/page-${pageNum}.md`;
				const frontmatter = [
					"---",
					`url: ${url}`,
					`title: "${(metadata.title || title || "").replace(/"/g, '\\"')}"`,
					`crawledAt: ${new Date().toISOString()}`,
					`depth: ${depth}`,
					"---",
					"",
				].join("\n");
				this.pageContents.set(pageFile, frontmatter + markdown);
				// writerにもページ情報を追加（ファイルは書き込まない）
				this.writer.registerPage(url, pageFile, depth, links, metadata, title, hash);
				console.log(`${indent}  ✓ Cached: ${pageFile} (${links.length} links found)`);
			}
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
