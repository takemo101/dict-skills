# dict-skills

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存する pi スキル

## 概要

このスキルは、指定されたWebページを起点として、リンクを再帰的に辿りながら情報を収集し、AIが読みやすいMarkdown形式で保存します。

## 機能

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

## 使用方法

### 基本的なクロール

```bash
# 深度2で指定URLをクロール
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2
```

### 出力先を指定

```bash
# 出力ディレクトリを指定してクロール
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./my-docs -d 3
```

### 差分クロール（2回目以降）

```bash
# 初回実行
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./docs -d 3

# 2回目以降（変更のみ更新）
bun run link-crawler/src/crawl.ts https://docs.example.com -o ./docs -d 3 --diff
```

### AIコンテキスト用（結合ファイルのみ）

```bash
# デフォルトでは full.md のみ出力
bun run link-crawler/src/crawl.ts https://docs.example.com
# → .context/full.md に全ページが結合されて出力

# 必要な時だけ chunks を有効化
bun run link-crawler/src/crawl.ts https://docs.example.com --chunks
# → .context/full.md + .context/chunks/*.md
```

### 特定パスのみクロール

```bash
# APIドキュメントのみ対象
bun run link-crawler/src/crawl.ts https://docs.example.com --include "/api/"
```

### オプション

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--delay <ms>` | | `500` | リクエスト間隔 |
| `--wait <ms>` | | `2000` | レンダリング待機時間 |
| `--timeout <sec>` | | `30` | リクエストタイムアウト（秒） |
| `--headed` | | `false` | ブラウザ表示 |
| `--output <dir>` | `-o` | `./.context` | 出力先 |
| `--diff` | | `false` | 差分クロール |
| `--no-pages` | | | ページ単位出力無効 |
| `--no-merge` | | | 結合ファイル無効 |
| `--same-domain` | | `true` | 同一ドメインのみフォロー |
| `--no-same-domain` | | | クロスドメインリンクもフォロー |
| `--chunks` | | `false` | チャンク出力を有効化 |
| `--include <pattern>` | | | 含めるURL（正規表現） |
| `--exclude <pattern>` | | | 除外するURL（正規表現） |
| `--keep-session` | | `false` | デバッグ用: .playwright-cliディレクトリを保持 |

### 出力形式

```
.context/
├── index.json    # メタデータ・ハッシュ
├── full.md       # 全ページ結合 ★ AIコンテキスト用
├── chunks/       # 見出しベース分割
└── pages/        # ページ単位
```

## 詳細ドキュメント

- [SKILL.md](link-crawler/SKILL.md) - 詳細な使用方法と設定、技術仕様
- [docs/link-crawler/](docs/link-crawler/) - 設計ドキュメント

## ライセンス

MIT
