# dict-skills

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集し、AIが読みやすいMarkdown形式で保存します。

### 主要機能

- 指定URLからのリンク探索（深さ制限付き）
- 同一ドメイン内の再帰的クローリング
- 収集した情報の構造化（pages/chunks/full.md）
- 差分クロールによる効率的な更新
- AIコンテキスト用の結合Markdown出力

## インストール

### 前提条件

- [Bun](https://bun.sh/) 1.0以上
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli): `npm install -g @playwright/cli`

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/takemo101/dict-skills.git
cd dict-skills

# 依存関係をインストール
cd link-crawler
bun install
```

---

## piスキルとして利用

### インストール

```bash
ln -s /path/to/dict-skills/link-crawler ~/.pi/agent/skills/link-crawler
```

### 利用方法

piで以下のように呼び出せます:

```
/skill:link-crawler
```

または自然言語で依頼:

```
Next.jsのドキュメントをクロールして
```

**注意**: SKILL.mdのフロントマターには `name` と `description` が必須です。

---

## クイックスタート

### 基本的なクロール

```bash
# 深度2で指定URLをクロール（自動的に .context/<サイト名>/ に出力）
bun run link-crawler/src/crawl.ts https://nextjs.org/docs -d 2
# → .context/nextjs-docs/ に出力
```

### 主要オプション

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--output <dir>` | `-o` | `./.context/<サイト名>/` | 出力先 |
| `--diff` | | `false` | 差分クロール（変更のみ更新） |
| `--chunks` | | `false` | チャンク出力を有効化 |

**完全なオプション一覧と詳細な使用例は [CLI仕様書](docs/link-crawler/cli-spec.md) を参照してください。**

### 出力構造

```
.context/
└── <サイト名>/
    ├── index.json    # メタデータ・ハッシュ
    ├── full.md       # 全ページ結合（AIコンテキスト用）
    ├── chunks/       # 見出しベース分割
    └── pages/        # ページ単位
```

## ドキュメント

### 各ドキュメントの役割

| ドキュメント | 対象読者 | 内容 |
|-------------|---------|------|
| [SKILL.md](link-crawler/SKILL.md) | piユーザー | piスキルとしての使い方 |
| [CLI仕様書](docs/link-crawler/cli-spec.md) | CLIユーザー | 完全なオプション一覧・使用例 |
| [設計書](docs/link-crawler/design.md) | 開発者 | アーキテクチャ・データ構造 |
| [ドキュメント目次](docs/link-crawler/README.md) | すべてのユーザー | ドキュメントナビゲーション |

### もっと詳しく知りたい場合

- **使い方を詳しく知りたい** → [CLI仕様書](docs/link-crawler/cli-spec.md)
- **piエージェントで使いたい** → [SKILL.md](link-crawler/SKILL.md)
- **開発に参加したい** → [設計書](docs/link-crawler/design.md)

## ライセンス

MIT
