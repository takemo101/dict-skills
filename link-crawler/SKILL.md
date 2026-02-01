# link-crawler

技術ドキュメントサイトを再帰的にクロールし、Markdown形式で保存するCLIツール。

## 用途

- 技術ドキュメントのローカル保存
- AIエージェントの知識ベース構築
- SPAサイトのコンテンツ取得

## 前提条件

- Bun がインストール済み
- SPAモード使用時: `npm install -g @playwright/cli`

## 基本コマンド

```bash
# 静的サイトをクロール
bun run <skill-path>/src/crawl.ts <url> [options]

# SPAサイトをクロール
bun run <skill-path>/src/crawl.ts <url> --spa [options]
```

## オプション

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度（上限10） |
| `--output <dir>` | `-o` | `./crawled` | 出力ディレクトリ |
| `--same-domain` | | `true` | 同一ドメインのみクロール |
| `--no-same-domain` | | | クロスドメインリンクも追跡 |
| `--include <pattern>` | | | 含めるURLパターン（正規表現） |
| `--exclude <pattern>` | | | 除外するURLパターン（正規表現） |
| `--delay <ms>` | | `500` | リクエスト間隔（ミリ秒） |
| `--timeout <sec>` | | `30` | リクエストタイムアウト（秒） |
| `--spa` | | `false` | SPAモード（playwright-cli使用） |
| `--wait <ms>` | | `2000` | SPAレンダリング待機時間 |
| `--headed` | | `false` | ブラウザを表示（デバッグ用） |

## 使用例

### 静的ドキュメントサイト

```bash
# 深度2でクロール
bun run <skill-path>/src/crawl.ts https://docs.example.com -d 2

# 特定パス配下のみ
bun run <skill-path>/src/crawl.ts https://docs.example.com --include "/api/"

# 出力先を指定
bun run <skill-path>/src/crawl.ts https://docs.example.com -o ./docs-backup
```

### SPAサイト（React/Vue/Angularなど）

```bash
# SPAモードでクロール
bun run <skill-path>/src/crawl.ts https://spa-docs.example.com --spa

# レンダリング待機時間を延長
bun run <skill-path>/src/crawl.ts https://slow-spa.example.com --spa --wait 5000

# デバッグ用にブラウザ表示
bun run <skill-path>/src/crawl.ts https://spa-docs.example.com --spa --headed
```

### フィルタリング

```bash
# 特定パスを除外
bun run <skill-path>/src/crawl.ts https://docs.example.com --exclude "/v1/|/deprecated/"

# 複合条件
bun run <skill-path>/src/crawl.ts https://docs.example.com \
  --include "/api/" \
  --exclude "/internal/" \
  -d 3
```

## 出力形式

```
crawled/
├── index.json          # クロール結果インデックス
├── pages/
│   ├── page-001.md     # Markdownに変換されたページ
│   ├── page-002.md
│   └── ...
└── specs/
    ├── openapi.yaml    # 検出されたAPI仕様
    └── schema.json
```

### index.json

クロール結果のメタデータ。ページ一覧、リンク関係、検出されたAPI仕様を含む。

### pages/*.md

各ページはfrontmatter付きMarkdown形式：

```markdown
---
url: https://docs.example.com/getting-started
title: "Getting Started"
description: "Quick start guide"
crawledAt: 2026-02-01T14:00:00.000Z
depth: 1
---

# Getting Started

本文...
```

## エラー時の対応

| 終了コード | 意味 | 対応 |
|-----------|------|------|
| `0` | 正常終了 | - |
| `1` | 一般エラー | エラーメッセージを確認 |
| `2` | 引数エラー | `--help` でオプション確認 |
| `3` | playwright-cli未インストール | `npm install -g @playwright/cli` |

## 注意事項

- クロール対象サイトの利用規約を確認すること
- 過度なリクエストを避けるため `--delay` を適切に設定
- 大規模サイトは `--include` でスコープを限定
