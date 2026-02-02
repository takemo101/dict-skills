import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
	CrawlConfig,
	CrawledPage,
	CrawlResult,
	DetectedSpec,
	PageMetadata,
} from "../types.js";

/** 文字列をslug形式に変換（小文字化、スペース→ハイフン、特殊文字除去） */
function slugify(text: string | null | undefined, maxLength = 50): string {
	if (!text || text.trim().length === 0) {
		return "";
	}

	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // 英数字・スペース・ハイフン以外を除去
		.replace(/[\s_]+/g, "-") // スペースとアンダースコアをハイフンに
		.replace(/-+/g, "-") // 連続するハイフンを1つに
		.replace(/^-+|-+$/g, "") // 先頭・末尾のハイフンを除去
		.slice(0, maxLength) // 長さ制限
		.replace(/-+$/, ""); // 切り詰め後の末尾ハイフンを除去
}

/** API仕様ファイルのパターン */
const specPatterns: Record<string, RegExp> = {
	openapi: /\/(openapi|swagger)\.(ya?ml|json)$/i,
	jsonSchema: /\.schema\.json$|\/schema\.json$/i,
	graphql: /\/schema\.graphql$/i,
};

/** ファイル書き込みクラス */
export class OutputWriter {
	private pageCount = 0;
	private result: CrawlResult;
	/** 既存のページ情報（URL→CrawledPage） */
	private existingPages: Map<string, CrawledPage> = new Map();

	constructor(private config: CrawlConfig) {
		// 既存のindex.jsonを読み込み
		const indexPath = join(config.outputDir, "index.json");
		if (existsSync(indexPath)) {
			try {
				const existingResult = JSON.parse(readFileSync(indexPath, "utf-8")) as CrawlResult;
				for (const page of existingResult.pages) {
					this.existingPages.set(page.url, page);
				}
				console.log(`  📂 既存index.json読み込み: ${existingResult.pages.length}ページ`);
			} catch {
				console.log("  ⚠️ 既存index.jsonの読み込みに失敗（新規作成）");
			}
		}

		this.result = {
			crawledAt: new Date().toISOString(),
			baseUrl: config.startUrl,
			config: {
				maxDepth: config.maxDepth,
				sameDomain: config.sameDomain,
			},
			totalPages: 0,
			pages: [],
			specs: [],
		};

		// ディレクトリ作成
		mkdirSync(join(config.outputDir, "pages"), { recursive: true });
		mkdirSync(join(config.outputDir, "specs"), { recursive: true });
	}

	/** コンテンツのハッシュを計算 */
	computeHash(content: string): string {
		return createHash("sha256").update(content, "utf-8").digest("hex");
	}

	/** 既存ページのハッシュを取得 */
	getExistingHash(url: string): string | undefined {
		return this.existingPages.get(url)?.hash;
	}

	/** API仕様ファイルを検出・保存 */
	handleSpec(url: string, content: string): boolean {
		for (const [type, pattern] of Object.entries(specPatterns)) {
			if (pattern.test(url)) {
				const filename = url.split("/").pop() || "spec";
				const specPath = join(this.config.outputDir, "specs", filename);
				mkdirSync(dirname(specPath), { recursive: true });
				writeFileSync(specPath, content);

				const spec: DetectedSpec = {
					url,
					type,
					file: `specs/${filename}`,
				};
				this.result.specs.push(spec);
				console.log(`  📋 Spec: ${type} - ${filename}`);
				return true;
			}
		}
		return false;
	}

	/** 次のページ番号を取得 */
	getNextPageNumber(): number {
		return this.pageCount + 1;
	}

	/** ページを登録（インデックスに追加） */
	registerPage(
		url: string,
		file: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
		hash?: string,
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
			hash: hash ?? this.computeHash(""),
			crawledAt: pageCrawledAt,
		};
		this.result.pages.push(page);
		this.result.totalPages++;
		return page;
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
		const pageNum = String(this.getNextPageNumber()).padStart(3, "0");
		const pageTitle = metadata.title || title;
		const titleSlug = slugify(pageTitle);
		const pageFile = titleSlug
			? `pages/page-${pageNum}-${titleSlug}.md`
			: `pages/page-${pageNum}.md`;
		const pagePath = join(this.config.outputDir, pageFile);
		const pageCrawledAt = new Date().toISOString();
		const computedHash = hash ?? this.computeHash(markdown);

		const frontmatter = [
			"---",
			`url: ${url}`,
			`title: "${(metadata.title || title || "").replace(/"/g, '\\"')}"`,
			metadata.description ? `description: "${metadata.description.replace(/"/g, '\\"')}"` : null,
			metadata.keywords ? `keywords: "${metadata.keywords}"` : null,
			`crawledAt: ${pageCrawledAt}`,
			`depth: ${depth}`,
			"---",
			"",
			"",
		]
			.filter(Boolean)
			.join("\n");

		writeFileSync(pagePath, frontmatter + markdown);

		this.registerPage(url, pageFile, depth, links, metadata, title, computedHash);

		return pageFile;
	}

	/** インデックスを保存 */
	saveIndex(): string {
		const indexPath = join(this.config.outputDir, "index.json");
		writeFileSync(indexPath, JSON.stringify(this.result, null, 2));
		return indexPath;
	}

	/** 結果を取得 */
	getResult(): CrawlResult {
		return this.result;
	}
}
