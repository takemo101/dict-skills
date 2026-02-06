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
| Test Framework | Vitest | 4.x | 高速、ESM対応、Bun互換 |
| CLI Parser | Commander | 13.x | 軽量、標準的 |
| Browser | playwright-cli | latest | SPA完全対応、セッション管理 |
| DOM Parser | JSDOM | 28.x | Node.js標準的なDOM実装 |
| Content Extractor | @mozilla/readability | 0.6.x | Firefox由来、高品質 |
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
│   ├── constants.ts            # 定数定義
│   ├── errors.ts               # エラークラス
│   │
│   ├── crawler/
│   │   ├── index.ts            # CrawlerEngine
│   │   ├── fetcher.ts          # PlaywrightFetcher
│   │   ├── logger.ts           # ログ出力
│   │   └── post-processor.ts   # 後処理
│   │
│   ├── parser/
│   │   ├── extractor.ts        # HTML → 本文抽出
│   │   ├── converter.ts        # HTML → Markdown
│   │   └── links.ts            # リンク抽出・正規化
│   │
│   ├── diff/
│   │   ├── index.ts            # バレルエクスポート
│   │   └── hasher.ts           # SHA256ハッシュ・差分検知
│   │
│   ├── output/
│   │   ├── writer.ts           # ページ書き込み
│   │   ├── merger.ts           # full.md 生成
│   │   ├── chunker.ts          # chunks/*.md 生成
│   │   └── index-manager.ts    # index.json管理
│   │
│   ├── types/
│   │   └── turndown-plugin-gfm.d.ts  # Turndown型定義
│   │
│   └── utils/
│       ├── runtime.ts          # ランタイムアダプター
│       └── site-name.ts        # サイト名生成
│
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

### 3.3 モジュール責務

| モジュール | 責務 | 入力 | 出力 |
|-----------|------|------|------|
| `Constants` | 定数定義（デフォルト値、ファイル名、パターン、終了コード） | - | 定数オブジェクト |
| `Errors` | エラークラス定義（CrawlError, FetchError, ConfigError等） | Error情報 | Typed Error |
| `CrawlerEngine` | クロール制御、再帰管理 | URL, Config | CrawledPages |
| `PlaywrightFetcher` | ページ取得 | URL | HTML |
| `CrawlLogger` | クロールログ出力（開始、進捗、完了、エラー等） | Config, Events | コンソール出力 |
| `PostProcessor` | 後処理実行（Merger/Chunker呼び出し、ページ内容読み込み） | CrawledPages | full.md, chunks/ |
| `Extractor` | 本文抽出 | HTML | ContentHTML |
| `Converter` | Markdown変換 | ContentHTML | Markdown |
| `LinksParser` | リンク抽出 | HTML | URLs |
| `Hasher` | ハッシュ計算・比較 | Content | Hash, Changed |
| `IndexManager` | index.jsonの読み込み・保存・管理 | CrawledPage | index.json |
| `OutputWriter` | ページファイル保存、フロントマター付与 | Page | .md File |
| `Merger` | 全ページ結合 | Pages | full.md |
| `Chunker` | チャンク分割 | full.md | chunks/*.md |
| `RuntimeAdapter` | ランタイム抽象化（Bun/Node.js互換） | Command | SpawnResult |

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
  spaWait: number;
  headed: boolean;
  diff: boolean;
  pages: boolean;
  merge: boolean;
  chunks: boolean;
  keepSession: boolean;
}

/** ページメタデータ */
interface PageMetadata {
  title: string | null;
  description: string | null;
  keywords: string | null;
  author: string | null;
  ogTitle: string | null;
  ogType: string | null;
}

/** クロール済みページ情報 */
interface CrawledPage {
  url: string;
  title: string | null;
  file: string;
  depth: number;
  links: string[];
  metadata: PageMetadata;
  hash: string;
  crawledAt: string;
}

/** クロール結果 */
interface CrawlResult {
  crawledAt: string;
  baseUrl: string;
  config: Partial<CrawlConfig>;
  totalPages: number;
  pages: CrawledPage[];
  specs: DetectedSpec[];
}

/** 検出されたAPI仕様 */
interface DetectedSpec {
  url: string;
  type: string;
  file: string;
}
```

### 5.2 出力構造

```
.context/
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

ページを `# タイトル` で区切り、Source URL付きで1ファイルに結合:

```markdown
# Getting Started

> Source: https://docs.example.com/getting-started

導入部分の内容...

---

# Installation

> Source: https://docs.example.com/installation

インストール手順...

---

# Configuration

> Source: https://docs.example.com/configuration

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
    "maxDepth": 2,
    "sameDomain": true
  },
  "totalPages": 15,
  "pages": [
    {
      "url": "https://docs.example.com/getting-started",
      "title": "Getting Started",
      "file": "pages/page-001.md",
      "depth": 1,
      "links": [
        "https://docs.example.com/installation",
        "https://docs.example.com/configuration"
      ],
      "metadata": {
        "title": "Getting Started",
        "description": "Quick start guide for beginners",
        "keywords": "guide, tutorial, quickstart",
        "author": null,
        "ogTitle": "Getting Started - Example Docs",
        "ogType": "article"
      },
      "hash": "a1b2c3d4e5f6...",
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

#### RuntimeAdapterパターン

実装では、Bun/Node.js両対応を実現するため **RuntimeAdapterパターン** を採用しています。

**設計意図：**
- **クロスランタイム対応**: BunとNode.jsで同じコードが動作
- **テスタビリティ**: モックRuntimeAdapterを注入してテスト可能
- **保守性**: プロセス実行ロジックを一箇所に集約

**RuntimeAdapterインターフェース：**
```typescript
interface RuntimeAdapter {
  spawn(command: string, args: string[]): Promise<SpawnResult>;
  sleep(ms: number): Promise<void>;
  readFile(path: string): Promise<string>;
}
```

`createRuntimeAdapter()` 関数がランタイムを自動検出し、適切なアダプターを返します：
- Bun環境: `BunRuntimeAdapter` (Bun.spawnを使用)
- Node.js環境: `NodeRuntimeAdapter` (child_process.spawnを使用)

#### PlaywrightFetcherの実装

```typescript
/**
 * Playwright-CLI Fetcher (全サイト対応)
 *
 * ## playwright-cli 0.0.63+ 互換性について (2026-02-05)
 *
 * ### 問題1: Unixソケットパス長制限
 * playwright-cliはセッションごとにUnixソケットを作成する。
 * パスが `/var/folders/.../playwright-cli/<hash>/<sessionId>.sock` となり、
 * Unixの制限(~108文字)を超えるとEINVALエラーが発生。
 * → sessionIdを短縮: `crawl-${Date.now()}` → `c${Date.now().toString(36)}`
 *
 * ### 問題2: --session オプションの仕様変更
 * playwright-cli 0.0.63+ では、2回目以降のコマンドで `--session=xxx` を使うと
 * "The session is already configured" エラーが発生する。
 * → デフォルトセッション(--session省略)を使用するよう変更
 */
class PlaywrightFetcher implements Fetcher {
  // sessionIdは現在未使用だが、将来の並列実行対応のため保持
  private sessionId: string;
  private initialized = false;
  private nodePath: string = "node";
  private playwrightPath: string = "playwright-cli";
  private runtime: RuntimeAdapter;

  constructor(
    private config: CrawlConfig,
    runtime?: RuntimeAdapter,
  ) {
    // 短いsessionId（Unixソケットパス長制限対策、現在は未使用）
    this.sessionId = `c${Date.now().toString(36)}`;
    this.runtime = runtime ?? createRuntimeAdapter();
  }

  /** CLIコマンドを実行（内部ヘルパー） */
  private async runCli(args: string[]): Promise<SpawnResult> {
    return this.runtime.spawn(this.nodePath, [this.playwrightPath, ...args]);
  }

  async fetch(url: string): Promise<FetchResult | null> {
    if (!this.initialized) {
      const hasPlaywright = await this.checkPlaywrightCli();
      if (!hasPlaywright) {
        throw new DependencyError(
          "playwright-cli not found. Install with: npm install -g @playwright/cli",
          "playwright-cli",
        );
      }
      this.initialized = true;
    }

    // タイムアウト処理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Request timeout after ${this.config.timeout}ms`, this.config.timeout));
      }, this.config.timeout);
    });

    return Promise.race([this.executeFetch(url), timeoutPromise]);
  }

  /**
   * フェッチを実行
   * Note: playwright-cli 0.0.63+ では名前付きセッションが使えないため、
   * デフォルトセッションを使用。並列クロールは不可。
   */
  private async executeFetch(url: string): Promise<FetchResult | null> {
    // デフォルトセッションを使用（--session省略）
    const openArgs = ["open", url];
    if (this.config.headed) {
      openArgs.push("--headed");
    }

    // ページを開く
    const openResult = await this.runCli(openArgs);

    // エラーページやHTTP 404等の場合はnullを返してスキップ
    if (!openResult.success || openResult.stdout.includes("chrome-error://")) {
      return null;
    }

    // HTTPステータスコード確認（200以外はスキップ）
    const statusCode = await this.getHttpStatusCode();
    if (statusCode !== null && statusCode !== 200) {
      return null;
    }

    // レンダリング待機
    await this.runtime.sleep(this.config.spaWait);

    // コンテンツ取得
    const result = await this.runCli([
      "eval",
      "document.documentElement.outerHTML",
    ]);

    if (!result.success) {
      throw new FetchError(`Failed to get content: ${result.stderr}`, url);
    }

    return {
      html: parseCliOutput(result.stdout),
      finalUrl: url,
      contentType: "text/html",
    };
  }

  async close(): Promise<void> {
    // デフォルトセッションを停止
    // Note: 以前は ["close", "--session", sessionId] だったが、
    // playwright-cli 0.0.63+ では session-stop コマンドを使用
    await this.runCli(["session-stop"]);

    // セッションクリーンアップ（--keep-sessionオプションで制御）
    if (!this.config.keepSession) {
      const cliDir = join(process.cwd(), ".playwright-cli");
      if (existsSync(cliDir)) {
        rmSync(cliDir, { recursive: true, force: true });
      }
    }
  }
}
```

**実装の主な特徴：**
- `runtime.spawn()` によるコマンド実行（stdout/stderrを分離取得）
- タイムアウト処理（`Promise.race` による競合）
- HTTPステータスコード確認（200以外をスキップ）
- エラーページ検出（chrome-error://をスキップ）
- セッション後のクリーンアップ（`.playwright-cli` ディレクトリ削除）

詳細な実装は `src/crawler/fetcher.ts` および `src/utils/runtime.ts` を参照してください。

---

## 7. セッション管理

### 7.1 概要

`--keep-session`オプションを使用して、Playwrightのセッションデータ（`.playwright-cli`ディレクトリ）の保持/削除を制御できます。

### 7.2 動作

**通常時（`--keep-session`未指定または`false`）：**
- クロール完了時に`.playwright-cli`ディレクトリを自動削除
- 一時ファイルが残らず、クリーンな状態を維持
- デフォルト動作

**デバッグ時（`--keep-session`指定）：**
- `.playwright-cli`ディレクトリを保持
- Playwrightのセッション情報、一時ファイル、ブラウザ状態の確認が可能
- トラブルシューティングやデバッグに有用

### 7.3 使用例

```bash
# 通常実行（セッション自動削除）
crawl https://docs.example.com

# デバッグ実行（セッション保持）
crawl https://docs.example.com --keep-session
# → クロール後も .playwright-cli/ が残る
```

---

## 8. 差分クロール

### 8.1 ハッシュ計算

```typescript
import { createHash } from "crypto";

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
```

### 8.2 差分検知

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

## 9. 出力処理

### 9.1 Merger（全ページ結合）

```typescript
class Merger {
  merge(pages: CrawledPage[]): string {
    return pages
      .map(page => `# ${page.title}\n\n${this.stripTitle(page.markdown)}`)
      .join("\n\n");
  }

  /**
   * Markdownから先頭のH1タイトルを除去
   * frontmatterがある場合は考慮する
   * 
   * Note: publicメソッドとして実装（テストで使用されている）
   * 
   * @param markdown Markdown文字列
   * @returns タイトル除去後のMarkdown
   */
  stripTitle(markdown: string): string {
    // frontmatterをスキップ
    let content = markdown;
    if (content.startsWith("---")) {
      const endIndex = content.indexOf("---", 3);
      if (endIndex !== -1) {
        content = content.slice(endIndex + 3).trimStart();
      }
    }

    // 先頭のH1を除去
    const lines = content.split("\n");
    if (lines.length > 0 && lines[0].startsWith("# ")) {
      lines.shift();
      // タイトル後の空行も除去
      while (lines.length > 0 && lines[0].trim() === "") {
        lines.shift();
      }
    }

    return lines.join("\n");
  }
}
```

### 9.2 Chunker（見出しベース分割）

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

## 10. エラーハンドリング

| エラー種別 | 検知方法 | 対応 |
|-----------|---------|------|
| playwright-cli未インストール | `which` 失敗 | exit 3、インストール手順表示 |
| ネットワークエラー | fetch例外 | ログ出力、スキップ、続行 |
| タイムアウト | playwright-cli タイムアウト | ログ出力、スキップ、続行 |
| パースエラー | Readability失敗 | フォールバック抽出、警告ログ |
| 書き込みエラー | FS例外 | エラー表示、exit 1 |

---

## 11. パフォーマンス

| 観点 | 対策 |
|------|------|
| リクエスト負荷 | `--delay` でインターバル制御（デフォルト500ms） |
| 不要なリクエスト | 差分クロールでハッシュ一致時スキップ |
| ブラウザリソース | セッション再利用、処理完了後close |
| メモリ | ページ処理後即座にDOM解放 |

---

## 12. スキル統合

### 12.1 SKILL.md配置

```
link-crawler/
└── SKILL.md    # piエージェント向けスキル定義
```

### 12.2 グローバル登録

```bash
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

### 12.3 利用イメージ

```
pi> Next.jsのドキュメントをクロールして設計の参考にしたい

→ link-crawlerスキルを読み込み
→ bun run crawl.ts https://nextjs.org/docs -d 2
→ full.md をコンテキストとして読み込み
→ 設計相談に回答
```

---

## 13. 今後の拡張ポイント

| 機能 | 説明 | 優先度 |
|------|------|--------|
| sitemap.xml対応 | サイトマップからURL取得 | 中 |
| 認証対応 | Cookie/Bearer/Basic | 中 |
| robots.txt対応 | クロール可否判定 | 低 |
| 並列クロール | 複数ページ同時取得 | 低 |
| 設定ファイル | crawl.config.json | 低 |
