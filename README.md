# dict-skills

> A pi skill for crawling technical documentation sites and saving content as AI-friendly Markdown

[日本語版 (Japanese)](#日本語)

## English

### Overview

**link-crawler** recursively crawls web pages starting from a specified URL and saves the collected content as structured Markdown optimized for AI context. Perfect for importing documentation into AI coding assistants.

**Key Features:**
- 🕷️ Recursive link exploration with depth control
- 🎯 Flexible scope control (same-domain, include/exclude patterns)
- 📝 AI-optimized Markdown output (full.md for LLM context)
- 🔄 Differential crawling for efficient updates
- ⚡ Fast processing with Playwright + Bun

### Quick Start

See the [link-crawler README](link-crawler/README.md) for installation and setup instructions.

```bash
# Basic crawl example
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2
```

### 📚 Documentation Guide

**Choose your path based on your role:**

| I want to... | Read this |
|-------------|-----------|
| Use as a **pi skill** | [SKILL.md](link-crawler/SKILL.md) |
| Use as a **CLI tool** | [link-crawler/README.md](link-crawler/README.md) |
| See **all CLI options** | [CLI Specification](docs/cli-spec.md) |
| **Develop/contribute** | [Development Guide](docs/development.md) |
| Understand **architecture** | [Design Document](docs/design.md) |
| **Maintain** the project | [Maintenance Guide](docs/maintenance.md) |

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For bug reports and feature requests, please check our [Issues](https://github.com/takemo101/dict-skills/issues).

### License

MIT

---

## 日本語

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル

### 概要

**link-crawler** は、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集し、AIコーディングアシスタントへのインポートに最適な構造化Markdown形式で保存します。

**主要機能:**
- 🕷️ 指定URLからのリンク探索（深さ制限付き）
- 🎯 柔軟なスコープ制御（同一ドメイン、include/exclude パターン）
- 📝 AI最適化Markdown出力（LLMコンテキスト用のfull.md）
- 🔄 差分クロールによる効率的な更新
- ⚡ Playwright + Bunによる高速処理

### クイックスタート

インストールとセットアップについては [link-crawler README](link-crawler/README.md) を参照してください。

```bash
# 基本的なクロール例
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2
```

### 📚 ドキュメントガイド

**あなたの目的に応じてお選びください:**

| こんな場合は | このドキュメントを読む |
|-------------|---------------------|
| **piスキル**として使いたい | [SKILL.md](link-crawler/SKILL.md) |
| **CLIツール**として使いたい | [link-crawler/README.md](link-crawler/README.md) |
| **全オプション**を知りたい | [CLI仕様書](docs/cli-spec.md) |
| **開発・貢献**したい | [開発ガイド](docs/development.md) |
| **アーキテクチャ**を理解したい | [設計書](docs/design.md) |
| プロジェクトを**運用**したい | [メンテナンスガイド](docs/maintenance.md) |

## コントリビューション

プルリクエストを歓迎します！お気軽にご提案ください。

バグ報告や機能リクエストは [Issues](https://github.com/takemo101/dict-skills/issues) をご確認ください。

## ライセンス

MIT
