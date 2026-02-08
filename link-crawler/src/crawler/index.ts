import { JSDOM } from "jsdom";
import { computeHash, Hasher } from "../diff/index.js";
import { OutputWriter } from "../output/writer.js";
import { htmlToMarkdown } from "../parser/converter.js";
import { extractContent, extractMetadata } from "../parser/extractor.js";
import { extractLinks } from "../parser/links.js";
import type { CrawlConfig, Fetcher, FetchResult, PageMetadata } from "../types.js";
import type { RuntimeAdapter } from "../utils/runtime.js";
import { createRuntimeAdapter } from "../utils/runtime.js";
import { CrawlLogger } from "./logger.js";
import { PostProcessor } from "./post-processor.js";
import { RobotsChecker } from "./robots.js";

/** ページ解析結果 */
interface ParsedPage {
	metadata: PageMetadata;
	links: string[];
	title: string | null;
	markdown: string;
	hash: string;
}

/** クローラーエンジン */
export class Crawler {
	private fetcher!: Fetcher;
	private writer: OutputWriter;
	private hasher: Hasher | null = null;
	private robotsChecker: RobotsChecker | null = null;
	private logger: CrawlLogger;
	private postProcessor: PostProcessor;
	private runtime: RuntimeAdapter;
	private visited = new Set<string>();
	/** メモリ内のページ内容 (--no-pages時に使用) */
	private pageContents = new Map<string, string>();
	private fetcherPromise?: Promise<Fetcher>;
	/** 最大ページ数到達ログの重複防止 */
	private maxPagesReachedLogged = false;
	/** クリーンアップ進行中フラグ（重複実行防止） */
	private isCleaningUp = false;

	constructor(
		private config: CrawlConfig,
		fetcher?: Fetcher,
	) {
		this.logger = new CrawlLogger(config);
		this.writer = new OutputWriter(config, this.logger);
		this.postProcessor = new PostProcessor(config, this.logger);
		this.runtime = createRuntimeAdapter();
		if (fetcher) {
			this.fetcher = fetcher;
		} else {
			this.fetcherPromise = createPlaywrightFetcher(config);
		}
	}

	/** Fetcherの初期化 */
	private async initFetcher(): Promise<Fetcher> {
		if (!this.fetcher && this.fetcherPromise) {
			this.logger.logDebug("Initializing Fetcher (playwright-cli)");
			this.fetcher = await this.fetcherPromise;
			this.fetcherPromise = undefined;
			this.logger.logDebug("Fetcher initialized successfully");
		}
		return this.fetcher;
	}

	/** robots.txt の取得 */
	private async fetchRobotsTxt(): Promise<void> {
		try {
			const baseUrl = new URL(this.config.startUrl);
			const robotsUrl = `${baseUrl.origin}/robots.txt`;
			this.logger.logDebug("Fetching robots.txt", { url: robotsUrl });

			const result = await this.fetcher.fetch(robotsUrl);
			if (result?.contentType.includes("text/plain")) {
				this.robotsChecker = new RobotsChecker(result.html);
				this.logger.logDebug("robots.txt loaded and parsed", { url: robotsUrl });
			} else {
				this.logger.logDebug("robots.txt not available (allowing all)");
			}
		} catch (_error) {
			// 取得失敗時は全許可（エラーログは出力しない）
			this.logger.logDebug("robots.txt fetch failed (allowing all)");
		}
	}

	/** クロール開始 */
	async run(): Promise<void> {
		// Fetcherの初期化
		await this.initFetcher();

		this.logger.logStart();

		// robots.txt の取得
		if (this.config.respectRobots) {
			await this.fetchRobotsTxt();
		}

		// 差分モード時は既存ハッシュを読み込む
		if (this.config.diff) {
			const existingHashes = this.writer.getIndexManager().getExistingHashes();
			this.hasher = new Hasher(existingHashes);
			this.logger.logLoadedHashes(this.hasher.size);
			this.logger.logDebug("Diff mode enabled", { hashCount: this.hasher.size });
		}

		try {
			await this.crawl(this.config.startUrl, 0);
		} finally {
			await this.fetcher?.close?.();
		}

		// 差分モード時: 訪問済みURLを渡す
		if (this.config.diff) {
			this.writer.setVisitedUrls(this.visited);
		}

		const indexPath = this.writer.saveIndex();
		const result = this.writer.getResult();

		// 後処理: MergerとChunkerの実行
		await this.postProcessor.process(result.pages, this.pageContents);

		// 完了ログ
		this.logger.logComplete(result.totalPages, result.specs.length, indexPath);
	}

	/** グレースフルシャットダウン（シグナルハンドラから呼ばれる） */
	async cleanup(): Promise<void> {
		// Idempotency guard: prevent double cleanup
		if (this.isCleaningUp) {
			this.logger.logDebug("cleanup() called but already in progress (skipping)");
			return;
		}
		this.isCleaningUp = true;

		this.logger.logDebug("Cleanup initiated");

		try {
			// 1. 途中結果を保存
			if (this.config.diff) {
				this.writer.setVisitedUrls(this.visited);
			}
			const indexPath = this.writer.saveIndex();
			this.logger.logDebug("Saved partial index", { path: indexPath });

			// 2. Fetcher をクローズ（初期化中の場合も待機）
			if (this.fetcherPromise) {
				try {
					const fetcher = await this.fetcherPromise;
					await fetcher.close?.();
				} catch {
					// 初期化失敗は無視
				}
			} else {
				await this.fetcher?.close?.();
			}
			this.logger.logDebug("Closed fetcher");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.logDebug("Cleanup error (non-fatal)", { error: message });
		}
	}

	/** 再帰クロール */
	private async crawl(url: string, depth: number): Promise<void> {
		// 1. 事前チェック
		if (!this.shouldCrawlUrl(url, depth)) {
			return;
		}

		// 2. 訪問済みマーク
		this.visited.add(url); // URL単位で訪問済みを管理（深度は無関係）
		this.logger.logCrawlStart(url, depth);

		// 3. フェッチ
		const result = await this.fetchPage(url, depth);
		if (!result) {
			return;
		}

		// 4. コンテンツタイプ判定
		if (!result.contentType.includes("text/html")) {
			this.handleSpecFile(url, result.html);
			return;
		}

		// 5. HTML処理（抽出、変換、保存、再帰）
		await this.processHtmlPage(url, result.html, depth);
	}

	/** クロール可否チェック */
	private shouldCrawlUrl(url: string, depth: number): boolean {
		// maxPages制限チェック
		if (this.config.maxPages !== null && this.visited.size >= this.config.maxPages) {
			if (!this.maxPagesReachedLogged) {
				this.logger.logMaxPagesReached(this.config.maxPages);
				this.maxPagesReachedLogged = true;
			}
			return false;
		}

		// depth制限と訪問済みチェック
		if (depth > this.config.maxDepth || this.visited.has(url)) {
			return false;
		}

		// robots.txt チェック
		if (this.robotsChecker && !this.robotsChecker.isAllowed(url)) {
			this.logger.logDebug("Blocked by robots.txt", { url });
			return false;
		}

		return true;
	}

	/** ページフェッチとエラーハンドリング */
	private async fetchPage(url: string, depth: number): Promise<FetchResult | null> {
		try {
			const result = await this.fetcher.fetch(url);
			if (!result) {
				// fetch()がnullを返した場合：404やエラーページ
				this.logger.logFetchError(url, "Page not available (404 or error page)", depth);
				return null;
			}

			this.logger.logDebug("Page fetched", {
				url,
				depth,
				contentType: result.contentType,
				htmlLength: result.html.length,
			});

			return result;
		} catch (error) {
			// fetch()が例外をスローした場合：FetchError, TimeoutError等
			const message = error instanceof Error ? error.message : String(error);
			this.logger.logFetchError(url, message, depth);
			return null; // スキップして続行（クロール全体は停止しない）
		}
	}

	/** API仕様ファイル処理 */
	private handleSpecFile(url: string, html: string): void {
		const specResult = this.writer.handleSpec(url, html);
		if (specResult) {
			this.logger.logSpecDetected(specResult.type, specResult.filename);
		}
	}

	/** HTMLページの処理 */
	private async processHtmlPage(url: string, html: string, depth: number): Promise<void> {
		// 1. JSDOM生成
		const dom = new JSDOM(html, { url });

		// 2. ページ解析
		const parsed = this.parsePage(url, dom, depth);

		// 3. 保存処理
		this.processAndSavePage(url, parsed, depth);

		// 4. 再帰クロール
		await this.crawlLinks(parsed.links, depth);
	}

	/** ページ解析: メタデータ・リンク・コンテンツの抽出と変換 */
	private parsePage(_url: string, dom: JSDOM, _depth: number): ParsedPage {
		// メタデータ抽出
		const metadata = extractMetadata(dom);
		this.logger.logDebug("Metadata extracted", {
			title: metadata.title,
			description: metadata.description?.substring(0, 100),
		});

		// リンク抽出
		// Issue #745: extractContent は内部でDOMをクローンするため順序依存は解消されたが、
		// 論理的な順序として先にリンクを抽出する
		const links = extractLinks(dom, this.visited, this.config);
		this.logger.logDebug("Links extracted", { linkCount: links.length, links: links.slice(0, 5) });

		// コンテンツ抽出
		// Issue #745: 内部でDOMクローンを使用するため、元のDOMは変更されない
		const { title, content } = extractContent(dom);
		this.logger.logDebug("Content extracted", { title, contentLength: content?.length || 0 });

		// Markdown変換
		const markdown = content ? htmlToMarkdown(content) : "";
		this.logger.logDebug("HTML converted to Markdown", { markdownLength: markdown.length });

		// ハッシュ計算
		const hash = computeHash(markdown);
		this.logger.logDebug("Content hash computed", { hash: `${hash.substring(0, 16)}...` });

		return { metadata, links, title, markdown, hash };
	}

	/** ページ保存処理: 差分チェックと保存判定 */
	private processAndSavePage(url: string, parsed: ParsedPage, depth: number): void {
		// 差分チェックと保存
		if (this.shouldSavePage(url, parsed.hash, depth)) {
			this.savePage(
				url,
				parsed.markdown,
				depth,
				parsed.links,
				parsed.metadata,
				parsed.title,
				parsed.hash,
			);
		}
	}

	/** 差分モードでの保存判定 */
	private shouldSavePage(url: string, hash: string, depth: number): boolean {
		// 差分モード時：変更がなければスキップ
		if (this.config.diff && this.hasher && !this.hasher.isChanged(url, hash)) {
			this.logger.logDebug("Page unchanged (skipping)", {
				url,
				hash: `${hash.substring(0, 16)}...`,
			});
			this.logger.logSkipped(depth);
			return false;
		}

		if (this.config.diff && this.hasher) {
			this.logger.logDebug("Page changed (processing)", {
				url,
				hash: `${hash.substring(0, 16)}...`,
			});
		}

		return true;
	}

	/** ページ保存処理 */
	private savePage(
		url: string,
		markdown: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
		hash: string,
	): void {
		// ページ出力 (--no-pages時はスキップ)
		if (this.config.pages) {
			const pageFile = this.writer.savePage(url, markdown, depth, links, metadata, title, hash);
			this.logger.logPageSaved(pageFile, depth, links.length);
		} else {
			// メモリに保存 (Merger/Chunker用)
			const pageFile = this.writer.buildPageFilename(metadata, title);
			const frontmatter = this.writer.buildFrontmatter(url, metadata, title, depth, hash);
			this.pageContents.set(pageFile, frontmatter + markdown);
			// writerにもページ情報を追加（ファイルは書き込まない）
			this.writer.registerPage(url, pageFile, depth, links, metadata, title, hash);
			this.logger.logPageSaved(pageFile, depth, links.length, true);
		}
	}

	/** リンクの再帰クロール */
	private async crawlLinks(links: string[], depth: number): Promise<void> {
		// 再帰
		if (depth < this.config.maxDepth) {
			for (const link of links) {
				if (!this.visited.has(link)) {
					await this.runtime.sleep(this.config.delay);
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
	const debug = process.env.DEBUG === "1";
	return new mod.PlaywrightFetcher(config, undefined, undefined, debug);
}
