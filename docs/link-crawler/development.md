# Link Crawler 開発ガイド

## 開発環境セットアップ

### 必須要件

| ツール | バージョン | インストール |
|--------|-----------|-------------|
| Bun | 1.3.x 以上 | `curl -fsSL https://bun.sh/install \| bash` |

### SPAモード開発時（オプション）

```bash
npm install -g @playwright/cli@latest
```

### セットアップ

```bash
cd link-crawler

# 依存関係インストール
bun install

# 型チェック確認
bun run typecheck

# Linter/Formatter確認
bun run check
```

## ディレクトリ構成

```
link-crawler/
├── src/
│   ├── crawl.ts           # エントリーポイント
│   ├── config.ts          # 設定パース
│   ├── types.ts           # 型定義
│   ├── crawler/
│   │   ├── index.ts       # Crawlerエンジン
│   │   ├── static.ts      # StaticFetcher
│   │   └── spa.ts         # SPAFetcher
│   ├── parser/
│   │   ├── extractor.ts   # コンテンツ抽出
│   │   ├── converter.ts   # Markdown変換
│   │   └── links.ts       # リンク処理
│   └── output/
│       └── writer.ts      # ファイル出力
├── dist/                   # ビルド出力
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

## 開発ワークフロー

### 実行

```bash
# 開発モードで実行
bun run dev https://example.com

# 引数付き
bun run src/crawl.ts https://example.com -d 2 --spa
```

### コード品質

```bash
# Lintチェック
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

## コーディング規約

### Biome設定

| 項目 | 設定 |
|------|------|
| インデント | タブ |
| クォート | ダブルクォート |
| セミコロン | 必須 |
| 行幅 | 100文字 |

### 型安全性ルール

```typescript
// ✗ any禁止
function process(data: any) { }

// ✓ 適切な型を使用
function process(data: unknown) { }

// ✗ non-null assertion 非推奨
const value = obj!.property;

// ✓ 適切なnullチェック
const value = obj?.property ?? defaultValue;
```

### インポート順序（Biome自動整理）

1. 外部モジュール
2. 内部モジュール（相対パス）
3. 型インポート

## テスト

```bash
# 静的サイトテスト
bun run dev https://httpbin.org

# SPAテスト
bun run dev https://demo.playwright.dev/todomvc --spa
```

## トラブルシューティング

### playwright-cli が見つからない

```bash
npm install -g @playwright/cli@latest --force
```

### 型エラーが解消しない

```bash
rm -rf node_modules bun.lockb
bun install
```
