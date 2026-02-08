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

**前提条件**: [playwright-cli](https://www.npmjs.com/package/@playwright/cli) が必要です
- インストール: `npm install -g @playwright/cli`
- または、`install.sh` を実行すると自動的にインストールされます

## 基本的な使い方

スキルディレクトリ内で実行：

```bash
bun run src/crawl.ts <url> [options]
```

### オプション一覧

主要なオプション：
- `-d, --depth <num>`: 最大クロール深度（デフォルト: 1、上限: 10）
- `--max-pages <num>`: 最大クロールページ数（0 = 無制限）
- `-o, --output <dir>`: 出力ディレクトリ
- `--diff`: 差分クロール（変更ページのみ更新）
- `--chunks`: チャンク分割出力を有効化
- `--same-domain`: 同一ドメインのみクロール（デフォルト: true）
- `--include <pattern>`: 含めるURLパターン（正規表現）
- `--exclude <pattern>`: 除外するURLパターン（正規表現）
- `--no-robots`: robots.txt を無視（非推奨、開発・テスト用）

**完全なオプション一覧は [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md) を参照してください。**

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
| `specs/*.yaml` | API仕様ファイル（検出時のみ） |
| `index.json` | メタデータ・ハッシュ |

**詳細な仕様は [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md) を参照してください。**

## 参考リンク

| ドキュメント | 内容 |
|-------------|------|
| [CLI仕様書](https://github.com/takemo101/dict-skills/blob/main/docs/cli-spec.md) | 完全なオプション一覧・使用例・出力形式の詳細 |
| [設計書](https://github.com/takemo101/dict-skills/blob/main/docs/design.md) | アーキテクチャ・データ構造・技術仕様 |
