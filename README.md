# dict-skills

対象ページからリンクを辿って情報を収集する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集します。

## 機能

- 指定URLからのリンク探索
- 深さ制限付きクローリング
- 収集した情報の構造化

## インストール

```bash
cd link-crawler
bun install
```

## 使用方法

```bash
# 基本的なクロール
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2

# 結合ファイルのみ出力
bun run link-crawler/src/crawl.ts https://docs.example.com --no-pages --no-chunks
```

詳細は [link-crawler/SKILL.md](./link-crawler/SKILL.md) を参照。

## ライセンス

MIT
