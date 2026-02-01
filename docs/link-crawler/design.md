# Link Crawler 設計書

## 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| Runtime | Bun | 1.3.x | 高速なJavaScript/TypeScript実行環境 |
| Language | TypeScript | 5.8.x | 型安全な開発 |
| Linter/Formatter | Biome | 2.x | コード品質・フォーマット統一 |
| CLI Parser | Commander | 13.x | コマンドライン引数解析 |
| DOM Parser | JSDOM | 26.x | 静的HTMLのDOM構築 |
| Content Extractor | @mozilla/readability | 0.5.x | 本文抽出 |
| Markdown Converter | Turndown | 7.x | HTML→Markdown変換 |
| SPA Renderer | playwright-cli | latest | SPAサイトの動的レンダリング |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        crawl CLI                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │   Config    │───▶│   Crawler   │───▶│  OutputWriter   │ │
│  │   Parser    │    │   Engine    │    │                 │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘ │
│                            │                               │
│         ┌──────────────────┴──────────────────┐            │
│         ▼                                     ▼            │
│  ┌─────────────────┐                ┌─────────────────┐    │
│  │  StaticFetcher  │                │   SPAFetcher    │    │
│  │  (fetch+JSDOM)  │                │ (playwright-cli)│    │
│  └─────────────────┘                └─────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## モジュール構成

```
link-crawler/
├── SKILL.md           # piエージェント向けスキル定義
├── src/
│   ├── crawl.ts       # エントリーポイント
│   ├── config.ts      # 設定型定義・パース
│   ├── types.ts       # 共通型定義
│   ├── crawler/
│   │   ├── index.ts   # Crawlerエンジン
│   │   ├── static.ts  # StaticFetcher (fetch + JSDOM)
│   │   └── spa.ts     # SPAFetcher (playwright-cli)
│   ├── parser/
│   │   ├── extractor.ts  # コンテンツ抽出 (Readability)
│   │   ├── converter.ts  # Markdown変換 (Turndown)
│   │   └── links.ts      # リンク抽出・正規化
│   └── output/
│       └── writer.ts  # ファイル書き込み・インデックス生成
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

## スキル統合

### SKILL.md

piエージェントがこのツールを利用するためのスキル定義ファイル。

| 項目 | 説明 |
|------|------|
| 配置場所 | `link-crawler/SKILL.md` |
| 用途 | pi-monoでのグローバルスキルとして利用 |
| グローバル登録 | `~/.pi/agent/skills/link-crawler` にシンボリックリンク |

### グローバルスキル登録

```bash
# シンボリックリンクでグローバル登録
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

これにより、piエージェントは任意のプロジェクトから `link-crawler` スキルを利用可能になる。

## データフロー

```
1. URL入力
   │
2. Fetcher選択 (--spa フラグで分岐)
   ├── Static: fetch() → HTML文字列
   └── SPA: playwright-cli open → playwright-cli content
   │
3. DOM構築 (JSDOM)
   │
4. コンテンツ抽出 (Readability)
   │
5. Markdown変換 (Turndown + GFM)
   │
6. ファイル出力 (pages/page-001.md)
   │
7. リンク抽出 → 再帰 (depth < maxDepth)
   │
8. インデックス生成 (index.json)
```

## Fetcher インターフェース

```typescript
interface Fetcher {
  fetch(url: string): Promise<FetchResult | null>;
  close?(): Promise<void>;
}

interface FetchResult {
  html: string;
  finalUrl: string;
  contentType: string;
}
```

### StaticFetcher

- 標準の `fetch()` API を使用
- 高速・低リソース
- JavaScript非実行（静的HTML向け）

### SPAFetcher

- `playwright-cli` を子プロセスとして実行
- `open` → `content` → `close` のフロー
- セッション管理でブラウザ再利用
- JavaScript完全実行（React/Vue/Angular対応）

## エラーハンドリング

| エラー種別 | 対応 |
|-----------|------|
| ネットワークエラー | スキップしてログ出力 |
| タイムアウト | スキップしてログ出力 |
| パースエラー | フォールバック抽出を試行 |
| playwright-cli未インストール | 明確なエラーメッセージで終了（exit 3） |

## パフォーマンス考慮

| 項目 | 対策 |
|------|------|
| リクエスト間隔 | `--delay` オプション（デフォルト500ms） |
| 同時接続数 | 直列実行（サーバー負荷軽減） |
| メモリ | ページ処理後即座にDOM解放 |
| セッション再利用 | SPAモードでブラウザインスタンス再利用 |
