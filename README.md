# dict-skills

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集し、AIが読みやすいMarkdown形式で保存します。

## 機能

- 指定URLからのリンク探索（深さ制限付き）
- 同一ドメイン内の再帰的クローリング
- 収集した情報の構造化（pages/chunks/full.md）
- 差分クロールによる効率的な更新
- AIコンテキスト用の結合Markdown出力

## インストール

### 前提条件

- [Bun](https://bun.sh/) 1.0以上
- [playwright-cli](https://playwright.dev/): `npm install -g @playwright/cli`

### セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd dict-skills

# 依存関係をインストール
cd link-crawler
bun install
```

## 使用方法

### 基本コマンド

```bash
bun run link-crawler/src/crawl.ts <url> [options]
```

### オプション

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--delay <ms>` | | `500` | リクエスト間隔 |
| `--wait <ms>` | | `2000` | レンダリング待機時間 |
| `--headed` | | `false` | ブラウザ表示 |
| `--output <dir>` | `-o` | `./crawled` | 出力先 |
| `--diff` | | `false` | 差分クロール |
| `--include <pattern>` | | | 含めるURL（正規表現） |
| `--exclude <pattern>` | | | 除外するURL（正規表現） |

### 使用例

```bash
# 基本（深度2でクロール）
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2

# 特定パスのみ
bun run link-crawler/src/crawl.ts https://docs.example.com --include "/api/"

# AIコンテキスト用（結合ファイルのみ）
bun run link-crawler/src/crawl.ts https://docs.example.com --no-pages --no-chunks
```

### 出力形式

```
crawled/
├── index.json    # メタデータ・ハッシュ
├── full.md       # 全ページ結合 ★ AIコンテキスト用
├── chunks/       # 見出しベース分割
└── pages/        # ページ単位
```

## 詳細ドキュメント

- [SKILL.md](link-crawler/SKILL.md) - 詳細な使用方法と設定
- [docs/link-crawler/](docs/link-crawler/) - 設計ドキュメント

## ライセンス

MIT
