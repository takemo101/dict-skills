# Link Crawler 設計書

## 1. 概要

### 1.1 目的

技術ドキュメントサイトをクロールし、**AIコンテキスト用のMarkdown**として保存するCLIツール。

### 1.2 ユースケース

| ユースケース | 説明 |
|-------------|------|
| 知識ベース構築 | 最新ドキュメントをローカルに保存し、LLMに読み込ませる |
| 設計参考資料 | フレームワークのベストプラクティスを取得し、設計相談に利用 |
| 定期更新 | 差分クロールで最新状態を維持 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| AIファースト | 出力形式はLLMへの入力を最優先に設計 |
| シンプル | playwright-cli統一、不要な分岐を排除 |
| 効率性 | 差分クロールで無駄なリクエストを削減 |
| 再現性 | ハッシュで変更追跡、同一入力で同一出力 |

---

## 2. 技術スタック

| カテゴリ | 技術 | バージョン | 選定理由 |
|----------|------|-----------|----------|
| Runtime | Bun | 1.3.x | 高速起動、TypeScriptネイティブ |
| Language | TypeScript | 5.8.x | 型安全性 |
| Linter/Formatter | Biome | 2.x | 高速、設定シンプル |
| Test Framework | Vitest | 3.x | 高速、ESM対応、Bun互換 |
| CLI Parser | Commander | 13.x | 軽量、標準的 |
| Browser | playwright-cli | latest | SPA完全対応、セッション管理 |
| DOM Parser | JSDOM | 26.x | Node.js標準的なDOM実装 |
| Content Extractor | @mozilla/readability | 0.5.x | Firefox由来、高品質 |
| Markdown Converter | Turndown | 7.x | GFM対応、カスタマイズ可能 |

---

## 3. アーキテクチャ

### 3.1 全体構成

```
┌────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  crawl.ts: エントリーポイント、引数解析、ワークフロー制御    │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                            Core Layer                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Crawler   │  │   Parser   │  │   Differ   │  │   Output   │   │
│  │  Engine    │  │            │  │            │  │   Writer   │   │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘   │
│        │               │               │               │          │
│        ▼               ▼               ▼               ▼          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ Fetcher  │   │Extractor │   │  Hasher  │   │ Merger/     │    │
│  │          │   │Converter │   │          │   │ Chunker     │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘    │
├────────────────────────────────────────────────────────────────────┤
│                          External Layer                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ playwright-cli │  │     JSDOM      │  │  File System   │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 モジュール構成

```
link-crawler/
├── SKILL.md                    # piスキル定義
├── src/
│   ├── crawl.ts                # エントリーポイント
│   ├── config.ts               # 設定パース
│   ├── types.ts                # 型定義
│   │
│   ├── crawler/
│   │   ├── index.ts            # CrawlerEngine
│   │   └── fetcher.ts          # PlaywrightFetcher
│   │
│   ├── parser/
│   │   ├── extractor.ts        # HTML → 本文抽出
│   │   ├── converter.ts        # HTML → Markdown
│   │   └── links.ts            # リンク抽出・正規化
│   │
│   ├── diff/
│   │   └── hasher.ts           # SHA256ハッシュ・差分検知
│   │
│   └── output/
│       ├── writer.ts           # ページ書き込み
│       ├── merger.ts           # full.md 生成
│       ├── chunker.ts          # chunks/*.md 生成
│       └── index-writer.ts     # index.json 生成
│
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

### 3.3 モジュール責務

| モジュール | 責務 | 入力 | 出力 |
|-----------|------|------|------|
| `CrawlerEngine` | クロール制御、再帰管理 | URL, Config | CrawledPages |
| `PlaywrightFetcher` | ページ取得 | URL | HTML |
| `Extractor` | 本文抽出 | HTML | ContentHTML |
| `Converter` | Markdown変換 | ContentHTML | Markdown |
| `LinksParser` | リンク抽出 | HTML | URLs |
| `Hasher` | ハッシュ計算・比較 | Content | Hash, Changed |
| `PageWriter` | ページ保存 | Page | File |
| `Merger` | 全ページ結合 | Pages | full.md |
| `Chunker` | チャンク分割 | full.md | chunks/*.md |
| `IndexWriter` | メタデータ保存 | CrawlResult | index.json |

---

## 4. データフロー

### 4.1 メインフロー

```
[Start]
   │
   ▼
┌─────────────────────┐
│ 1. 設定パース       │ CLI引数 → CrawlConfig
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 既存index.json   │ --diff時のみ
│    読み込み         │ 
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 3. クロールループ                        │
│  ┌─────────────────────────────────────┐│
│  │ 3.1 playwright-cli でHTML取得       ││
│  │ 3.2 ハッシュ計算                    ││
│  │ 3.3 差分チェック (--diff時)         ││
│  │     └─ 変更なし → スキップ          ││
│  │ 3.4 本文抽出 (Readability)          ││
│  │ 3.5 Markdown変換 (Turndown)         ││
│  │ 3.6 ページ保存                      ││
│  │ 3.7 リンク抽出 → キューに追加       ││
│  └─────────────────────────────────────┘│
│  depth < maxDepth まで再帰              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 後処理           │
│  4.1 full.md 生成   │
│  4.2 chunks/ 生成   │
│  4.3 index.json更新 │
└──────────┬──────────┘
           │
           ▼
        [End]
```

### 4.2 差分クロールフロー

```
[ページ取得完了]
       │
       ▼
┌──────────────────┐
│ コンテンツから   │
│ SHA256ハッシュ   │
│ 計算             │
└────────┬─────────┘
         │
         ▼
    ┌────────────┐     Yes    ┌─────────────┐
    │ index.json │───────────▶│ ハッシュ比較 │
    │ に既存あり？│            └──────┬──────┘
    └────────────┘                   │
         │ No                        │
         ▼                     ┌─────┴─────┐
    ┌──────────┐               │           │
    │ 新規追加 │           一致│       不一致
    └──────────┘               ▼           ▼
                          ┌────────┐  ┌────────┐
                          │ スキップ│  │  更新  │
                          └────────┘  └────────┘
```

---

## 5. データ構造

### 5.1 型定義

```typescript
/** クロール設定 */
interface CrawlConfig {
  startUrl: string;
  maxDepth: number;
  outputDir: string;
  sameDomain: boolean;
  includePattern: RegExp | null;
  excludePattern: RegExp | null;
  delay: number;
  timeout: number;
  wait: number;
  headed: boolean;
  diff: boolean;
  outputPages: boolean;
  outputMerge: boolean;
  outputChunks: boolean;
}

/** クロール済みページ */
interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  hash: string;
  depth: number;
  links: string[];
}

/** 保存済みページ情報 (index.json用) */
interface PageIndex {
  url: string;
  title: string;
  file: string;
  hash: string;
  depth: number;
  crawledAt: string;
}

/** クロール結果 */
interface CrawlResult {
  crawledAt: string;
  baseUrl: string;
  config: Partial<CrawlConfig>;
  totalPages: number;
  pages: PageIndex[];
  specs: SpecIndex[];
}
```

### 5.2 出力構造

```
crawled/
├── index.json       # メタデータ・ハッシュ
├── full.md          # 結合ファイル（AIコンテキスト用）
├── chunks/          # 見出しベース分割
│   ├── chunk-001.md
│   └── ...
├── pages/           # ページ単位
│   ├── page-001.md
│   └── ...
└── specs/           # API仕様
    └── ...
```

### 5.3 full.md 形式

ページを `# タイトル` で区切り、1ファイルに結合:

```markdown
# Getting Started

導入部分の内容...

# Installation

インストール手順...

# Configuration

設定方法...
```

### 5.4 チャンク分割ロジック

見出し（`#`, `##`, `###`）を境界として分割:

```
入力 (full.md):
  # A
  ## A-1
  ## A-2
  # B
  ## B-1

出力:
  chunk-001.md: # A, ## A-1, ## A-2
  chunk-002.md: # B, ## B-1
```

分割境界: `#`（h1）を新チャンクの開始とする。

### 5.5 index.json スキーマ

```json
{
  "crawledAt": "2026-02-01T14:00:00.000Z",
  "baseUrl": "https://docs.example.com",
  "config": {
    "depth": 2,
    "sameDomain": true
  },
  "totalPages": 15,
  "pages": [
    {
      "url": "https://docs.example.com/getting-started",
      "title": "Getting Started",
      "file": "pages/page-001.md",
      "hash": "sha256:a1b2c3d4e5f6...",
      "depth": 1,
      "crawledAt": "2026-02-01T14:00:01.000Z"
    }
  ],
  "specs": [
    {
      "url": "https://docs.example.com/openapi.yaml",
      "type": "openapi",
      "file": "specs/openapi.yaml"
    }
  ]
}
```

---

## 6. PlaywrightFetcher

### 6.1 設計方針

- playwright-cliを使用（全サイト統一、SPA/静的の区別なし）
- セッション管理でブラウザインスタンス再利用
- ネットワーク安定まで待機

### 6.2 実装イメージ

```typescript
class PlaywrightFetcher {
  private sessionId: string;
  private initialized = false;

  constructor(private config: CrawlConfig) {
    this.sessionId = `crawl-${Date.now()}`;
  }

  async fetch(url: string): Promise<FetchResult | null> {
    if (!this.initialized) {
      await this.ensurePlaywrightCli();
      this.initialized = true;
    }

    const headedFlag = this.config.headed ? "--headed" : "";

    // ページを開く
    await $`playwright-cli open ${url} --session ${this.sessionId} ${headedFlag}`;

    // レンダリング待機
    await Bun.sleep(this.config.wait);

    // コンテンツ取得
    const html = await $`playwright-cli eval "document.documentElement.outerHTML" --session ${this.sessionId}`;

    return { html: html.text(), finalUrl: url };
  }

  async close(): Promise<void> {
    await $`playwright-cli close --session ${this.sessionId}`.quiet();
  }

  private async ensurePlaywrightCli(): Promise<void> {
    try {
      await $`which playwright-cli`.quiet();
    } catch {
      console.error("playwright-cli not found. Install: npm i -g @playwright/cli");
      process.exit(3);
    }
  }
}
```

---

## 7. 差分クロール

### 7.1 ハッシュ計算

```typescript
import { createHash } from "crypto";

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
```

### 7.2 差分検知

```typescript
class Hasher {
  private existingHashes: Map<string, string>;

  constructor(indexPath: string) {
    this.existingHashes = this.loadHashes(indexPath);
  }

  isChanged(url: string, content: string): boolean {
    const newHash = computeHash(content);
    const existingHash = this.existingHashes.get(url);
    return existingHash !== newHash;
  }

  private loadHashes(path: string): Map<string, string> {
    // index.json から url → hash のマップを構築
  }
}
```

---

## 8. 出力処理

### 8.1 Merger（全ページ結合）

```typescript
class Merger {
  merge(pages: CrawledPage[]): string {
    return pages
      .map(page => `# ${page.title}\n\n${this.stripTitle(page.markdown)}`)
      .join("\n\n");
  }

  private stripTitle(markdown: string): string {
    // 先頭の # タイトル行を除去（重複防止）
    return markdown.replace(/^#\s+.+\n+/, "");
  }
}
```

### 8.2 Chunker（見出しベース分割）

```typescript
class Chunker {
  chunk(fullMarkdown: string): string[] {
    const chunks: string[] = [];
    const lines = fullMarkdown.split("\n");
    let currentChunk: string[] = [];

    for (const line of lines) {
      if (line.startsWith("# ") && currentChunk.length > 0) {
        // h1で新チャンク開始
        chunks.push(currentChunk.join("\n"));
        currentChunk = [];
      }
      currentChunk.push(line);
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
    }

    return chunks;
  }
}
```

---

## 9. エラーハンドリング

| エラー種別 | 検知方法 | 対応 |
|-----------|---------|------|
| playwright-cli未インストール | `which` 失敗 | exit 3、インストール手順表示 |
| ネットワークエラー | fetch例外 | ログ出力、スキップ、続行 |
| タイムアウト | playwright-cli タイムアウト | ログ出力、スキップ、続行 |
| パースエラー | Readability失敗 | フォールバック抽出、警告ログ |
| 書き込みエラー | FS例外 | エラー表示、exit 1 |

---

## 10. パフォーマンス

| 観点 | 対策 |
|------|------|
| リクエスト負荷 | `--delay` でインターバル制御（デフォルト500ms） |
| 不要なリクエスト | 差分クロールでハッシュ一致時スキップ |
| ブラウザリソース | セッション再利用、処理完了後close |
| メモリ | ページ処理後即座にDOM解放 |

---

## 11. スキル統合

### 11.1 SKILL.md配置

```
link-crawler/
└── SKILL.md    # piエージェント向けスキル定義
```

### 11.2 グローバル登録

```bash
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

### 11.3 利用イメージ

```
pi> Next.jsのドキュメントをクロールして設計の参考にしたい

→ link-crawlerスキルを読み込み
→ bun run crawl.ts https://nextjs.org/docs -d 2
→ full.md をコンテキストとして読み込み
→ 設計相談に回答
```

---

## 12. 今後の拡張ポイント

| 機能 | 説明 | 優先度 |
|------|------|--------|
| sitemap.xml対応 | サイトマップからURL取得 | 中 |
| 認証対応 | Cookie/Bearer/Basic | 中 |
| robots.txt対応 | クロール可否判定 | 低 |
| 並列クロール | 複数ページ同時取得 | 低 |
| 設定ファイル | crawl.config.json | 低 |
