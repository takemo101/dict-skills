# dict-skills

対象ページからリンクを辿って情報を収集する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集します。

## 機能

- 指定URLからのリンク探索
- 深さ制限付きクローリング
- 収集した情報の構造化
- 差分クロール（変更のみ更新）
- AI向け結合ファイル出力

## インストール

```bash
cd link-crawler
bun install
```

### 前提条件

- [Bun](https://bun.sh/) 1.3.x 以上
- playwright-cli: `npm install -g @playwright/cli`

## 使用方法

```bash
# 基本的なクロール
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2

# 出力先を指定
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./output

# AIコンテキスト用（結合ファイルのみ）
bun run link-crawler/src/crawl.ts https://docs.example.com --no-pages --no-chunks
```

詳細は [link-crawler/SKILL.md](./link-crawler/SKILL.md) を参照。

## ライセンス

MIT
