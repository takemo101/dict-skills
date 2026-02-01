import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

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

	return turndown
		.turndown(html)
		.replace(/\[\\\[\s*\\\]\]\([^)]*\)/g, "") // 壊れたリンク除去
		.replace(/ +/g, " ") // 複数スペースを1つに
		.replace(/\s+,/g, ",") // カンマ前のスペース除去
		.replace(/\s+\./g, ".") // ピリオド前のスペース除去
		.replace(/\n{3,}/g, "\n\n") // 3つ以上の改行を2つに
		.trim();
}
