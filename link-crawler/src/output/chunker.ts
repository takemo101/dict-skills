import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Markdownチャンク分割クラス
 * full.mdをH1見出しベースでチャンク分割
 */
export class Chunker {
	constructor(private outputDir: string) {}

	/**
	 * MarkdownをH1見出しで分割
	 * @param fullMarkdown 結合されたMarkdown文字列
	 * @returns 分割されたチャンクの配列
	 */
	chunk(fullMarkdown: string): string[] {
		if (!fullMarkdown.trim()) {
			return [];
		}

		// H1見出し（# ）で分割
		// ただし、frontmatter内の#は除外
		const chunks: string[] = [];
		const lines = fullMarkdown.split("\n");
		let currentChunk: string[] = [];
		let inFrontmatter = false;
		let isFirstH1 = true;

		for (const line of lines) {
			// frontmatterの検出
			if (line.trim() === "---") {
				inFrontmatter = !inFrontmatter;
				currentChunk.push(line);
				continue;
			}

			// frontmatter内は無条件で追加
			if (inFrontmatter) {
				currentChunk.push(line);
				continue;
			}

			// H1見出しの検出（行頭が"# "）
			if (line.startsWith("# ")) {
				if (!isFirstH1 && currentChunk.length > 0) {
					// 前のチャンクを保存
					chunks.push(currentChunk.join("\n").trim());
					currentChunk = [];
				}
				isFirstH1 = false;
			}

			currentChunk.push(line);
		}

		// 最後のチャンクを追加
		if (currentChunk.length > 0) {
			chunks.push(currentChunk.join("\n").trim());
		}

		return chunks.filter((chunk) => chunk.length > 0);
	}

	/**
	 * チャンクをファイルに出力
	 * @param chunks チャンクの配列
	 * @returns 出力されたファイルパスの配列
	 */
	writeChunks(chunks: string[]): string[] {
		if (chunks.length === 0) {
			return [];
		}

		// chunksディレクトリ作成
		const chunksDir = join(this.outputDir, "chunks");
		mkdirSync(chunksDir, { recursive: true });

		const outputPaths: string[] = [];

		for (let i = 0; i < chunks.length; i++) {
			const chunkNum = String(i + 1).padStart(3, "0");
			const chunkFile = `chunk-${chunkNum}.md`;
			const chunkPath = join(chunksDir, chunkFile);

			writeFileSync(chunkPath, chunks[i]);
			outputPaths.push(chunkPath);
		}

		return outputPaths;
	}

	/**
	 * full.mdを読み込んでチャンク分割し、ファイルに出力
	 * @param fullMarkdown 結合されたMarkdown文字列
	 * @returns 出力されたファイルパスの配列
	 */
	chunkAndWrite(fullMarkdown: string): string[] {
		const chunks = this.chunk(fullMarkdown);
		return this.writeChunks(chunks);
	}
}
