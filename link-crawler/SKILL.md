---
name: link-crawler
description: 技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール
---

# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール。

## piスキルとしての利用

このスキルをpiエージェントで使うことで、最新の技術ドキュメントを取得し、設計相談やコード生成の参考資料として活用できます。

### 前提条件

- Bun インストール済み
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli): `npm install -g @playwright/cli`

### セットアップ

```bash
cd link-crawler
bun install
```

---

## 基本的な使い方

```bash
bun run link-crawler/src/crawl.ts <url> [options]
```

---

## 主要オプション

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--output <dir>` | `-o` | `./.context/<サイト名>/` | 出力先 |
| `--diff` | | `false` | 差分クロール（変更のみ更新） |
| `--chunks` | | `false` | チャンク出力を有効化 |
| `--include <pattern>` | | | 含めるURLパターン（正規表現） |
| `--exclude <pattern>` | | | 除外するURLパターン（正規表現） |

**完全なオプション一覧は [CLI仕様書](../docs/link-crawler/cli-spec.md) を参照してください。**

---

## piエージェントでの使用例

### シナリオ1: フレームワークのドキュメントを参照しながら設計

```bash
# 1. Next.jsドキュメントをクロール
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2

# 2. piエージェントで利用
# → .context/nextjs-docs/full.md が自動的にコンテキストとして利用可能
# → "Next.jsのApp Routerのベストプラクティスに従って設計して"と依頼
```

### シナリオ2: APIドキュメントのみを取得

```bash
# 特定パス配下のみクロール
bun run link-crawler/src/crawl.ts https://docs.example.com \
  --include "/api/" -d 3
```

### シナリオ3: 定期的に最新ドキュメントを取得

```bash
# 差分クロールで変更部分のみ更新
bun run link-crawler/src/crawl.ts https://docs.example.com \
  -o ./docs --diff
```

**その他の使用例は [CLI仕様書](../docs/link-crawler/cli-spec.md) を参照してください。**

---

## 出力形式

### ディレクトリ構造

```
.context/
└── <サイト名>/    # URLから自動生成（例: nextjs-docs）
    ├── index.json    # メタデータ・ハッシュ
    ├── full.md       # 全ページ結合（AIコンテキスト用）
    ├── chunks/       # 見出しベース分割（--chunks有効時）
    └── pages/        # ページ単位
```

### AIコンテキストとしての利用

**full.md** が最も重要な出力ファイルで、全ページを1つのMarkdownに結合します。このファイルをpiエージェントに読み込ませることで、技術ドキュメント全体をコンテキストとして利用できます。

**詳細な仕様は [CLI仕様書](../docs/link-crawler/cli-spec.md) または [設計書](../docs/link-crawler/design.md) を参照してください。**

---

## 参考情報

### より詳しく知りたい場合

| ドキュメント | 内容 |
|-------------|------|
| [CLI仕様書](../docs/link-crawler/cli-spec.md) | 完全なオプション一覧・使用例・出力形式 |
| [設計書](../docs/link-crawler/design.md) | アーキテクチャ・データ構造・技術仕様 |

### 注意事項

- 対象サイトの利用規約を確認してください
- `--delay` で適切なリクエスト間隔を設定してください
- 大規模サイトは `--include` でスコープを限定することを推奨します
