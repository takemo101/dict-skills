import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/** 言語を検出するためのクラス名パターン（優先順位順） */
const LANGUAGE_CLASS_PATTERNS = [
	/language-(\w+)/, // language-python, language-javascript, etc.
	/lang-(\w+)/, // lang-python, etc.
];

/** 要素から言語を検出 */
function detectLanguage(el: Element): string | null {
	// data-language 属性をチェック（最優先）
	const dataLanguage = el.getAttribute("data-language");
	if (dataLanguage) return dataLanguage;

	// 子要素の pre タグの data-language 属性をチェック
	const preEl = el.querySelector("pre[data-language]");
	if (preEl) {
		const preLang = preEl.getAttribute("data-language");
		if (preLang) return preLang;
	}

	// class 属性から言語パターンを検出
	const className = el.className;
	if (className) {
		for (const pattern of LANGUAGE_CLASS_PATTERNS) {
			const match = className.match(pattern);
			if (match?.[1]) {
				return match[1];
			}
		}
	}

	// 子要素の code タグのクラスから言語を検出
	const codeEl = el.querySelector("code");
	if (codeEl) {
		const codeClass = codeEl.className;
		if (codeClass) {
			for (const pattern of LANGUAGE_CLASS_PATTERNS) {
				const match = codeClass.match(pattern);
				if (match?.[1]) {
					return match[1];
				}
			}
		}
	}

	return null;
}

/** HTML を Markdown に変換 */
export function htmlToMarkdown(html: string): string {
	const turndown = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
	});

	turndown.use(gfm);

	// 空のリンクを除去
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});

	// Syntax Highlighter系のdiv要素をコードブロックとして変換
	turndown.addRule("syntaxHighlighter", {
		filter: (node) => {
			// data-rehype-pretty-code-fragment や hljs, prism-code, shiki クラスを持つ要素
			return (
				node.nodeName === "DIV" &&
				(node.hasAttribute("data-rehype-pretty-code-fragment") ||
					node.classList.contains("hljs") ||
					node.classList.contains("prism-code") ||
					node.classList.contains("shiki") ||
					node.classList.contains("highlight") ||
					node.classList.contains("code-block"))
			);
		},
		replacement: (_content, node) => {
			const language = detectLanguage(node as Element);
			const codeContent = extractCodeContent(node as Element);
			const lang = language || "";
			return `\n\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
		},
	});

	// figure[data-rehype-pretty-code-figure] 対応
	turndown.addRule("prettyCodeFigure", {
		filter: (node) => {
			return node.nodeName === "FIGURE" && node.hasAttribute("data-rehype-pretty-code-figure");
		},
		replacement: (_content, node) => {
			const language = detectLanguage(node as Element);
			// pre > code 内のテキストを取得
			const pre = (node as Element).querySelector("pre");
			const codeContent = pre?.textContent || "";
			const lang = language || "";
			return `\n\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
		},
	});

	return turndown
		.turndown(html)
		.replace(/\[\\\[\s*\\\]\]\([^)]*\)/g, "") // 壊れたリンク除去
		.replace(/ +/g, " ") // 複数スペースを1つに
		.replace(/\s+,/g, ",") // カンマ前のスペース除去
		.replace(/\s+\./g, ".") // ピリオド前のスペース除去
		.replace(/\n{3,}/g, "\n\n") // 3つ以上の改行を2つに
		.trim();
}

/** コード要素から実際のコード内容を抽出 */
function extractCodeContent(el: Element): string {
	// pre > code 構造を優先
	const pre = el.querySelector("pre");
	if (pre) {
		return pre.textContent?.trim() || "";
	}

	// code タグを検索
	const code = el.querySelector("code");
	if (code) {
		return code.textContent?.trim() || "";
	}

	// 直接のテキストコンテンツ
	return el.textContent?.trim() || "";
}
