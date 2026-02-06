import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Chunker } from "../output/chunker.js";
import { Merger } from "../output/merger.js";
import type { CrawlConfig, CrawledPage } from "../types.js";
import { CrawlLogger } from "./logger.js";

/**
 * 後処理クラス
 * MergerとChunkerの呼び出しを担当
 */
export class PostProcessor {
	private logger: CrawlLogger;
	private merger: Merger;
	private chunker: Chunker;

	constructor(
		private config: CrawlConfig,
		logger?: CrawlLogger,
	) {
		this.logger = logger ?? new CrawlLogger(config);
		this.merger = new Merger(config.outputDir);
		this.chunker = new Chunker(config.outputDir);
	}

	/**
	 * 後処理を実行
	 * @param pages クロール済みページ一覧
	 * @param pageContents ページ内容のMap (--no-pages時に使用)
	 */
	async process(pages: CrawledPage[], pageContents?: Map<string, string>): Promise<void> {
		if (pages.length === 0) {
			this.logger.logPostProcessingSkipped();
			return;
		}

		this.logger.logPostProcessingStart();

		// ページ内容を読み込む (--no-pages時はメモリから取得)
		const contents = this.config.pages
			? this.loadPageContentsFromDisk(pages)
			: (pageContents ?? new Map<string, string>());

		let fullMdContent = "";

		// Merger実行 (--no-merge時はスキップ)
		if (this.config.merge) {
			this.logger.logMergerStart();
			const fullPath = this.merger.writeFull(pages, contents);
			this.logger.logMergerComplete(fullPath);

			// Chunker用に内容を読み込み
			try {
				fullMdContent = readFileSync(fullPath, "utf-8");
			} catch (error) {
				this.logger.logDebug("Failed to read full.md", { path: fullPath, error: String(error) });
				fullMdContent = "";
			}
		} else if (this.config.chunks) {
			// mergeなしでchunksのみの場合は、Mergerを使ってメモリから結合内容を生成
			fullMdContent = this.merger.buildFullContent(pages, contents);
		}

		// Chunker実行 (--no-chunks時はスキップ)
		if (this.config.chunks && fullMdContent) {
			this.logger.logChunkerStart();
			const chunkFiles = this.chunker.chunkAndWrite(fullMdContent);
			this.logger.logChunkerComplete(chunkFiles.length);
		}
	}

	/**
	 * ページ内容をディスクから読み込む
	 * @param pages クロール済みページ一覧
	 * @returns ページ内容のMap
	 */
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
}
