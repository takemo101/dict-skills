# Link Crawler 開発ガイド

## 1. 開発環境セットアップ

### 1.1 必須要件

| ツール | バージョン | インストール |
|--------|-----------|-------------|
| Bun | 1.3.x 以上 | `curl -fsSL https://bun.sh/install \| bash` |
| playwright-cli | latest | `npm install -g @playwright/cli` |

### 1.2 セットアップ

```bash
cd link-crawler

# 依存関係インストール
bun install

# 動作確認
bun run dev --help
```

---

## 2. プロジェクト構成

```
link-crawler/
├── SKILL.md                    # piスキル定義
├── src/
│   ├── crawl.ts                # エントリーポイント
│   ├── config.ts               # 設定パース
│   ├── types.ts                # 型定義
│   │
│   ├── crawler/
│   │   ├── index.ts            # CrawlerEngine
│   │   └── fetcher.ts          # PlaywrightFetcher
│   │
│   ├── parser/
│   │   ├── extractor.ts        # HTML → 本文抽出
│   │   ├── converter.ts        # HTML → Markdown
│   │   └── links.ts            # リンク抽出・正規化
│   │
│   ├── diff/
│   │   └── hasher.ts           # SHA256ハッシュ・差分検知
│   │
│   └── output/
│       ├── writer.ts           # ページ書き込み
│       ├── merger.ts           # full.md 生成
│       ├── chunker.ts          # chunks/*.md 生成
│       └── index-writer.ts     # index.json 生成
│
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

---

## 3. 開発ワークフロー

### 3.1 実行

```bash
# 開発モードで実行
bun run dev <url> [options]

# 例
bun run dev https://example.com -d 2 -o ./test-output
```

### 3.2 コード品質

```bash
# Lintチェック
bun run check

# 自動修正
bun run fix

# 型チェック
bun run typecheck
```

### 3.3 ビルド

```bash
# 本番ビルド
bun run build

# ビルド結果確認
ls -la dist/
```

---

## 4. コーディング規約

### 4.1 Biome設定

| 項目 | 設定 |
|------|------|
| インデント | タブ |
| クォート | ダブルクォート |
| セミコロン | 必須 |
| 行幅 | 100文字 |

### 4.2 型安全性

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

### 4.3 インポート順序

Biomeが自動整理:
1. 外部モジュール（node:*, npm packages）
2. 内部モジュール（相対パス）
3. 型インポート

```typescript
import { createHash } from "node:crypto";
import { program } from "commander";

import { Crawler } from "./crawler/index.js";

import type { CrawlConfig } from "./types.js";
```

### 4.4 エラーハンドリング

```typescript
// ✗ エラー握りつぶし禁止
try {
  await fetch(url);
} catch {
  // 何もしない
}

// ✓ 適切なログ出力
try {
  await fetch(url);
} catch (error) {
  console.error(`Fetch failed: ${url}`, error);
  return null;
}
```

### 4.5 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル | kebab-case | `index-writer.ts` |
| クラス | PascalCase | `CrawlerEngine` |
| 関数・変数 | camelCase | `fetchPage` |
| 定数 | UPPER_SNAKE_CASE | `MAX_DEPTH` |
| 型・interface | PascalCase | `CrawlConfig` |

---

## 5. モジュール実装ガイド

### 5.1 新規モジュール追加

1. `src/` 配下に適切なディレクトリにファイル作成
2. 型定義を `types.ts` に追加
3. 必要に応じて `crawl.ts` で呼び出し

### 5.2 Fetcher拡張

`Fetcher` インターフェースを実装:

```typescript
interface Fetcher {
  fetch(url: string): Promise<FetchResult | null>;
  close?(): Promise<void>;
}
```

### 5.3 OutputWriter拡張

新しい出力形式を追加する場合:

1. `output/` に新規ファイル作成
2. `CrawledPage[]` を受け取り、ファイル出力
3. `crawl.ts` の後処理に追加

---

## 6. テスト

### 6.1 手動テスト

```bash
# 静的サイト
bun run dev https://httpbin.org -d 1

# 複雑なサイト
bun run dev https://docs.github.com -d 2 --include "/en/get-started/"

# 差分クロール確認
bun run dev https://example.com -o ./test-diff
bun run dev https://example.com -o ./test-diff --diff
```

### 6.2 デバッグ

```bash
# 詳細ログ
DEBUG=1 bun run dev https://example.com

# ブラウザ表示
bun run dev https://example.com --headed
```

---

## 7. トラブルシューティング

### 7.1 playwright-cliが見つからない

```bash
# 確認
which playwright-cli

# 再インストール
npm install -g @playwright/cli@latest --force
```

### 7.2 Biomeエラー

```bash
# 設定確認
bunx biome check --config-path .

# キャッシュクリア
rm -rf node_modules/.cache
```

### 7.3 型エラーが解消しない

```bash
rm -rf node_modules bun.lockb
bun install
```

### 7.4 ブラウザが起動しない

```bash
# Playwrightブラウザインストール
npx playwright install chromium
```

---

## 8. リリース手順

```bash
# 1. 品質チェック
bun run check
bun run typecheck

# 2. ビルド
bun run build

# 3. 動作確認
./dist/crawl.js https://example.com

# 4. バージョン更新
# package.json の version を更新

# 5. コミット・タグ
git add -A
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

---

## 9. 設計ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [design.md](./design.md) | アーキテクチャ・データ構造・モジュール設計 |
| [cli-spec.md](./cli-spec.md) | CLIオプション・使用例・出力形式 |
