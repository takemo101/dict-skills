import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { computeHash } from "../diff/hasher.js";
import type { CrawlConfig, CrawledPage, PageMetadata } from "../types.js";
import { IndexManager } from "./index-manager.js";
import { SPEC_PATTERNS, FILENAME } from "../constants.js";

/** ファイル書き込みクラス */
export class OutputWriter {
	private indexManager: IndexManager;

	constructor(private config: CrawlConfig) {
		this.indexManager = new IndexManager(
			config.outputDir,
			config.startUrl,
			{
				maxDepth: config.maxDepth,
				sameDomain: config.sameDomain,
			},
		);

		// ディレクトリ作成
		mkdirSync(join(config.outputDir, FILENAME.PAGES_DIR), { recursive: true });
		mkdirSync(join(config.outputDir, FILENAME.SPECS_DIR), { recursive: true });
	}

	/** 既存ページのハッシュを取得 */
	getExistingHash(url: string): string | undefined {
		return this.indexManager.getExistingHash(url);
	}

	/** API仕様ファイルを検出・保存 */
	handleSpec(url: string, content: string): { type: string; filename: string } | null {
		for (const [type, pattern] of Object.entries(SPEC_PATTERNS)) {
			if (pattern.test(url)) {
				const filename = url.split("/").pop() || "spec";
				const specPath = join(this.config.outputDir, FILENAME.SPECS_DIR, filename);
				mkdirSync(dirname(specPath), { recursive: true });
				writeFileSync(specPath, content);

				const file = `${FILENAME.SPECS_DIR}/${filename}`;
				this.indexManager.addSpec(url, type, file);
				return { type, filename };
			}
		}
		return null;
	}

	/** 次のページ番号を取得 */
	getNextPageNumber(): number {
		return this.indexManager.getNextPageNumber();
	}

	/** ページを登録（インデックスに追加） */
	registerPage(
		url: string,
		file: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
		hash: string,
	): CrawledPage {
		return this.indexManager.registerPage(url, file, depth, links, metadata, title, hash);
	}

	/** ページを保存 */
	savePage(
		url: string,
		markdown: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
		hash?: string,
	): string {
		const pageNum = String(this.getNextPageNumber()).padStart(FILENAME.PAGE_PAD_LENGTH, "0");
		const pageFile = `${FILENAME.PAGES_DIR}/${FILENAME.PAGE_PREFIX}${pageNum}.md`;
		const pagePath = join(this.config.outputDir, pageFile);
		const computedHash = hash ?? computeHash(markdown);

		const frontmatter = this.buildFrontmatter(url, metadata, title, depth);
		writeFileSync(pagePath, frontmatter + markdown);

		this.registerPage(url, pageFile, depth, links, metadata, title, computedHash);

		return pageFile;
	}

	/** frontmatterを構築 */
	private buildFrontmatter(
		url: string,
		metadata: PageMetadata,
		title: string | null,
		depth: number,
	): string {
		const pageCrawledAt = new Date().toISOString();
		const lines: (string | null)[] = [
			"---",
			`url: ${url}`,
			`title: "${(metadata.title || title || "").replace(/"/g, '\\"')}"`,
			metadata.description ? `description: "${metadata.description.replace(/"/g, '\\"')}"` : null,
			metadata.keywords ? `keywords: "${metadata.keywords}"` : null,
			`crawledAt: ${pageCrawledAt}`,
			`depth: ${depth}`,
			"---",
			"",
		];
		return lines.filter(Boolean).join("\n");
	}

	/** インデックスを保存 */
	saveIndex(): string {
		return this.indexManager.saveIndex();
	}

	/** 結果を取得 */
	getResult() {
		return this.indexManager.getResult();
	}

	/** 既存のインデックスマネージャーを取得 */
	getIndexManager(): IndexManager {
		return this.indexManager;
	}
}
