# Link Crawler CLI仕様

## 1. 基本構文

```bash
crawl <url> [options]
```

## 2. 引数

| 引数 | 必須 | 説明 |
|------|------|------|
| `<url>` | ✓ | クロール開始URL |

## 3. オプション一覧

### 3.1 クロール制御

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度（上限10） |
| `--max-pages <num>` | | `無制限` | 最大クロールページ数（0=無制限） |
| `--delay <ms>` | | `500` | リクエスト間隔（ミリ秒） |
| `--timeout <sec>` | | `30` | リクエストタイムアウト（秒） |
| `--wait <ms>` | | `2000` | ページレンダリング待機時間（ミリ秒） |
| `--headed` | | `false` | ブラウザを表示（デバッグ用） |
| `--no-robots` | | | robots.txt を無視（非推奨） |

### 3.2 スコープ制御

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `--same-domain` | `true` | 同一ドメインのみクロール |
| `--no-same-domain` | | クロスドメインリンクも追跡 |
| `--include <pattern>` | | 含めるURLパターン（正規表現） |
| `--exclude <pattern>` | | 除外するURLパターン（正規表現） |

### 3.3 差分クロール

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `--diff` | `false` | 差分クロール（変更ページのみ更新） |

### 3.4 出力制御

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--output <dir>` | `-o` | `./.context/<サイト名>/` | 出力ディレクトリ |
| `--no-pages` | | | ページ単位ファイル出力を無効化 |
| `--no-merge` | | | 結合ファイル(full.md)出力を無効化 |
| `--chunks` | | `false` | チャンク分割出力を有効化 |
| `--keep-session` | | `false` | デバッグ用に.playwright-cliディレクトリを保持 |

### 3.5 ヘルプ

| オプション | 短縮 | 説明 |
|-----------|------|------|
| `--help` | `-h` | ヘルプ表示 |
| `--version` | `-V` | バージョン表示 |

---

## 4. 使用例

### 4.1 基本的なクロール

```bash
# 深度2でクロール
crawl https://docs.example.com -d 2

# 出力先を指定
crawl https://docs.example.com -o ./my-docs
```

### 4.2 差分クロール

```bash
# 初回クロール
crawl https://docs.example.com -o ./docs -d 3

# 2回目以降（変更ページのみ更新）
crawl https://docs.example.com -o ./docs -d 3 --diff
```

### 4.3 スコープ制御

```bash
# 特定パス配下のみ
crawl https://docs.example.com --include "/api/"

# 特定パスを除外
crawl https://docs.example.com --exclude "/v1/|/deprecated/"

# 組み合わせ
crawl https://docs.example.com --include "/guide/" --exclude "/internal/"
```

### 4.4 出力形式制御

```bash
# AIコンテキスト用: 結合ファイルのみ
crawl https://docs.example.com --no-pages

# ページ単位のみ
crawl https://docs.example.com --no-merge

# チャンクのみ
crawl https://docs.example.com --no-pages --no-merge --chunks
```

### 4.5 robots.txt の制御

```bash
# デフォルト: robots.txt を尊重（推奨）
crawl https://docs.example.com -d 2

# robots.txt を無視（開発・テスト用、非推奨）
crawl https://docs.example.com -d 2 --no-robots
```

**注意**: `--no-robots` オプションは開発やテスト目的でのみ使用してください。本番環境では常に robots.txt を尊重することを推奨します。

### 4.6 デバッグ・調整

```bash
# ブラウザを表示して動作確認
crawl https://docs.example.com --headed

# 遅いサイト向けに待機時間延長
crawl https://slow-site.example.com --wait 5000

# サーバー負荷軽減のためリクエスト間隔延長
crawl https://docs.example.com --delay 2000

# 最大100ページまでクロール
crawl https://docs.example.com --max-pages 100

# 深度は大きくてもページ数で制限
crawl https://docs.example.com -d 10 --max-pages 50
```

---

## 5. 出力構造

### 5.1 ディレクトリ構成

```
.context/
└── <サイト名>/       # URLから自動生成（例: nextjs-docs, python-3, example）
    ├── index.json       # メタデータ・ハッシュ情報
    ├── full.md          # 全ページ結合（AIコンテキスト用）
    ├── chunks/          # 見出しベースチャンク分割
    │   ├── chunk-001.md
    │   ├── chunk-002.md
    │   └── ...
    ├── pages/           # ページ単位
    │   ├── page-001-getting-started.md
    │   ├── page-002-installation.md
    │   └── ...
    └── specs/           # 検出されたAPI仕様
        ├── openapi.yaml
        └── ...
```

**ページファイルの命名規則:**
- 形式: `page-<番号>-<タイトルスラグ>.md`（例: `page-001-getting-started.md`）
- タイトルスラグが空の場合: URLパスの最後のセグメントからスラグを生成（フォールバック）
- タイトルもURLパスも空の場合: `page-<番号>.md`（例: `page-001.md`）
- スラグ生成ルール:
  - タイトルを小文字化
  - 特殊文字（ASCII英数字・スペース・アンダースコア・ハイフン以外）を除去
  - スペースとアンダースコアをハイフンに変換
  - 連続するハイフンを1つに統合
  - 先頭・末尾のハイフンを除去
  - 最大50文字に切り詰め
  - 切り詰め後の末尾ハイフンを除去

**サイト名の命名規則:**

出力ディレクトリ名（`<サイト名>`）は、クロール対象URLから自動生成されます：

1. サブドメイン（`docs`, `api`, `www`, `blog`, `dev`等）は除去されます
2. TLD（`.com`, `.org`, `.dev`等）は除去されます
3. パスの最初のセグメントが追加されます

**変換例:**

| URL | 生成されるサイト名 |
|-----|------------------|
| `https://nextjs.org/docs` | `nextjs-docs` |
| `https://docs.python.org/3/` | `python-3` |
| `https://docs.example.com` | `example` |
| `https://www.example.com` | `example` |
| `https://api.example.com/v1` | `example-v1` |
| `https://docs.example.com/api` | `example-api` |

### 5.2 index.json

クロール結果のメタデータ。差分クロール用のハッシュ情報を含む。

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
      "file": "pages/page-001-getting-started.md",
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

#### ページフィールド

| フィールド | 型 | 説明 |
|-----------|------|------|
| `url` | string | ページURL |
| `title` | string \| null | ページタイトル |
| `file` | string | 出力ファイルパス（pages/以下） |
| `depth` | number | クロール深度（開始URL=0） |
| `links` | string[] | ページから抽出されたリンク一覧 |
| `metadata` | object | ページメタデータ |
| `metadata.title` | string \| null | メタタグから抽出したタイトル |
| `metadata.description` | string \| null | メタディスクリプション |
| `metadata.keywords` | string \| null | メタキーワード |
| `metadata.author` | string \| null | 著者情報 |
| `metadata.ogTitle` | string \| null | Open Graphタイトル |
| `metadata.ogType` | string \| null | Open Graphタイプ |
| `hash` | string | コンテンツのSHA-256ハッシュ |
| `crawledAt` | string | クロール日時（ISO 8601） |

### 5.3 full.md

全ページを `# タイトル` で結合したファイル。LLMへの入力に最適。

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

### 5.4 chunks/*.md

見出し（h1）を境界としてチャンク分割。

```markdown
<!-- chunk-001.md -->
# Getting Started

導入部分...

## Prerequisites

前提条件...

## Quick Start

クイックスタート...
```

```markdown
<!-- chunk-002.md -->
# Installation

インストール手順...

## npm

npm install...
```

### 5.5 pages/*.md

ページ単位でfrontmatter付きMarkdown。

#### フィールド一覧

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `url` | ✓ | ページURL |
| `title` | ✓ | ページタイトル（空文字列の場合あり） |
| `description` | | メタディスクリプション（存在する場合のみ） |
| `keywords` | | メタキーワード（存在する場合のみ） |
| `hash` | ✓ | コンテンツのSHA-256ハッシュ |
| `crawledAt` | ✓ | クロール日時（ISO 8601） |
| `depth` | ✓ | クロール深度（開始URL=0） |

#### 出力例

```markdown
---
url: https://docs.example.com/getting-started
title: "Getting Started"
description: "Quick start guide for beginners"
keywords: "guide, tutorial, quickstart"
hash: "a1b2c3d4e5f6..."
crawledAt: 2026-02-01T14:00:01.000Z
depth: 1
---

# Getting Started

本文...
```

---

## 6. 終了コード

| コード | 意味 | 対応 |
|--------|------|------|
| `0` | 正常終了 | - |
| `1` | 一般エラー | エラーメッセージを確認 |
| `2` | 引数エラー | `--help` でオプション確認 |
| `3` | playwright-cli未インストール | `npm install -g @playwright/cli` |
| `4` | クロールエラー | 個別ページの取得失敗、タイムアウト等 |

---

## 7. 環境変数

| 変数 | 説明 |
|------|------|
| `DEBUG=1` | デバッグログを出力 |

---

## 8. 注意事項

- クロール対象サイトの利用規約を確認すること
- 過度なリクエストを避けるため `--delay` を適切に設定
- 大規模サイトは `--include` でスコープを限定
- playwright-cliが必要: `npm install -g @playwright/cli`
