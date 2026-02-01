---
name: link-crawler
description: Crawls technical documentation sites by following links recursively. Extracts text, metadata, and API specifications (OpenAPI, JSON Schema). Use for collecting documentation from manual sites with depth limits and duplicate link prevention.
---

# Link Crawler

技術ドキュメントサイトを再帰的にクロールし、情報を収集するスキル。

## Setup

```bash
cd {baseDir}
npm install
```

## 基本的な使用方法

### 単一ページの取得

```bash
{baseDir}/crawl.js https://example.com/docs
```

### 再帰的クロール

```bash
{baseDir}/crawl.js https://example.com/docs --depth 2         # 2階層まで辿る
{baseDir}/crawl.js https://example.com/docs --depth 3 -o ./output  # 出力先指定
```

### オプション

- `-d, --depth <num>` - クロール深度 (default: 1, max: 10)
- `-o, --output <dir>` - 出力ディレクトリ (default: ./crawled)
- `--same-domain` - 同一ドメインのみ辿る (default: true)
- `--include <pattern>` - 含めるURLパターン (正規表現)
- `--exclude <pattern>` - 除外するURLパターン (正規表現)
- `--delay <ms>` - リクエスト間隔 (default: 500ms)
- `--timeout <sec>` - タイムアウト秒数 (default: 30)

## 出力形式

### ディレクトリ構造

```
output/
├── index.json          # クロール結果のインデックス
├── pages/              # Markdownページ
│   ├── page-001.md
│   └── page-002.md
└── specs/              # API仕様書
    ├── openapi.yaml
    └── schema.json
```

### index.json

```json
{
  "crawledAt": "2024-01-01T00:00:00Z",
  "baseUrl": "https://example.com/docs",
  "totalPages": 10,
  "pages": [
    {
      "url": "https://example.com/docs",
      "title": "Documentation",
      "file": "pages/page-001.md",
      "depth": 0,
      "links": ["https://example.com/docs/guide"]
    }
  ],
  "specs": [
    {
      "url": "https://example.com/api/openapi.yaml",
      "type": "openapi",
      "file": "specs/openapi.yaml"
    }
  ]
}
```

## API仕様の自動検出

以下のファイルを自動的に検出・保存:

- OpenAPI/Swagger: `openapi.yaml`, `openapi.json`, `swagger.yaml`, `swagger.json`
- JSON Schema: `*.schema.json`, `schema.json`
- GraphQL Schema: `schema.graphql`

## When to Use

- 技術ドキュメントのオフライン保存
- API仕様書の収集
- ドキュメントサイトの構造化データ抽出
- マニュアルサイトの情報収集
