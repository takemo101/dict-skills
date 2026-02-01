import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/** ページハッシュマップ型 */
export interface PageHash {
	url: string;
	hash: string;
}

/** index.json構造（ハッシュ読み込み用） */
interface IndexJson {
	pages?: Array<{
		url: string;
		hash?: string;
	}>;
}

/**
 * コンテンツのSHA256ハッシュを計算
 * @param content ハッシュ計算対象の文字列
 * @returns SHA256ハッシュ（16進数文字列）
 */
export function computeHash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * ハッシュ管理クラス
 * 既存のindex.jsonからハッシュを読み込み、差分検知を行う
 */
export class Hasher {
	private hashes = new Map<string, string>();

	/**
	 * index.jsonからハッシュを読み込む
	 * @param indexPath index.jsonのパス
	 */
	async loadHashes(indexPath: string): Promise<void> {
		try {
			const content = await readFile(indexPath, "utf8");
			const data: IndexJson = JSON.parse(content);

			if (data.pages) {
				for (const page of data.pages) {
					if (page.hash) {
						this.hashes.set(page.url, page.hash);
					}
				}
			}
		} catch {
			// ファイルが存在しない場合は空のまま
			this.hashes.clear();
		}
	}

	/**
	 * URLのコンテンツが変更されたかを判定
	 * @param url 対象URL
	 * @param newHash 新しいハッシュ値
	 * @returns 変更があればtrue、なければfalse
	 */
	isChanged(url: string, newHash: string): boolean {
		const existingHash = this.hashes.get(url);
		if (existingHash === undefined) {
			return true; // 新規ページは変更扱い
		}
		return existingHash !== newHash;
	}

	/**
	 * 既存のハッシュを取得
	 * @param url 対象URL
	 * @returns ハッシュ値、存在しなければundefined
	 */
	getHash(url: string): string | undefined {
		return this.hashes.get(url);
	}

	/**
	 * 読み込まれたハッシュの数を取得
	 */
	get size(): number {
		return this.hashes.size;
	}
}
