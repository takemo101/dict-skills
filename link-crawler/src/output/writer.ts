import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
	CrawlConfig,
	CrawledPage,
	CrawlResult,
	DetectedSpec,
	PageMetadata,
} from "../types.js";

/** API仕様ファイルのパターン */
const specPatterns: Record<string, RegExp> = {
	openapi: /\/(openapi|swagger)\.(ya?ml|json)$/i,
	jsonSchema: /\.schema\.json$|\/schema\.json$/i,
	graphql: /\/schema\.graphql$/i,
};

/** コンテンツハッシュを生成（SHA-256の先頭16文字） */
function generateHash(content: string): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** ファイル書き込みクラス */
export class OutputWriter {
	private pageCount = 0;
	private result: CrawlResult;

	constructor(private config: CrawlConfig) {
		this.result = {
			crawledAt: new Date().toISOString(),
			baseUrl: config.startUrl,
			config: {
				maxDepth: config.maxDepth,
				diff: config.diff,
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

	/** ページを保存 */
	savePage(
		url: string,
		markdown: string,
		depth: number,
		links: string[],
		metadata: PageMetadata,
		title: string | null,
	): string {
		this.pageCount++;
		const pageNum = String(this.pageCount).padStart(3, "0");
		const pageFile = `pages/page-${pageNum}.md`;
		const pagePath = join(this.config.outputDir, pageFile);

		const frontmatter = [
			"---",
			`url: ${url}`,
			`title: "${(metadata.title || title || "").replace(/"/g, '\\"')}"`,
			metadata.description ? `description: "${metadata.description.replace(/"/g, '\\"')}"` : null,
			metadata.keywords ? `keywords: "${metadata.keywords}"` : null,
			`crawledAt: ${new Date().toISOString()}`,
			`depth: ${depth}`,
			"---",
			"",
		]
			.filter(Boolean)
			.join("\n");

		const fullContent = frontmatter + markdown;
		writeFileSync(pagePath, fullContent);

		// コンテンツハッシュを生成
		const hash = generateHash(markdown);

		const page: CrawledPage = {
			url,
			title: metadata.title || title,
			file: pageFile,
			depth,
			links,
			metadata,
			hash,
		};
		this.result.pages.push(page);
		this.result.totalPages++;

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
