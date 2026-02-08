---
name: link-crawler
description: 技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール
---

# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル。

## セットアップ

### ワンコマンドセットアップ（推奨）

```bash
./install.sh
```

このスクリプトは以下を自動で行います：
- Bun/Node.jsの確認
- playwright-cliのインストール（必要な場合）
- 依存関係のインストール
- 動作確認

### 手動セットアップ

このスキルディレクトリに移動して依存関係をインストールします：

```bash
bun install
```

**前提条件**: [@playwright/cli](https://www.npmjs.com/package/@playwright/cli) が必要です
- インストール: `npm install -g @playwright/cli`
- または、`install.sh` を実行すると自動的にインストールされます

## ⚠️ 出力先の制約（重要）

`-o` オプションで**必ずプロジェクトルート（piを起動したディレクトリ）配下**に出力すること。
スキルディレクトリ内に `.context/` を作成してはならない。

```bash
# ✅ 正しい: プロジェクトルートの .context/ に出力
bun run src/crawl.ts <url> -o <PROJECT_ROOT>/.context/<site-name>

# ❌ 間違い: -o を省略するとスキルディレクトリ内に作成される
bun run src/crawl.ts <url>
```

## 基本的な使い方

スキルディレクトリ内で実行（`-o` で出力先を必ず指定）：

```bash
bun run src/crawl.ts <url> -o <PROJECT_ROOT>/.context/<site-name> [options]
```

### 主要オプション

- `-d, --depth <num>`: 最大クロール深度（デフォルト: 1）
- `-o, --output <dir>`: 出力ディレクトリ（**必須**: プロジェクトルート配下を指定）
- `--diff`: 差分クロール（変更ページのみ更新）

> **📖 完全なオプション一覧**: [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md#3-オプション一覧) を参照

## piエージェントでの使用例

```bash
# Next.jsドキュメントをクロール（PROJECT_ROOT = piの起動ディレクトリ）
bun run src/crawl.ts https://nextjs.org/docs -d 2 -o /path/to/project/.context/nextjs-docs

# → /path/to/project/.context/nextjs-docs/full.md が生成され、piエージェントのコンテキストとして利用可能
```

## 出力ファイル

クロール後、以下のファイルが生成されます：

| ファイル | 用途 |
|---------|------|
| `full.md` | 全ページ結合（**AIコンテキスト用**） |
| `pages/*.md` | ページ単位 |
| `index.json` | メタデータ・ハッシュ |

> **📖 詳細な出力構造**: [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md#5-出力構造) を参照

## 参考リンク

| ドキュメント | 内容 |
|-------------|------|
| [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md) | 完全なオプション一覧・使用例・出力形式の詳細 |
| [設計書](https://github.com/takemo101/dict-skills/blob/main/docs/design.md) | アーキテクチャ・データ構造・技術仕様 |
