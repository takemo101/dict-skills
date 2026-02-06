import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { PageMetadata } from "../types.js";

/** コードブロックを検出するためのセレクタ一覧 */
const CODE_BLOCK_SELECTORS = [
	"pre",
	"code",
	"[data-language]",
	"[data-rehype-pretty-code-fragment]",
	".code-block",
	".highlight",
	".hljs",
	".prism-code",
	".shiki",
];

/** 一意なマーカーIDを生成 */
function generateMarkerId(index: number): string {
	return `CODEBLOCK_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** コードブロックを保護（マーカーに置き換え） */
function protectCodeBlocks(doc: Document): Map<string, string> {
	const codeBlockMap = new Map<string, string>();
	let index = 0;
	const processedElements = new Set<Element>();

	// セレクタで検出した要素を処理（親から子の順）
	// より具体的なセレクタを先に処理
	const prioritySelectors = [
		"[data-rehype-pretty-code-fragment]",
		"[data-rehype-pretty-code-figure]",
		".code-block",
		".hljs",
		".prism-code",
		".shiki",
		".highlight",
		"[data-language]",
		"pre",
		"code",
	];

	for (const selector of prioritySelectors) {
		const elements = Array.from(doc.querySelectorAll(selector));
		for (const el of elements) {
			// 既に処理済みの要素をスキップ
			if (processedElements.has(el)) {
				continue;
			}
			// 処理済み要素の子要素でもスキップ
			let parent = el.parentElement;
			let shouldSkip = false;
			while (parent) {
				if (processedElements.has(parent)) {
					shouldSkip = true;
					break;
				}
				parent = parent.parentElement;
			}
			if (shouldSkip) {
				continue;
			}

			const markerId = generateMarkerId(index);
			const marker = `__CODEBLOCK_${markerId}__`;
			codeBlockMap.set(marker, el.outerHTML);

			// プレースホルダー要素を作成
			const placeholder = doc.createElement("span");
			placeholder.setAttribute("data-codeblock-id", markerId);
			placeholder.setAttribute("data-codeblock-placeholder", "true");
			placeholder.textContent = marker;
			el.replaceWith(placeholder);

			processedElements.add(placeholder);
			index++;
		}
	}

	return codeBlockMap;
}

/** マーカーをコードブロックに復元 */
function restoreCodeBlocks(html: string, codeBlockMap: Map<string, string>): string {
	let restored = html;
	for (const [marker, codeBlock] of codeBlockMap) {
		// プレースホルダー要素パターンを検索して置換
		const placeholderPattern = new RegExp(
			`<span[^>]*data-codeblock-placeholder="true"[^>]*>\\s*${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</span>`,
			"gi",
		);
		restored = restored.replace(placeholderPattern, codeBlock);

		// マーカー文字列だけが残っている場合も置換
		restored = restored.replace(
			new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
			codeBlock,
		);
	}
	return restored;
}

/** フォールバック抽出時にコードブロックを保護 */
function extractAndPreserveCodeBlocks(
	doc: Document,
): { title: string | null; content: string | null } {
	const body = doc.body;

	// コードブロックを収集（削除前に保存）
	const codeBlocks: string[] = [];
	for (const selector of CODE_BLOCK_SELECTORS) {
		const elements = Array.from(body.querySelectorAll(selector));
		for (const el of elements) {
			codeBlocks.push(el.outerHTML);
		}
	}

	// 不要な要素を削除
	for (const el of body.querySelectorAll("script, style, noscript, nav, header, footer, aside")) {
		el.remove();
	}

	const main =
		doc.querySelector("main, article, [role='main'], .content, #content") || body;
	let content = main?.innerHTML || null;

	// コンテンツにコードブロックが含まれていない場合、収集したものを追加
	if (content && codeBlocks.length > 0) {
		const hasCodeBlock = CODE_BLOCK_SELECTORS.some((selector) =>
			content?.toLowerCase().includes(selector),
		);
		if (!hasCodeBlock) {
			content = `${codeBlocks.join("\n")}\n${content}`;
		}
	}

	return {
		title: null,
		content,
	};
}

/** HTMLからメタデータを抽出 */
export function extractMetadata(dom: JSDOM): PageMetadata {
	const doc = dom.window.document;

	const getMeta = (name: string): string | null => {
		const el = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
		return el?.getAttribute("content") || null;
	};

	return {
		title: doc.querySelector("title")?.textContent?.trim() || null,
		description: getMeta("description") || getMeta("og:description"),
		keywords: getMeta("keywords"),
		author: getMeta("author"),
		ogTitle: getMeta("og:title"),
		ogType: getMeta("og:type"),
	};
}

/** HTMLから本文コンテンツを抽出（JSDOMインスタンスを使用） */
export function extractContent(dom: JSDOM): { title: string | null; content: string | null } {
	const actualUrl = dom.window.location.href;

	// コードブロックを保護してからReadabilityを実行
	const codeBlockMap = protectCodeBlocks(dom.window.document);

	const reader = new Readability(dom.window.document.cloneNode(true) as Document);
	const article = reader.parse();

	if (article?.content) {
		// コードブロックを復元
		const restoredContent = restoreCodeBlocks(article.content, codeBlockMap);
		return { title: article.title ?? null, content: restoredContent };
	}

	// フォールバック: main タグなどから抽出（コードブロックも保持）
	return extractAndPreserveCodeBlocks(dom.window.document);
}
