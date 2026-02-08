# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール。

## 特徴

- 🕷️ **再帰的なWebクロール** - 深度指定可能なリンク追跡
- 📝 **AIコンテキスト用出力** - Markdown形式で構造化された情報
- 🔄 **差分クロール対応** - 変更ページのみ効率的に更新
- 🎯 **スコープ制御** - include/exclude パターンによる柔軟なフィルタリング
- 🌐 **クロスドメイン対応** - 同一ドメイン制限の有効/無効化
- ⚡ **高速処理** - Playwright + Bunによる効率的なクロール

## インストール

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

```bash
# 依存関係のインストール
bun install

# playwright-cli のインストール（未インストールの場合）
npm install -g @playwright/cli
```

**前提条件**:
- [Bun](https://bun.sh/) 1.0以上、または Node.js 18.0以上
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli)

## 使用方法

### 基本的な使い方

```bash
bun run src/crawl.ts <url> [options]
```

### 実用例

```bash
# Next.jsドキュメントをクロール（深度2）
bun run src/crawl.ts https://nextjs.org/docs -d 2

# 差分クロール（変更ページのみ更新）
bun run src/crawl.ts https://nextjs.org/docs -d 2 --diff

# カスタム出力先を指定
bun run src/crawl.ts https://example.com -o ./my-output

# URLパターンで絞り込み
bun run src/crawl.ts https://nextjs.org/docs \
  --include "/docs/app/" \
  --exclude "/api-reference/"
```

### 主要オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-d, --depth <num>` | 最大クロール深度 | `1` |
| `--max-pages <num>` | 最大クロールページ数（0=無制限） | 無制限 |
| `-o, --output <dir>` | 出力ディレクトリ | `./.context/<サイト名>/` |
| `--diff` | 差分クロール（変更ページのみ） | `false` |
| `--same-domain` | 同一ドメインのみ追跡 | `true` |
| `--include <pattern>` | 含めるURLパターン（正規表現） | - |
| `--exclude <pattern>` | 除外するURLパターン（正規表現） | - |
| `--delay <ms>` | リクエスト間隔 | `500` |

**完全なオプション一覧は [CLI仕様書](../docs/cli-spec.md) を参照してください。**

## 出力ファイル

クロール後、以下のファイルが生成されます：

| ファイル | 用途 |
|---------|------|
| `full.md` | 全ページを結合したMarkdown（**AIコンテキスト用**） |
| `pages/*.md` | ページ単位のMarkdown |
| `chunks/*.md` | 見出しベースで分割されたMarkdown（`--chunks`有効時） |
| `index.json` | メタデータ・ハッシュ・クロール情報 |

## ドキュメント

| ドキュメント | 対象読者 | 内容 |
|-------------|---------|------|
| [SKILL.md](./SKILL.md) | **piユーザー** | piスキルとしての使い方・オプション一覧 |
| [CLI仕様書](../docs/cli-spec.md) | **CLIユーザー** | 完全なオプション一覧・詳細な使用例・出力形式 |
| [設計書](../docs/design.md) | **開発者** | アーキテクチャ・データ構造・技術仕様 |

## 開発

### テスト実行

```bash
# 全テスト実行
bun run test

# ウォッチモード
bun run test:watch

# カバレッジ付き
bun run test:coverage
```

### Lint・フォーマット

```bash
# チェック
bun run check

# 自動修正
bun run fix

# 型チェック
bun run typecheck
```

### ビルド

```bash
bun run build
```

## ライセンス

MIT

## リポジトリ

[takemo101/dict-skills](https://github.com/takemo101/dict-skills) - link-crawler

## 作者

takemo101
