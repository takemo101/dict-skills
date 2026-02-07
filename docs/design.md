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
| Runtime | Bun | 1.0+ | 高速起動、TypeScriptネイティブ |
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
│   │   ├── robots.ts           # robots.txt パーサー
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
| `RobotsChecker` | robots.txt のパースとURL許可判定 | robots.txt, URL | boolean |
| `CrawlLogger` | クロールログ出力（開始、進捗、完了、エラー等） | Config, Events | コンソール出力 |
| `PostProcessor` | 後処理実行（Merger/Chunkerを呼び出し、ページ内容読み込み、full.md書き込み） | CrawledPages | full.md, chunks/ |
| `Extractor` | 本文抽出 | HTML | ContentHTML |
| `Converter` | Markdown変換 | ContentHTML | Markdown |
| `LinksParser` | リンク抽出 | HTML | URLs |
| `Hasher` | ハッシュ計算・比較 | Content | Hash, Changed |
| `IndexManager` | index.jsonの読み込み・保存・管理 | CrawledPage | index.json |
| `OutputWriter` | ページファイル保存、フロントマター付与 | Page | .md File |
| `Merger` | 全ページ結合（メモリ上）、コンテンツ生成 | Pages | Markdown文字列 |
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
┌─────────────────────┐
│ 2.5 robots.txt 取得 │ respectRobots=true
│     とパース        │ の場合のみ
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 3. クロールループ                        │
│  ┌─────────────────────────────────────┐│
│  │ 3.0 robots.txt チェック             ││
│  │     (respectRobots=true の場合)    ││
│  │     └─ 不許可 → スキップ           ││
│  │ 3.1 playwright-cli でHTML取得       ││
│  │ 3.2 contentType判定 (API spec分岐)  ││
│  │ 3.3 メタデータ抽出 (JSDOM)          ││
│  │ 3.4 コンテンツ抽出 (Readability)    ││
│  │ 3.5 リンク抽出 (JSDOM)              ││
│  │ 3.6 Markdown変換 (Turndown)         ││
│  │ 3.7 ハッシュ計算                    ││
│  │ 3.8 差分チェック (--diff時)         ││
│  │     └─ 変更なし → スキップ          ││
│  │ 3.9 ページ保存                      ││
│  │ 3.10 再帰クロール                   ││
│  └─────────────────────────────────────┘│
│  depth < maxDepth まで再帰              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 後処理           │
│  4.1 index.json保存 │
│  4.2 full.md 生成   │
│  4.3 chunks/ 生成   │
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
  /** 最大クロールページ数（nullは無制限） */
  maxPages: number | null;
  outputDir: string;
  sameDomain: boolean;
  includePattern: RegExp | null;
  excludePattern: RegExp | null;
  /** リクエスト間隔（ミリ秒） */
  delay: number;
  /** リクエストタイムアウト（ミリ秒） */
  timeout: number;
  /** SPAページ待機時間（ミリ秒） */
  spaWait: number;
  headed: boolean;
  diff: boolean;
  pages: boolean;
  merge: boolean;
  chunks: boolean;
  keepSession: boolean;
  /** robots.txt を尊重するか（デフォルト: true） */
  respectRobots: boolean;
  /** クローラーのバージョン（package.jsonから取得） */
  version: string;
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
  /** 保存対象の設定項目（maxDepth, sameDomain のみ） */
  config: Pick<CrawlConfig, "maxDepth" | "sameDomain">;
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
└── <サイト名>/      # URLから自動生成（詳細は cli-spec.md 参照）
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

**Note**: ディレクトリ構成の詳細、サイト名の命名規則、各ファイルの役割については [docs/cli-spec.md](cli-spec.md) のセクション5を参照してください。

### 5.3 full.md 形式

ページを `# タイトル` で区切り、Source URL付きで1ファイルに結合。
セクション間は `\n\n---\n\n` で結合される:

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

**Note**: セパレータ `---` の前後には空行（`\n\n`）が入る。

### 5.4 チャンク分割ロジック

H1見出し（`#`）を境界として分割:

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

#### PlaywrightFetcherの概要

**設計概要:**

`PlaywrightFetcher` クラスは `RuntimeAdapter` を使用してplaywright-cliコマンドを実行し、ページのHTMLを取得します。

**主要な処理フロー:**

1. **初期化**: playwright-cliの存在確認（初回のみ）
2. **robots.txt 取得**: 初回クロール時に robots.txt を取得しパース（`--no-robots`未指定時）
3. **robots.txt チェック**: URLがrobots.txtで許可されているか確認（`--no-robots`未指定時、不許可ならスキップ）
4. **ページオープン**: `playwright-cli open <url>` でページを開く
5. **メタデータ取得**: `playwright-cli network` でステータスコード・content-typeを取得
6. **レンダリング待機**: SPAの動的レンダリング完了を待つ
7. **HTML取得**: `playwright-cli eval` でDOMを取得
8. **エラーハンドリング**: 404やタイムアウトを適切に処理
9. **クリーンアップ**: セッション終了、一時ディレクトリ削除

**playwright-cli 0.0.63+ 互換性について:**

playwright-cli 0.0.63+ では、名前付きセッション（`--session=xxx`）を2回目以降のコマンドで使用すると "The session is already configured" エラーが発生します。そのため、デフォルトセッション（`--session`省略）を使用する実装となっています。これにより並列クロールはできませんが、通常の逐次クロールでは問題ありません。

詳細は [docs/decisions/001-playwright-cli-session.md](decisions/001-playwright-cli-session.md) を参照してください。

**実装の主な特徴:**

- `runtime.spawn()` によるコマンド実行（stdout/stderrを分離取得）
- タイムアウト処理（`Promise.race` による競合、`clearTimeout` で適切にクリーンアップ）
- HTTPステータスコード確認（2xx範囲外をスキップ）
- エラーページ検出（chrome-error://をスキップ）
- セッション後のクリーンアップ（`.playwright-cli` ディレクトリ削除）
- `this.runtime.cwd()` の使用（テスタビリティ向上）
- デバッグログ（`debug` フラグ有効時にセッション停止やクリーンアップのエラーを出力）

**実装詳細:**

詳細な実装は以下のファイルを参照してください：
- `link-crawler/src/crawler/fetcher.ts` - PlaywrightFetcherの完全な実装
- `link-crawler/src/utils/runtime.ts` - RuntimeAdapterの実装

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

### 8.1 設計意図

`--diff` オプション使用時、前回クロール時のコンテンツハッシュと比較し、変更があったページのみを処理します。これにより：

- 不要なリクエストを削減し、クロール時間を短縮
- サーバー負荷を軽減
- ネットワーク帯域を節約

### 8.2 ハッシュ計算

ページのMarkdownコンテンツからSHA256ハッシュを計算します。

```typescript
function computeHash(content: string): string
```

- 入力: MarkdownコンテンツのUTF-8文字列
- 出力: SHA256ハッシュ（16進数64文字）

### 8.3 差分検知

`Hasher` クラスが前回のハッシュ値と新しいハッシュ値を比較し、変更有無を判定します。

**主要インターフェース:**

```typescript
class Hasher {
  constructor(existingHashes: Map<string, string>)
  isChanged(url: string, newHash: string): boolean
  getHash(url: string): string | undefined
  get size(): number
}
```

**責務分離:**
- `Hasher`: 純粋なロジッククラス（ハッシュ比較のみ）
- `IndexManager`: ファイルI/O（`index.json`の読み書き）

**IndexManagerのconfig引数:**

`IndexManager`のコンストラクタは以下の形式でconfigを受け取ります：

```typescript
constructor(
  outputDir: string,
  baseUrl: string,
  config: { maxDepth: number; sameDomain: boolean; diff?: boolean },
  logger?: Logger
)
```

configパラメータの役割：
- `maxDepth`, `sameDomain`: `index.json`に保存される設定項目（`CrawlResult.config`として記録）
- `diff`: 内部制御フラグ（差分クロール時の既存ページマージに使用、`index.json`には含まれない）

**使用例:**

```typescript
// IndexManagerから既存ハッシュを読み込み
const existingHashes = indexManager.getHashMap();
const hasher = new Hasher(existingHashes);

// クロール中
if (hasher.isChanged(url, newHash)) {
  // 変更あり: ページを保存
} else {
  // 変更なし: スキップ
}
```

**実装詳細:** `link-crawler/src/diff/hasher.ts`

---

## 9. 出力処理

### 9.1 Merger（全ページ結合）

#### 設計意図

全クロール済みページを1つの `full.md` に結合します。これにより：

- LLMへのコンテキスト入力が容易
- 全体検索が可能
- セクション構造を維持しながら統一フォーマットで提供

#### 主要インターフェース

```typescript
class Merger {
  constructor(_outputDir: string)
  stripTitle(markdown: string): string
  buildFullContent(pages: CrawledPage[], pageContents: Map<string, string>): string
}
```

**メソッドの役割:**
- `buildFullContent()`: 全ページを結合したMarkdown文字列を生成（メモリ上）
- `stripTitle()`: Markdownから先頭のH1タイトルとfrontmatterを除去

#### 処理フロー

1. **タイトル除去**: 各ページのfrontmatterと先頭H1を除去（`stripTitle`）
2. **セクション構築**: 各ページを以下の形式で構築
   ```markdown
   # <タイトル>
   > Source: <URL>
   
   <本文>
   ```
3. **セパレータ結合**: セクション間を `\n\n---\n\n` で結合
4. **文字列返却**: 結合されたMarkdown文字列を返却

#### 使用例

**本番コードでの使用（PostProcessor）:**
```typescript
const merger = new Merger(outputDir);

// メモリ上でコンテンツを生成
const fullContent = merger.buildFullContent(pages, pageContents);

// ファイル書き込みは呼び出し側で実行
const outputPath = join(outputDir, "full.md");
writeFileSync(outputPath, fullContent);
```

**Note**: 本番コード（PostProcessor）は、`buildFullContent()` を使用してメモリ上でコンテンツを生成し、ファイル書き込みは PostProcessor が担当します。これにより、`--no-merge --chunks` のような「mergeなしでchunksのみ」のケースでも、chunker用にコンテンツを再利用できます（Issue #710, #711 参照）。

**実装詳細:** `link-crawler/src/output/merger.ts`

### 9.2 Chunker（見出しベース分割）

#### 設計意図

`full.md` をH1見出し単位でチャンク分割します。これにより：

- LLMのコンテキスト長制限に対応
- 大規模ドキュメントを扱いやすく
- トピック単位での読み込みが可能

#### 主要インターフェース

```typescript
class Chunker {
  constructor(outputDir: string)
  chunk(fullMarkdown: string): string[]
  writeChunks(chunks: string[]): string[]
  chunkAndWrite(fullMarkdown: string): string[]
}
```

#### 分割ロジック

- **分割境界**: `#`（H1見出し）を新チャンクの開始とする
- **frontmatter処理**: ファイル先頭のfrontmatter（`---`で囲まれた部分）は最初のチャンクに含める
- **空チャンク除外**: 空のチャンクは出力しない

**分割例:**

```markdown
# Section A
## A-1
## A-2
# Section B
## B-1
```

↓ 分割後

```
chunk-001.md: # Section A, ## A-1, ## A-2
chunk-002.md: # Section B, ## B-1
```

#### 使用例

```typescript
const chunker = new Chunker(outputDir);
const chunkPaths = chunker.chunkAndWrite(fullMarkdown);
// → .context/<site>/chunks/chunk-001.md, chunk-002.md, ... が生成される
```

**実装詳細:** `link-crawler/src/output/chunker.ts`

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
| 並列クロール | 複数ページ同時取得 | 低 |
| 設定ファイル | crawl.config.json | 低 |
