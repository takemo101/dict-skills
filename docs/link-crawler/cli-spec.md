# Link Crawler CLI仕様

## 基本構文

```bash
crawl <url> [options]
```

## 引数

| 引数 | 必須 | 説明 |
|------|------|------|
| `<url>` | ✓ | クロール開始URL |

## オプション

### クロール制御

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度（上限10） |
| `--delay <ms>` | | `500` | リクエスト間隔（ミリ秒） |
| `--timeout <sec>` | | `30` | リクエストタイムアウト（秒） |
| `--same-domain` | | `true` | 同一ドメインのみクロール |
| `--no-same-domain` | | | クロスドメインリンクも追跡 |

### フィルタリング

| オプション | 短縮 | 説明 |
|-----------|------|------|
| `--include <pattern>` | | 含めるURLパターン（正規表現） |
| `--exclude <pattern>` | | 除外するURLパターン（正規表現） |

### SPAモード

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--spa` | | `false` | SPAモードを有効化（playwright-cli使用） |
| `--wait <ms>` | | `2000` | SPAモード時のレンダリング待機時間 |
| `--headed` | | `false` | ブラウザを表示（デバッグ用） |

### 出力

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--output <dir>` | `-o` | `./crawled` | 出力ディレクトリ |

### その他

| オプション | 短縮 | 説明 |
|-----------|------|------|
| `--help` | `-h` | ヘルプ表示 |
| `--version` | `-V` | バージョン表示 |

## 使用例

### 基本的なクロール

```bash
# ドキュメントサイトを深度2でクロール
crawl https://docs.example.com -d 2

# 特定ディレクトリ配下のみ
crawl https://docs.example.com/api --include "/api/"
```

### SPAサイトのクロール

```bash
# Reactアプリをクロール
crawl https://spa-app.example.com --spa

# デバッグ用にブラウザ表示
crawl https://spa-app.example.com --spa --headed

# レンダリング待機時間を長めに
crawl https://slow-spa.example.com --spa --wait 5000
```

### フィルタリング

```bash
# ブログ記事のみ
crawl https://example.com --include "/blog/"

# 特定パスを除外
crawl https://docs.example.com --exclude "/v1/|/deprecated/"

# 組み合わせ
crawl https://docs.example.com \
  --include "/api/" \
  --exclude "/internal/"
```

## 出力構造

```
crawled/
├── index.json          # クロール結果インデックス
├── pages/
│   ├── page-001.md     # クロールしたページ（Markdown）
│   ├── page-002.md
│   └── ...
└── specs/
    ├── openapi.yaml    # 検出したAPI仕様
    └── schema.json
```

### index.json 構造

```json
{
  "crawledAt": "2026-02-01T14:00:00.000Z",
  "baseUrl": "https://docs.example.com",
  "config": {
    "maxDepth": 2,
    "spa": false,
    "sameDomain": true
  },
  "totalPages": 15,
  "pages": [
    {
      "url": "https://docs.example.com/",
      "title": "Documentation",
      "file": "pages/page-001.md",
      "depth": 0,
      "links": ["https://docs.example.com/getting-started"],
      "metadata": {
        "title": "Documentation",
        "description": "Official documentation",
        "keywords": null,
        "author": null,
        "ogTitle": "Documentation",
        "ogType": "website"
      }
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

### Markdownファイル構造

```markdown
---
url: https://docs.example.com/getting-started
title: "Getting Started"
description: "Quick start guide"
crawledAt: 2026-02-01T14:00:00.000Z
depth: 1
---

# Getting Started

本文がここに続く...
```

## 終了コード

| コード | 意味 |
|--------|------|
| `0` | 正常終了 |
| `1` | 一般エラー（ネットワーク等） |
| `2` | 引数エラー |
| `3` | playwright-cli未インストール（SPAモード時） |
