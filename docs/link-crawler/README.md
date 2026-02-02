# Link Crawler v2.0

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール。

## 概要

| 項目 | 説明 |
|------|------|
| 目的 | 技術ドキュメントをLLM入力用Markdownとして取得 |
| 主要機能 | SPA対応クロール、差分更新、結合出力、チャンク分割 |
| 対象 | AIエージェント、開発者 |

## 主要機能

| 機能 | 説明 |
|------|------|
| **playwright-cliクロール** | SPA/静的サイト両対応 |
| **差分クロール** | ハッシュベースで変更ページのみ更新 |
| **結合出力 (full.md)** | 全ページを1ファイルに結合、AIコンテキストに最適 |
| **チャンク分割** | 見出しベースで分割、RAG等に利用 |
| **API仕様検出** | OpenAPI/GraphQL/JSON Schema自動検出 |

## クイックスタート

### 方法1: install.sh を使用（推奨）

```bash
cd link-crawler
./install.sh

# クロール実行
bun run dev https://docs.example.com -d 2

# 出力確認
cat .context/full.md
```

### 方法2: 手動インストール

```bash
cd link-crawler
bun install

# クロール実行
bun run dev https://docs.example.com -d 2

# 出力確認
cat .context/full.md
```

## piスキル統合

グローバルスキルとして登録:

```bash
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [設計書](./design.md) | アーキテクチャ・データ構造・モジュール設計 |
| [CLI仕様](./cli-spec.md) | オプション・使用例・出力形式 |
| [開発ガイド](./development.md) | 開発環境・コーディング規約 |
| [SKILL.md](../../link-crawler/SKILL.md) | piエージェント向けスキル定義 |
