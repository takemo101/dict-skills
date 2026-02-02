import { join } from "node:path";
import { JSDOM } from "jsdom";
import { FILENAME } from "../constants.js";
import { computeHash, Hasher } from "../diff/hasher.js";
import { OutputWriter } from "../output/writer.js";
import { htmlToMarkdown } from "../parser/converter.js";
import { extractContent, extractMetadata } from "../parser/extractor.js";
import { extractLinks } from "../parser/links.js";
import type { CrawlConfig, Fetcher } from "../types.js";
import { CrawlLogger } from "./logger.js";
import { PostProcessor } from "./post-processor.js";

/** クローラーエンジン */
export class Crawler {
	private fetcher!: Fetcher;
	private writer: OutputWriter;
	private hasher: Hasher;
	private logger: CrawlLogger;
	private postProcessor: PostProcessor;
	private visited = new Set<string>();
	/** メモリ内のページ内容 (--no-pages時に使用) */
	private pageContents = new Map<string, string>();
	private fetcherPromise?: Promise<Fetcher>;

	constructor(
		private config: CrawlConfig,
		fetcher?: Fetcher,
	) {
		this.writer = new OutputWriter(config);
		this.hasher = new Hasher();
		this.logger = new CrawlLogger(config);
		this.postProcessor = new PostProcessor(config, this.logger);
		if (fetcher) {
			this.fetcher = fetcher;
		} else {
			this.fetcherPromise = createPlaywrightFetcher(config);
		}
	}

	/** Fetcherの初期化 */
	private async initFetcher(): Promise<Fetcher> {
		if (!this.fetcher && this.fetcherPromise) {
			this.fetcher = await this.fetcherPromise;
			this.fetcherPromise = undefined;
		}
		return this.fetcher;
	}

	/** クロール開始 */
	async run(): Promise<void> {
		// Fetcherの初期化
		await this.initFetcher();

		this.logger.logStart();

		// 差分モード時は既存ハッシュを読み込む
		if (this.config.diff) {
			const indexPath = join(this.config.outputDir, FILENAME.INDEX_JSON);
			await this.hasher.loadHashes(indexPath);
			this.logger.logLoadedHashes(this.hasher.size);
		}

		try {
			await this.crawl(this.config.startUrl, 0);
		} finally {
			await this.fetcher?.close?.();
		}

		const indexPath = this.writer.saveIndex();
		const result = this.writer.getResult();

		// 後処理: MergerとChunkerの実行
		await this.postProcessor.process(result.pages, this.pageContents);

		// 完了ログ
		this.logger.logComplete(result.totalPages, result.specs.length, indexPath);
	}

	/** 再帰クロール */
	private async crawl(url: string, depth: number): Promise<void> {
		if (depth > this.config.maxDepth || this.visited.has(url)) {
			return;
		}

		this.visited.add(url);
		this.logger.logCrawlStart(url, depth);

		const result = await this.fetcher.fetch(url);
		if (!result) return;

		const { html, contentType } = result;

		// API仕様ファイルの場合
		if (!contentType.includes("text/html")) {
			const specResult = this.writer.handleSpec(url, html);
			if (specResult) {
				this.logger.logSpecDetected(specResult.type, specResult.filename);
			}
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
			this.logger.logSkipped(depth);
		} else {
			// ページ出力 (--no-pages時はスキップ)
			if (this.config.pages) {
				const pageFile = this.writer.savePage(url, markdown, depth, links, metadata, title, hash);
				this.logger.logPageSaved(pageFile, depth, links.length);
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
					"",
				]
					.filter((line) => line !== null)
					.join("\n");
				this.pageContents.set(pageFile, frontmatter + markdown);
				// writerにもページ情報を追加（ファイルは書き込まない）
				this.writer.registerPage(url, pageFile, depth, links, metadata, title, hash);
				this.logger.logPageSaved(pageFile, depth, links.length, true);
			}
		}

		// 再帰
		if (depth < this.config.maxDepth) {
			for (const link of links) {
				if (!this.visited.has(link)) {
					await sleep(this.config.delay);
					await this.crawl(link, depth + 1);
				}
			}
		}
	}
}

/** PlaywrightFetcherのファクトリ関数（動的インポート） */
async function createPlaywrightFetcher(config: CrawlConfig): Promise<Fetcher> {
	// 動的インポートを使用してBun依存のモジュールを遅延ロード
	const mod = await import("./fetcher.js");
	return new mod.PlaywrightFetcher(config);
}

/** スリープ関数 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
