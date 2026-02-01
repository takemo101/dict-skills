import { createHash } from "node:crypto";

/**
 * コンテンツのSHA256ハッシュを計算
 */
export function computeHash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * 差分検知用Hasher
 */
export class Hasher {
	private existingHashes: Map<string, string>;

	constructor(existingHashes?: Map<string, string>) {
		this.existingHashes = existingHashes ?? new Map();
	}

	/**
	 * index.jsonからHasherを生成
	 */
	static fromIndexJson(indexData: { pages?: Array<{ url: string; hash: string }> } | null): Hasher {
		const hashes = new Map<string, string>();
		if (indexData?.pages) {
			for (const page of indexData.pages) {
				if (page.url && page.hash) {
					hashes.set(page.url, page.hash);
				}
			}
		}
		return new Hasher(hashes);
	}

	/**
	 * URLのコンテンツが変更されたかを判定
	 * @returns true: 新規または変更あり, false: 変更なし
	 */
	isChanged(url: string, content: string): boolean {
		const newHash = computeHash(content);
		const existingHash = this.existingHashes.get(url);

		// 新規URL
		if (existingHash === undefined) {
			return true;
		}

		// ハッシュ比較
		return existingHash !== newHash;
	}

	/**
	 * 登録されているURLのハッシュを取得
	 */
	getHash(url: string): string | undefined {
		return this.existingHashes.get(url);
	}

	/**
	 * 登録されているURL数を取得
	 */
	get size(): number {
		return this.existingHashes.size;
	}
}
