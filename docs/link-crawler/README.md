# Link Crawler v2.0

技術ドキュメントサイトを再帰的にクロールし、Markdown形式で保存するCLIツール。

## 概要

| 項目 | 説明 |
|------|------|
| 目的 | 技術ドキュメントサイトのコンテンツをローカルMarkdownとして取得 |
| 主要機能 | HTML→Markdown変換、再帰クロール、SPA対応 |
| 対象ユーザー | AIエージェント、開発者 |

## 主要機能

- **静的サイトクロール**: fetch + JSDOM による高速クロール
- **SPAサイト対応**: playwright-cli による動的コンテンツ取得
- **Markdown変換**: Readability + Turndown による高品質変換
- **API仕様検出**: OpenAPI/GraphQL/JSON Schema の自動検出・保存

## piスキル統合

pi-monoでグローバルスキルとして利用可能。

```bash
# グローバル登録
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

## ドキュメント一覧

| ドキュメント | 説明 |
|-------------|------|
| [設計書](./design.md) | アーキテクチャ・技術スタック・スキル統合 |
| [CLI仕様](./cli-spec.md) | コマンドライン引数・オプション |
| [開発ガイド](./development.md) | 開発環境セットアップ・コーディング規約 |
