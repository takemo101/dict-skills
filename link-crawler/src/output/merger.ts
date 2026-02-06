import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CrawledPage } from "../types.js";

/**
 * ページ結合クラス
 * 全ページを結合してfull.mdを生成
 */
export class Merger {
	constructor(private outputDir: string) {}

	/**
	 * ページを結合してMarkdownを生成
	 * @param pages クロール済みページ一覧
	 * @returns 結合されたMarkdown文字列
	 */
	merge(pages: CrawledPage[]): string {
		if (pages.length === 0) {
			return "";
		}

		const sections = pages.map((page) => {
			const title = page.title || page.url;
			const header = `# ${title}`;
			const urlLine = `> Source: ${page.url}`;
			// コンテンツは実際のファイルから読み込むのではなく、
			// ここではヘッダー情報のみを生成
			// 実際のコンテンツはwriteFullで読み込む
			return { header, urlLine, page };
		});

		return sections.map((s) => `${s.header}\n\n${s.urlLine}\n`).join("\n---\n\n");
	}

	/**
	 * Markdownから先頭のH1タイトルを除去
	 * frontmatterがある場合は考慮する
	 * @param markdown Markdown文字列
	 * @returns タイトル除去後のMarkdown
	 */
	stripTitle(markdown: string): string {
		// frontmatterをスキップ
		let content = markdown;
		if (content.startsWith("---")) {
			const endIndex = content.indexOf("---", 3);
			if (endIndex !== -1) {
				content = content.slice(endIndex + 3).trimStart();
			}
		}

		// 先頭のH1を除去
		const lines = content.split("\n");
		if (lines.length > 0 && lines[0].startsWith("# ")) {
			lines.shift();
			// タイトル後の空行も除去
			while (lines.length > 0 && lines[0].trim() === "") {
				lines.shift();
			}
		}

		return lines.join("\n");
	}

	/**
	 * Markdownを結合してfull.md内容を生成（ファイル書き込みなし）
	 * @param pages クロール済みページ一覧
	 * @param pageContents ページ内容のMap (file -> markdown)
	 * @returns 結合されたMarkdown文字列
	 */
	buildFullContent(pages: CrawledPage[], pageContents: Map<string, string>): string {
		const sections: string[] = [];

		for (const page of pages) {
			const title = page.title || page.url;
			const header = `# ${title}`;
			const urlLine = `> Source: ${page.url}`;

			const rawContent = pageContents.get(page.file) || "";
			const content = this.stripTitle(rawContent);

			sections.push(`${header}\n\n${urlLine}\n\n${content}`);
		}

		return sections.join("\n\n---\n\n");
	}

	/**
	 * full.mdを出力
	 * @param pages クロール済みページ一覧
	 * @param pageContents ページ内容のMap (file -> markdown)
	 * @returns 出力ファイルパス
	 */
	writeFull(pages: CrawledPage[], pageContents: Map<string, string>): string {
		const fullContent = this.buildFullContent(pages, pageContents);
		const outputPath = join(this.outputDir, "full.md");
		writeFileSync(outputPath, fullContent);

		return outputPath;
	}
}
