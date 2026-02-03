---
name: link-crawler
description: 技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール
---

# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル。

## セットアップ

```bash
cd link-crawler
bun install
```

**前提条件**: [playwright-cli](https://www.npmjs.com/package/@playwright/cli) が必要: `npm install -g @playwright/cli`

## 基本的な使い方

```bash
bun run link-crawler/src/crawl.ts <url> [options]
```

### よく使うオプション

| オプション | 説明 |
|-----------|------|
| `-d <num>` | 最大クロール深度（デフォルト: 1） |
| `-o <dir>` | 出力先（デフォルト: `./.context/<サイト名>/`） |
| `--diff` | 差分クロール（変更のみ更新） |
| `--chunks` | チャンク出力を有効化 |

**完全なオプション一覧は [CLI仕様書](../docs/link-crawler/cli-spec.md) を参照してください。**

## piエージェントでの使用例

```bash
# Next.jsドキュメントをクロール
bun run src/crawl.ts https://nextjs.org/docs -d 2

# → .context/nextjs-docs/full.md が生成され、piエージェントのコンテキストとして利用可能
```

## 出力ファイル

クロール後、以下のファイルが生成されます：

| ファイル | 用途 |
|---------|------|
| `full.md` | 全ページ結合（AIコンテキスト用） |
| `chunks/*.md` | 見出しベース分割（`--chunks`有効時） |
| `pages/*.md` | ページ単位 |
| `index.json` | メタデータ・ハッシュ |

**詳細な仕様は [CLI仕様書](../docs/link-crawler/cli-spec.md) を参照してください。**

## 参考リンク

| ドキュメント | 内容 |
|-------------|------|
| [CLI仕様書](../docs/link-crawler/cli-spec.md) | 完全なオプション一覧・使用例・出力形式の詳細 |
| [設計書](../docs/link-crawler/design.md) | アーキテクチャ・データ構造・技術仕様 |
