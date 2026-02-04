import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CrawlLogger } from "../crawler/logger.js";
import type { CrawledPage, CrawlResult, PageMetadata } from "../types.js";

/**
 * CrawlResult型の型ガード関数
 * @param value 検証する値
 * @returns valueがCrawlResult型であればtrue
 */
function isValidCrawlResult(value: unknown): value is CrawlResult {
	return (
		typeof value === "object" &&
		value !== null &&
		"pages" in value &&
		Array.isArray((value as Record<string, unknown>).pages)
	);
}

/**
 * インデックス管理クラス
 * index.jsonの読み込み・保存・管理を担当
 */
export class IndexManager {
	private result: CrawlResult;
	/** 既存のページ情報（URL→CrawledPage） */
	private existingPages: Map<string, CrawledPage> = new Map();
	private pageCount = 0;

	constructor(
		private outputDir: string,
		private baseUrl: string,
		private config: { maxDepth: number; sameDomain: boolean },
		private logger?: CrawlLogger,
	) {
		// 既存のindex.jsonを読み込み
		this.loadExistingIndex();

		this.result = {
			crawledAt: new Date().toISOString(),
			baseUrl: this.baseUrl,
			config: {
				maxDepth: this.config.maxDepth,
				sameDomain: this.config.sameDomain,
			},
			totalPages: 0,
			pages: [],
			specs: [],
		};
	}

	/**
	 * 既存のindex.jsonを読み込む
	 */
	private loadExistingIndex(): void {
		const indexPath = join(this.outputDir, "index.json");
		if (!existsSync(indexPath)) {
			return;
		}

		try {
			const content = readFileSync(indexPath, "utf-8");
			const parsed = JSON.parse(content);

			// 型ガードによる検証
			if (isValidCrawlResult(parsed)) {
				for (const page of parsed.pages) {
					this.existingPages.set(page.url, page);
				}
			} else {
				this.logger?.logIndexFormatError(indexPath);
			}
		} catch (error) {
			this.logger?.logIndexLoadError(
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	/**
	 * 既存ページのハッシュを取得
	 * @param url 対象URL
	 * @returns ハッシュ値、存在しなければundefined
	 */
	getExistingHash(url: string): string | undefined {
		return this.existingPages.get(url)?.hash;
	}

	/**
	 * 既存の全ハッシュを取得
	 * @returns URL → ハッシュのMap
	 */
	getExistingHashes(): Map<string, string> {
		const hashes = new Map<string, string>();
		for (const [url, page] of this.existingPages) {
			if (page.hash) {
				hashes.set(url, page.hash);
			}
		}
		return hashes;
	}

	/**
	 * 既存ページ数を取得
	 */
	getExistingPageCount(): number {
		return this.existingPages.size;
	}

	/**
	 * 次のページ番号を取得
	 */
	getNextPageNumber(): number {
		return this.pageCount + 1;
	}

	/**
	 * ページを登録（インデックスに追加）
	 * @returns 登録されたページ情報
	 */
	registerPage(
		url: string,
		file: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
		hash: string,
	): CrawledPage {
		this.pageCount++;
		const pageCrawledAt = new Date().toISOString();
		const page: CrawledPage = {
			url,
			title: metadata.title || title,
			file,
			depth,
			links,
			metadata,
			hash,
			crawledAt: pageCrawledAt,
		};
		this.result.pages.push(page);
		this.result.totalPages++;
		return page;
	}

	/**
	 * 仕様ファイルを追加
	 */
	addSpec(url: string, type: string, file: string): void {
		this.result.specs.push({ url, type, file });
	}

	/**
	 * インデックスを保存
	 * @returns 保存したファイルパス
	 */
	saveIndex(): string {
		const indexPath = join(this.outputDir, "index.json");
		writeFileSync(indexPath, JSON.stringify(this.result, null, 2));
		return indexPath;
	}

	/**
	 * 結果を取得
	 */
	getResult(): CrawlResult {
		return this.result;
	}

	/**
	 * 登録済みページ数を取得
	 */
	getTotalPages(): number {
		return this.result.totalPages;
	}

	/**
	 * 登録済み仕様ファイル数を取得
	 */
	getSpecsCount(): number {
		return this.result.specs.length;
	}
}
