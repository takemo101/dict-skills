/**
 * チャンク（分割されたコンテンツ）の型定義
 */
export interface Chunk {
	/** チャンクのタイトル（h1のテキスト） */
	title: string;
	/** チャンクの内容（h1を除いた本文） */
	content: string;
}

/**
 * Chunkerクラス
 * Markdownコンテンツをh1境界で分割する
 */
export class Chunker {
	/**
	 * Markdownをh1境界で分割してチャンク配列を生成
	 * @param markdown 分割対象のMarkdown文字列
	 * @returns チャンク配列
	 */
	chunk(markdown: string): Chunk[] {
		// 空の場合は空配列を返す
		if (!markdown.trim()) {
			return [];
		}

		// h1パターンで分割（行頭の# ）
		const lines = markdown.split("\n");
		const chunks: Chunk[] = [];
		let currentTitle = "";
		let currentContent: string[] = [];

		for (const line of lines) {
			// h1行を検出（行頭が# で、次がスペース）
			if (line.startsWith("# ")) {
				// 既存のチャンクがあれば保存
				if (currentContent.length > 0 || currentTitle) {
					chunks.push({
						title: currentTitle || "Untitled",
						content: currentContent.join("\n").trim(),
					});
				}
				// 新しいチャンクを開始
				currentTitle = line.slice(2).trim(); // "# " を除去
				currentContent = [];
			} else {
				currentContent.push(line);
			}
		}

		// 最後のチャンクを追加
		if (currentContent.length > 0 || currentTitle) {
			chunks.push({
				title: currentTitle || "Untitled",
				content: currentContent.join("\n").trim(),
			});
		}

		return chunks;
	}

	/**
	 * h1がない場合は全体を1つのチャンクとして返す
	 * @param markdown Markdown文字列
	 * @returns チャンク配列（h1がない場合は単一要素）
	 */
	chunkOrDefault(markdown: string): Chunk[] {
		const chunks = this.chunk(markdown);
		// h1がない場合（chunksが空または先頭にUntitledがある場合）、全体を1つにまとめる
		if (chunks.length === 0) {
			return [
				{
					title: "Untitled",
					content: markdown.trim(),
				},
			];
		}
		return chunks;
	}
}
