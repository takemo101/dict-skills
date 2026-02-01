# link-crawler

技術ドキュメントサイトをクロールし、AIコンテキスト用のMarkdownとして保存するCLIツール。

## 用途

- 最新技術ドキュメントをローカルに保存
- LLMに読み込ませる知識ベース構築
- フレームワークのベストプラクティスを参考に設計相談

## 前提条件

- Bun インストール済み
- playwright-cli: `npm install -g @playwright/cli`

---

## 基本コマンド

```bash
bun run <skill-path>/src/crawl.ts <url> [options]
```

---

## オプション

### クロール制御

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--depth <num>` | `-d` | `1` | 最大クロール深度 |
| `--delay <ms>` | | `500` | リクエスト間隔 |
| `--wait <ms>` | | `2000` | レンダリング待機時間 |
| `--headed` | | `false` | ブラウザ表示 |

### スコープ制御

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `--same-domain` | `true` | 同一ドメインのみ |
| `--include <pattern>` | | 含めるURL（正規表現） |
| `--exclude <pattern>` | | 除外するURL（正規表現） |

### 差分・出力

| オプション | 短縮 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--output <dir>` | `-o` | `./crawled` | 出力先 |
| `--diff` | | `false` | 差分クロール |
| `--no-pages` | | | ページ単位出力無効 |
| `--no-merge` | | | 結合ファイル無効 |
| `--no-chunks` | | | チャンク出力無効 |

---

## 使用例

### 基本

```bash
# 深度2でクロール
bun run <skill-path>/src/crawl.ts https://docs.example.com -d 2

# 特定パスのみ
bun run <skill-path>/src/crawl.ts https://docs.example.com --include "/api/"
```

### 差分クロール

```bash
# 初回
bun run <skill-path>/src/crawl.ts https://docs.example.com -o ./docs -d 3

# 2回目以降（変更のみ更新）
bun run <skill-path>/src/crawl.ts https://docs.example.com -o ./docs -d 3 --diff
```

### AIコンテキスト用

```bash
# 結合ファイルのみ取得
bun run <skill-path>/src/crawl.ts https://docs.example.com --no-pages --no-chunks
# → crawled/full.md のみ出力
```

---

## 出力形式

```
crawled/
├── index.json    # メタデータ・ハッシュ
├── full.md       # 全ページ結合 ★ AIコンテキスト用
├── chunks/       # 見出しベース分割
│   └── ...
├── pages/        # ページ単位
│   └── ...
└── specs/        # API仕様
    └── ...
```

### full.md（推奨）

全ページを `# タイトル` で結合。LLMに直接読み込ませる用途に最適。

```markdown
# Getting Started

導入...

# Installation

インストール...
```

### chunks/*.md

h1見出しを境界として分割。長大ドキュメントの分割に利用。

---

## AIコンテキストとしての利用

### LLMへの資料提供

```bash
# 1. クロール
bun run <skill-path>/src/crawl.ts https://docs.example.com -d 3

# 2. LLMに読み込ませる
cat crawled/full.md | llm "この技術について要約して"
```

### 設計相談

```bash
# Next.jsドキュメント取得
bun run <skill-path>/src/crawl.ts https://nextjs.org/docs -d 2 -o ./nextjs-docs

# 設計相談
cat ./nextjs-docs/full.md | llm "App Routerのベストプラクティスに従って設計して"
```

### 定期更新

```bash
# cron等で定期実行（差分のみ）
bun run <skill-path>/src/crawl.ts https://docs.example.com -o ./docs --diff
```

---

## 終了コード

| コード | 意味 | 対応 |
|--------|------|------|
| `0` | 正常終了 | - |
| `1` | 一般エラー | エラーメッセージ確認 |
| `2` | 引数エラー | `--help` 確認 |
| `3` | playwright-cli未インストール | `npm i -g @playwright/cli` |

---

## 注意事項

- 対象サイトの利用規約を確認
- `--delay` で適切なリクエスト間隔を設定
- 大規模サイトは `--include` でスコープ限定
