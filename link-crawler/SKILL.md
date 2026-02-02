---
name: link-crawler
description: 技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール
---

# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール。

## 用途

- 最新技術ドキュメントをローカルに保存
- LLMに読み込ませる知識ベース構築
- フレームワークのベストプラクティスを参考に設計相談

## 前提条件

- Bun インストール済み
- playwright-cli: `npm install -g @playwright/cli`

## セットアップ

```bash
cd link-crawler
bun install
```

## テスト実行

```bash
npm run test
```

---

## 基本コマンド

```bash
bun run link-crawler/src/crawl.ts <url> [options]
```

---

## オプション

### クロール制御

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--delay <ms>` | | `500` | リクエスト間隔 |
| `--wait <ms>` | | `2000` | レンダリング待機時間 |
| `--headed` | | `false` | ブラウザ表示 |
| `--timeout <sec>` | | `30` | リクエストタイムアウト |

### スコープ制御

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `--same-domain` | `true` | 同一ドメインのみ |
| `--include <pattern>` | | 含めるURL（正規表現） |
| `--exclude <pattern>` | | 除外するURL（正規表現） |

### 差分・出力

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--output <dir>` | `-o` | `./.context` | 出力先 |
| `--diff` | | `false` | 差分クロール |
| `--no-pages` | | | ページ単位出力無効 |
| `--no-merge` | | | 結合ファイル無効 |
| `--chunks` | | `false` | チャンク出力を有効化 |

---

## 使用例

### 基本

```bash
# 深度2でクロール
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2

# 特定パスのみ
bun run link-crawler/src/crawl.ts https://docs.example.com --include "/api/"
```

### 差分クロール

```bash
# 初回
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./docs -d 3

# 2回目以降（変更のみ更新）
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./docs -d 3 --diff
```

### AIコンテキスト用

```bash
# デフォルトでは full.md のみ出力
bun run link-crawler/src/crawl.ts https://docs.example.com
# → .context/full.md のみ出力

# 必要な時だけ chunks を有効化
bun run link-crawler/src/crawl.ts https://docs.example.com --chunks
# → .context/full.md + .context/chunks/*.md
```

---

## 技術仕様

### playwright-cli の出力パース仕様

playwright-cliの`eval`コマンド出力からHTMLを抽出する仕様:

```
### Result
"<html>...</html>"
### Ran Playwright code
```

パース処理:
1. 正規表現 `/^### Result\n"([\s\S]*)"\n### Ran Playwright code/` でHTML部分を抽出
2. JSON文字列としてパースし、エスケープ解除（`\n`→改行、`\"`→`"`、`\\`→`\`）
3. JSONパース失敗時は手動でエスケープ解除

### node 経由での実行仕様

**Bunからの直接実行問題の回避策:**

Bunの`spawn`で直接`playwright-cli`を実行すると環境変数やパスの問題が発生するため、**node経由で実行**します。

```typescript
// playwright-cli のパス探索
const nodePaths = [
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node", 
  "node"
];
const cliPaths = [
  "/opt/homebrew/bin/playwright-cli",
  "/usr/local/bin/playwright-cli",
  `${process.env.HOME}/.npm-global/bin/playwright-cli`
];

// node経由で実行
Bun.spawn([nodePath, cliPath, "open", url, "--session", sessionId])
```

この方式により、npmグローバルインストールされたplaywright-cliを安定して実行できます。

### 出力ファイル形式

#### ディレクトリ構造

```
.context/
├── index.json    # メタデータ・ハッシュ
├── full.md       # 全ページ結合 ★ AIコンテキスト用
├── chunks/       # 見出しベース分割 (--chunks 有効時のみ)
│   └── chunk-001.md
├── pages/        # ページ単位
│   └── page-001.md
└── specs/        # API仕様
    └── openapi.yaml
```

#### 個別ページファイルの frontmatter 構造

```markdown
---
url: "https://example.com/docs/page"
title: "ページタイトル"
description: "ページのメタディスクリプション（存在する場合）"
keywords: "キーワード（存在する場合）"
crawledAt: "2025-02-02T12:00:00.000Z"
depth: 1
---

ページのMarkdownコンテンツ...
```

frontmatter フィールド:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `url` | string | ページのURL（必須） |
| `title` | string | ページタイトル（必須） |
| `description` | string | メタディスクリプション（オプション） |
| `keywords` | string | メタキーワード（オプション） |
| `crawledAt` | string | ISO 8601形式のクロール日時（必須） |
| `depth` | number | クロール深度（必須） |

#### full.md 構造

```markdown
# ページタイトル1

> Source: https://example.com/page1

ページ1のコンテンツ...

---

# ページタイトル2

> Source: https://example.com/page2

ページ2のコンテンツ...
```

- `---` で各ページを区切り
- 各ページは `# タイトル` で開始
- `> Source: URL` で元URLを記載

#### index.json 構造

```json
{
  "crawledAt": "2025-02-02T12:00:00.000Z",
  "baseUrl": "https://example.com/docs",
  "config": {
    "maxDepth": 2,
    "sameDomain": true
  },
  "totalPages": 10,
  "pages": [
    {
      "url": "https://example.com/docs/page1",
      "title": "ページタイトル",
      "file": "pages/page-001.md",
      "depth": 0,
      "links": ["https://example.com/docs/page2"],
      "metadata": {
        "title": "ページタイトル",
        "description": "説明",
        "keywords": "キーワード",
        "author": null,
        "ogTitle": null,
        "ogType": null
      },
      "hash": "sha256ハッシュ値",
      "crawledAt": "2025-02-02T12:00:00.000Z"
    }
  ],
  "specs": [
    {
      "url": "https://example.com/openapi.yaml",
      "type": "openapi",
      "file": "specs/openapi.yaml"
    }
  ]
}
```

### エラーハンドリング仕様

#### 終了コード

| コード | 意味 | 対応 |
|--------|------|------|
| `0` | 正常終了 | - |
| `1` | 一般エラー | エラーメッセージ確認 |
| `2` | 引数エラー | `--help` 確認 |
| `3` | playwright-cli未インストール | `npm i -g @playwright/cli` |

#### エラー処理フロー

1. **playwright-cli未検出時**
   - 終了コード3で即座に終了
   - インストールコマンドを表示

2. **ページ取得エラー時**
   - エラーメッセージを表示し、次のページに継続
   - タイムアウトは設定値（デフォルト30秒）で制御

3. **差分モード時のエラー**
   - 既存index.jsonの読み込み失敗時は新規作成として継続
   - 個別ページの失敗はログ出力のみ

#### エラーメッセージ形式

```
✗ playwright-cli not found. Install with: npm install -g @playwright/cli
✗ Fetch Error: [エラーメッセージ] - [URL]
⚠ 既存index.jsonの読み込みに失敗（新規作成）
```

---

## 出力形式

### full.md（推奨）

全ページを `# タイトル` で結合。LLMに直接読み込ませる用途に最適。

```markdown
# Getting Started

導入...

# Installation

インストール...
```

### chunks/*.md

h1見出しを境界として分割。長大ドキュメントの分割に利用。

---

## AIコンテキストとしての利用

### LLMへの資料提供

```bash
# 1. クロール
bun run link-crawler/src/crawl.ts https://docs.example.com -d 3

# 2. LLMに読み込ませる
cat .context/full.md | llm "この技術について要約して"
```

### 設計相談

```bash
# Next.jsドキュメント取得
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2 -o ./nextjs-docs

# 設計相談
cat ./nextjs-docs/full.md | llm "App Routerのベストプラクティスに従って設計して"
```

### 定期更新

```bash
# cron等で定期実行（差分のみ）
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./docs --diff
```

---

## 注意事項

- 対象サイトの利用規約を確認
- `--delay` で適切なリクエスト間隔を設定
- 大規模サイトは `--include` でスコープ限定
