import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CrawledPage } from "../types.js";

/** チャンク設定 */
export interface ChunkerConfig {
	/** チャンクサイズ（文字数） */
	chunkSize: number;
	/** チャンク間の重複文字数 */
	overlap: number;
}

/** チャンク情報 */
export interface Chunk {
	/** チャンクID */
	id: string;
	/** チャンク内容 */
	content: string;
	/** ソースURL */
	sourceUrl: string;
	/** ソースタイトル */
	sourceTitle: string | null;
	/** チャンク内の開始位置 */
	startPosition: number;
	/** チャンク内の終了位置 */
	endPosition: number;
}

/**
 * コンテンツチャンカー
 * 長いドキュメントを指定サイズのチャンクに分割
 */
export class Chunker {
	private config: ChunkerConfig;

	constructor(
		private outputDir: string,
		config?: Partial<ChunkerConfig>,
	) {
		this.config = {
			chunkSize: config?.chunkSize ?? 4000,
			overlap: config?.overlap ?? 200,
		};
	}

	/**
	 * Markdownコンテンツをチャンクに分割
	 * @param content Markdown文字列
	 * @returns チャンク配列
	 */
	chunk(content: string): string[] {
		const chunks: string[] = [];
		const { chunkSize, overlap } = this.config;

		// 空コンテンツの場合
		if (!content || content.length === 0) {
			return chunks;
		}

		// チャンクサイズ未満の場合はそのまま
		if (content.length <= chunkSize) {
			return [content];
		}

		// 段落単位で分割
		const paragraphs = content.split(/\n{2,}/);
		let currentChunk = "";

		for (const paragraph of paragraphs) {
			// 段落を追加してもチャンクサイズを超えない場合
			if (currentChunk.length + paragraph.length + 2 <= chunkSize) {
				currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
			} else {
				// 現在のチャンクを保存
				if (currentChunk) {
					chunks.push(currentChunk);
				}

				// 新しいチャンクを開始（重複を考慮）
				if (currentChunk.length > overlap) {
					// 前のチャンクの末尾からoverlap分を取得
					const overlapText = currentChunk.slice(-overlap);
					currentChunk = overlapText + "\n\n" + paragraph;
				} else {
					currentChunk = paragraph;
				}
			}
		}

		// 最後のチャンクを追加
		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}

	/**
	 * 全ページをチャンク化して保存
	 * @param pages クロール済みページ一覧
	 * @param pageContents ページ内容のMap (file -> markdown)
	 * @returns 生成されたチャンクファイルパスの配列
	 */
	writeChunks(
		pages: CrawledPage[],
		pageContents: Map<string, string>,
	): string[] {
		const chunkFiles: string[] = [];
		let globalChunkIndex = 0;

		for (const page of pages) {
			const content = pageContents.get(page.file) || "";
			if (!content.trim()) continue;

			const chunks = this.chunk(content);

			for (let i = 0; i < chunks.length; i++) {
				globalChunkIndex++;
				const chunkNum = String(globalChunkIndex).padStart(4, "0");
				const chunkFile = `chunks/chunk-${chunkNum}.md`;
				const chunkPath = join(this.outputDir, chunkFile);

				const title = page.title || page.url;
				const header = `# Chunk ${globalChunkIndex} - ${title}`;
				const urlLine = `> Source: ${page.url}`;
				const partLine = `> Part: ${i + 1}/${chunks.length}`;

				const chunkContent = [header, "", urlLine, partLine, "", chunks[i]].join(
					"\n",
				);

				writeFileSync(chunkPath, chunkContent);
				chunkFiles.push(chunkFile);
			}
		}

		return chunkFiles;
	}

	/**
	 * チャンクインデックスを生成
	 * @param pages クロール済みページ一覧
	 * @param pageContents ページ内容のMap
	 * @returns チャンクインデックス
	 */
	generateIndex(
		pages: CrawledPage[],
		pageContents: Map<string, string>,
	): Array<{
		id: number;
		file: string;
		sourceUrl: string;
		sourceTitle: string | null;
		part: number;
		totalParts: number;
	}> {
		const index: Array<{
			id: number;
			file: string;
			sourceUrl: string;
			sourceTitle: string | null;
			part: number;
			totalParts: number;
		}> = [];
		let globalChunkIndex = 0;

		for (const page of pages) {
			const content = pageContents.get(page.file) || "";
			if (!content.trim()) continue;

			const chunks = this.chunk(content);

			for (let i = 0; i < chunks.length; i++) {
				globalChunkIndex++;
				const chunkNum = String(globalChunkIndex).padStart(4, "0");

				index.push({
					id: globalChunkIndex,
					file: `chunks/chunk-${chunkNum}.md`,
					sourceUrl: page.url,
					sourceTitle: page.title,
					part: i + 1,
					totalParts: chunks.length,
				});
			}
		}

		return index;
	}
}
