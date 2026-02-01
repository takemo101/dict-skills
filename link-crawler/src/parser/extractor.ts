import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { PageMetadata } from "../types.js";

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

/** HTMLから本文コンテンツを抽出 */
export function extractContent(
	html: string,
	url: string,
): { title: string | null; content: string | null } {
	const dom = new JSDOM(html, { url });
	const reader = new Readability(dom.window.document.cloneNode(true) as Document);
	const article = reader.parse();

	if (article?.content) {
		return { title: article.title, content: article.content };
	}

	// フォールバック: main タグなどから抽出
	const fallbackDom = new JSDOM(html, { url });
	const body = fallbackDom.window.document;

	// 不要な要素を削除
	for (const el of body.querySelectorAll("script, style, noscript, nav, header, footer, aside")) {
		el.remove();
	}

	const main = body.querySelector("main, article, [role='main'], .content, #content") || body.body;

	return {
		title: null,
		content: main?.innerHTML || null,
	};
}
