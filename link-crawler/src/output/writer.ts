import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FILENAME, SPEC_PATTERNS } from "../constants.js";
import type { CrawlLogger } from "../crawler/logger.js";
import { computeHash } from "../diff/hasher.js";
import type { CrawlConfig, CrawledPage, PageMetadata } from "../types.js";
import { IndexManager } from "./index-manager.js";

/** 文字列をslug形式に変換（小文字化、スペース→ハイフン、特殊文字除去） */
function slugify(text: string | null | undefined, maxLength = 50): string {
	if (!text || text.trim().length === 0) {
		return "";
	}

	return text
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "") // Unicode文字・数字・スペース・アンダースコア・ハイフン以外を除去
		.replace(/[\s_]+/g, "-") // スペースとアンダースコアをハイフンに
		.replace(/-+/g, "-") // 連続するハイフンを1つに
		.replace(/^-+|-+$/g, "") // 先頭・末尾のハイフンを除去
		.slice(0, maxLength) // 長さ制限
		.replace(/-+$/, ""); // 切り詰め後の末尾ハイフンを除去
}

/** ファイル書き込みクラス */
export class OutputWriter {
	private indexManager: IndexManager;

	constructor(
		private config: CrawlConfig,
		private logger?: CrawlLogger,
	) {
		this.indexManager = new IndexManager(
			config.outputDir,
			config.startUrl,
			{
				maxDepth: config.maxDepth,
				sameDomain: config.sameDomain,
				diff: config.diff,
			},
			this.logger,
		);

		// ディレクトリをクリーンアップしてから作成（diff モードでは既存ファイルを保持）
		const pagesDir = join(config.outputDir, FILENAME.PAGES_DIR);
		const specsDir = join(config.outputDir, FILENAME.SPECS_DIR);

		if (!config.diff && existsSync(pagesDir)) {
			rmSync(pagesDir, { recursive: true, force: true });
		}
		if (!config.diff && existsSync(specsDir)) {
			rmSync(specsDir, { recursive: true, force: true });
		}

		mkdirSync(pagesDir, { recursive: true });
		mkdirSync(specsDir, { recursive: true });
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

	/** ページファイル名を生成 (public: Crawler の --no-pages モードで使用) */
	buildPageFilename(metadata: PageMetadata, title: string | null): string {
		const pageNum = String(this.getNextPageNumber()).padStart(FILENAME.PAGE_PAD_LENGTH, "0");
		const pageTitle = metadata.title || title;
		const titleSlug = slugify(pageTitle);
		return titleSlug
			? `${FILENAME.PAGES_DIR}/${FILENAME.PAGE_PREFIX}${pageNum}-${titleSlug}.md`
			: `${FILENAME.PAGES_DIR}/${FILENAME.PAGE_PREFIX}${pageNum}.md`;
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
		const pageFile = this.buildPageFilename(metadata, title);
		const pagePath = join(this.config.outputDir, pageFile);
		const computedHash = hash ?? computeHash(markdown);

		const frontmatter = this.buildFrontmatter(url, metadata, title, depth, computedHash);
		writeFileSync(pagePath, frontmatter + markdown);

		this.registerPage(url, pageFile, depth, links, metadata, title, computedHash);

		return pageFile;
	}

	/** YAML文字列をエスケープ（ダブルクォート内で使用） */
	private escapeYamlString(str: string): string {
		return str
			.replace(/\\/g, "\\\\") // バックスラッシュを最初にエスケープ
			.replace(/"/g, '\\"') // ダブルクォート
			.replace(/\n/g, "\\n") // 改行
			.replace(/\r/g, "\\r") // キャリッジリターン
			.replace(/\t/g, "\\t"); // タブ
	}

	/** frontmatterを構築 (public: Crawler の --no-pages モードで使用) */
	buildFrontmatter(
		url: string,
		metadata: PageMetadata,
		title: string | null,
		depth: number,
		hash?: string,
	): string {
		const pageCrawledAt = new Date().toISOString();
		const lines: (string | null)[] = [
			"---",
			`url: ${url}`,
			`title: "${this.escapeYamlString(metadata.title || title || "")}"`,
			metadata.description ? `description: "${this.escapeYamlString(metadata.description)}"` : null,
			metadata.keywords ? `keywords: "${this.escapeYamlString(metadata.keywords)}"` : null,
			hash ? `hash: "${hash}"` : null,
			`crawledAt: ${pageCrawledAt}`,
			`depth: ${depth}`,
			"---",
			"",
			"",
		];
		return lines.filter((line): line is string => line !== null).join("\n");
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

	/** 訪問済みURLを設定（差分クロール時のマージ範囲制限用） */
	setVisitedUrls(urls: Set<string>): void {
		this.indexManager.setVisitedUrls(urls);
	}
}
