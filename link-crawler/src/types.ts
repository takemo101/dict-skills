/** クロール設定 */
export interface CrawlConfig {
	startUrl: string;
	maxDepth: number;
	outputDir: string;
	sameDomain: boolean;
	includePattern: RegExp | null;
	excludePattern: RegExp | null;
	delay: number;
	timeout: number;
	spaWait: number;
	headed: boolean;
	diff: boolean;
	pages: boolean;
	merge: boolean;
	chunks: boolean;
}

/** フェッチ結果 */
export interface FetchResult {
	html: string;
	finalUrl: string;
	contentType: string;
}

/** ページメタデータ */
export interface PageMetadata {
	title: string | null;
	description: string | null;
	keywords: string | null;
	author: string | null;
	ogTitle: string | null;
	ogType: string | null;
}

/** クロール済みページ情報 */
export interface CrawledPage {
	url: string;
	title: string | null;
	file: string;
	depth: number;
	links: string[];
	metadata: PageMetadata;
	hash?: string;
}

/** 検出されたAPI仕様 */
export interface DetectedSpec {
	url: string;
	type: string;
	file: string;
}

/** クロール結果 */
export interface CrawlResult {
	crawledAt: string;
	baseUrl: string;
	config: Partial<CrawlConfig>;
	totalPages: number;
	pages: CrawledPage[];
	specs: DetectedSpec[];
}

/** Fetcher インターフェース */
export interface Fetcher {
	fetch(url: string): Promise<FetchResult | null>;
	close?(): Promise<void>;
}
