/** robots.txt のルール */
export interface RobotsRule {
	userAgent: string;
	disallow: string[];
	allow: string[];
}

/** robots.txt のパーサーとチェッカー */
export class RobotsChecker {
	private rules: RobotsRule[] = [];
	private userAgent: string;

	constructor(robotsTxt: string, userAgent = "*") {
		this.userAgent = userAgent;
		this.parse(robotsTxt);
	}

	/** robots.txt をパース */
	private parse(robotsTxt: string): void {
		const lines = robotsTxt.split(/\r?\n/);
		let currentAgent: string | null = null;
		const ruleMap = new Map<string, RobotsRule>();

		for (const line of lines) {
			const trimmed = line.trim();

			// コメントと空行をスキップ
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}

			// "Key: Value" 形式のパース
			const colonIndex = trimmed.indexOf(":");
			if (colonIndex === -1) {
				continue;
			}

			const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
			const value = trimmed.substring(colonIndex + 1).trim();

			if (key === "user-agent") {
				currentAgent = value.toLowerCase();
				if (!ruleMap.has(currentAgent)) {
					ruleMap.set(currentAgent, {
						userAgent: currentAgent,
						disallow: [],
						allow: [],
					});
				}
			} else if (currentAgent && (key === "disallow" || key === "allow")) {
				const rule = ruleMap.get(currentAgent);
				if (rule) {
					if (key === "disallow") {
						rule.disallow.push(value);
					} else {
						rule.allow.push(value);
					}
				}
			}
		}

		this.rules = Array.from(ruleMap.values());
	}

	/** URL がクロール許可されているか判定 */
	isAllowed(url: string): boolean {
		const path = this.getPath(url);

		// 該当する User-Agent ルールを取得（優先順位: 指定 > *）
		const rule =
			this.rules.find((r) => r.userAgent === this.userAgent.toLowerCase()) ||
			this.rules.find((r) => r.userAgent === "*");

		if (!rule) {
			// ルールがない場合は全許可
			return true;
		}

		// Allow ルールを先にチェック（優先度高）
		for (const allowPath of rule.allow) {
			if (this.matchPath(path, allowPath)) {
				return true;
			}
		}

		// Disallow ルールをチェック
		for (const disallowPath of rule.disallow) {
			if (this.matchPath(path, disallowPath)) {
				return false;
			}
		}

		// どのルールにもマッチしない場合は許可
		return true;
	}

	/** URL からパスを抽出 */
	private getPath(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.pathname + parsed.search;
		} catch {
			// URL パース失敗時はそのまま返す
			return url;
		}
	}

	/** パスがルールにマッチするか（前方一致） */
	private matchPath(path: string, rulePath: string): boolean {
		// 空の Disallow は「全許可」を意味する
		if (!rulePath) {
			return false;
		}

		// 前方一致
		return path.startsWith(rulePath);
	}
}
