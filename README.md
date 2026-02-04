# dict-skills

> A pi skill for crawling technical documentation sites and saving content as AI-friendly Markdown

[日本語版 (Japanese)](#日本語)

## English

### Overview

This pi skill recursively crawls web pages starting from a specified URL and saves the collected content as structured Markdown optimized for AI context.

**Key Features:**
- Recursive link exploration with depth control
- Same-domain crawling support
- Structured output (pages/chunks/full.md)
- Differential crawling for efficient updates
- Merged Markdown output for AI context

### Quick Start

**Prerequisites:**
- [Bun](https://bun.sh/) 1.0+
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli): `npm install -g @playwright/cli`

**Installation:**
```bash
# Clone the repository
git clone https://github.com/takemo101/dict-skills.git
cd dict-skills

# Install dependencies
cd link-crawler
bun install
```

**Basic Usage:**
```bash
# Crawl a URL with depth 2 (outputs to .context/<site-name>/)
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2
# → outputs to .context/nextjs-docs/
```

### Documentation

| Document | Target Audience | Content |
|----------|----------------|---------|
| [SKILL.md](link-crawler/SKILL.md) | **pi users** | Concise usage as a pi skill |
| [CLI Specification](link-crawler/docs/cli-spec.md) | **CLI users** | Complete option list, examples, output format specifications |
| [Design Document](link-crawler/docs/design.md) | **Developers** | Architecture, data structures, technical specifications |

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For bug reports and feature requests, please check our [Issues](https://github.com/takemo101/dict-skills/issues).

### License

MIT

---

## 日本語

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集し、AIが読みやすいMarkdown形式で保存します。

### 主要機能

- 指定URLからのリンク探索（深さ制限付き）
- 同一ドメイン内の再帰的クローリング
- 収集した情報の構造化（pages/chunks/full.md）
- 差分クロールによる効率的な更新
- AIコンテキスト用の結合Markdown出力

## クイックスタート

### 前提条件

- [Bun](https://bun.sh/) 1.0以上
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli): `npm install -g @playwright/cli`

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/takemo101/dict-skills.git
cd dict-skills

# 依存関係をインストール
cd link-crawler
bun install
```

### 基本的な使い方

```bash
# 深度2で指定URLをクロール（自動的に .context/<サイト名>/ に出力）
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2
# → .context/nextjs-docs/ に出力
```

## ドキュメント

| ドキュメント | 対象読者 | 内容 |
|-------------|---------|------|
| [SKILL.md](link-crawler/SKILL.md) | **piユーザー** | piスキルとしての簡潔な使い方 |
| [CLI仕様書](link-crawler/docs/cli-spec.md) | **CLIユーザー** | 完全なオプション一覧・詳細な使用例・出力形式の仕様 |
| [設計書](link-crawler/docs/design.md) | **開発者** | アーキテクチャ・データ構造・技術仕様 |

### 情報の所在

| 知りたいこと | 参照先 |
|-------------|--------|
| 全オプションの詳細 | [CLI仕様書](link-crawler/docs/cli-spec.md#3-オプション一覧) |
| 使用例・ユースケース | [CLI仕様書](link-crawler/docs/cli-spec.md#4-使用例) |
| 出力形式の仕様 | [CLI仕様書](link-crawler/docs/cli-spec.md#5-出力構造) |
| 終了コード・環境変数 | [CLI仕様書](link-crawler/docs/cli-spec.md#6-終了コード) |
| piスキルとしての使い方 | [SKILL.md](link-crawler/SKILL.md) |
| アーキテクチャ・設計 | [設計書](link-crawler/docs/design.md) |

## コントリビューション

プルリクエストを歓迎します！お気軽にご提案ください。

バグ報告や機能リクエストは [Issues](https://github.com/takemo101/dict-skills/issues) をご確認ください。

## ライセンス

MIT
