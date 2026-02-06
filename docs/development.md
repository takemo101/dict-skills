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
│   ├── constants.ts            # 定数定義
│   ├── errors.ts               # エラークラス
│   │
│   ├── crawler/
│   │   ├── index.ts            # CrawlerEngine
│   │   ├── fetcher.ts          # PlaywrightFetcher
│   │   ├── logger.ts           # ログ出力
│   │   └── post-processor.ts   # 後処理
│   │
│   ├── parser/
│   │   ├── extractor.ts        # HTML → 本文抽出
│   │   ├── converter.ts        # HTML → Markdown
│   │   └── links.ts            # リンク抽出・正規化
│   │
│   ├── diff/
│   │   ├── index.ts            # バレルエクスポート
│   │   └── hasher.ts           # SHA256ハッシュ・差分検知
│   │
│   ├── output/
│   │   ├── writer.ts           # ページ書き込み
│   │   ├── merger.ts           # full.md 生成
│   │   ├── chunker.ts          # chunks/*.md 生成
│   │   └── index-manager.ts    # index.json管理
│   │
│   ├── types/
│   │   └── turndown-plugin-gfm.d.ts  # Turndown型定義
│   │
│   └── utils/
│       ├── runtime.ts          # ランタイムアダプター
│       └── site-name.ts        # サイト名生成
│
├── tests/                       # テストファイル
│   ├── unit/                    # ユニットテスト
│   │   ├── chunker.test.ts
│   │   ├── config.test.ts
│   │   ├── converter.test.ts
│   │   ├── crawler.test.ts
│   │   ├── errors.test.ts
│   │   ├── extractor.test.ts
│   │   ├── fetcher.test.ts
│   │   ├── hasher.test.ts
│   │   ├── index-manager.test.ts
│   │   ├── links.test.ts
│   │   ├── logger.test.ts
│   │   ├── merger.test.ts
│   │   ├── post-processor.test.ts
│   │   ├── runtime.test.ts
│   │   ├── site-name.test.ts
│   │   └── writer.test.ts
│   └── integration/             # 統合テスト
│       └── crawler.test.ts
│
├── vitest.config.ts             # Vitest設定
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

### 3.3 テスト

```bash
# 全テスト実行
bun run test

# ウォッチモード
bun run test:watch

# カバレッジ
bun run test:coverage

# 特定ファイルのみ
bun run test hasher
```

### 3.4 ビルド

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
| ファイル | kebab-case | `writer.ts` |
| クラス | PascalCase | `CrawlerEngine` |
| 関数・変数 | camelCase | `fetchPage` |
| 定数 | UPPER_SNAKE_CASE | `MAX_DEPTH` |
| 型・interface | PascalCase | `CrawlConfig` |

---

## 5. テスト

### 5.1 テスト方針

| レイヤー | 対象 | テスト方法 |
|---------|------|-----------|
| Unit | Hasher, Merger, Chunker, Converter, Links | 純粋関数のI/Oテスト |
| Integration | CrawlerEngine | モックFetcherでE2E風テスト |

### 5.2 Vitest設定

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/crawl.ts"], // CLI エントリーポイント除外
    },
  },
});
```

### 5.3 ユニットテスト例

```typescript
// tests/unit/hasher.test.ts
import { describe, it, expect } from "vitest";
import { computeHash, Hasher } from "../../src/diff/hasher";

describe("computeHash", () => {
  it("同一コンテンツは同一ハッシュ", () => {
    const hash1 = computeHash("hello");
    const hash2 = computeHash("hello");
    expect(hash1).toBe(hash2);
  });

  it("異なるコンテンツは異なるハッシュ", () => {
    const hash1 = computeHash("hello");
    const hash2 = computeHash("world");
    expect(hash1).not.toBe(hash2);
  });
});

describe("Hasher", () => {
  it("新規URLはchanged=true", () => {
    const hasher = new Hasher(new Map());
    expect(hasher.isChanged("https://example.com", "abc123")).toBe(true);
  });

  it("同一ハッシュはchanged=false", () => {
    const existing = new Map([["https://example.com", "abc123"]]);
    const hasher = new Hasher(existing);
    expect(hasher.isChanged("https://example.com", "abc123")).toBe(false);
  });
});
```

```typescript
// tests/unit/chunker.test.ts
import { describe, it, expect } from "vitest";
import { Chunker } from "../../src/output/chunker";

describe("Chunker", () => {
  it("h1で分割", () => {
    const input = `# Title1

Content1

# Title2

Content2`;

    const chunker = new Chunker();
    const chunks = chunker.chunk(input);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain("Title1");
    expect(chunks[1]).toContain("Title2");
  });

  it("h1がない場合は1チャンク", () => {
    const input = `## Section1

Content`;

    const chunker = new Chunker();
    const chunks = chunker.chunk(input);

    expect(chunks).toHaveLength(1);
  });
});
```

### 5.4 統合テスト例

```typescript
// tests/integration/crawler.test.ts を参照
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Crawler } from "../../src/crawler/index.js";
import type { CrawlConfig, Fetcher, FetchResult } from "../../src/types.js";

describe("CrawlerEngine Integration", () => {
  describe("E2E-style crawling with mock Fetcher", () => {
    it("should crawl single page and generate output files", async () => {
      // モックFetcherを使用したE2Eテスト
      // ...
    });
  });
});
```

### 5.5 カバレッジ目標

| モジュール | 目標 |
|-----------|------|
| diff/hasher.ts | 90%+ |
| output/merger.ts | 90%+ |
| output/chunker.ts | 90%+ |
| parser/converter.ts | 80%+ |
| parser/links.ts | 80%+ |
| crawler/index.ts | 70%+ |

---

## 6. モジュール実装ガイド

### 6.1 新規モジュール追加

1. `src/` 配下に適切なディレクトリにファイル作成
2. 型定義を `types.ts` に追加
3. 対応するテストを `tests/unit/` に作成
4. 必要に応じて `crawl.ts` で呼び出し

### 6.2 Fetcher拡張

`Fetcher` インターフェースを実装:

```typescript
interface Fetcher {
  fetch(url: string): Promise<FetchResult | null>;
  close?(): Promise<void>;
}
```

### 6.3 OutputWriter拡張

新しい出力形式を追加する場合:

1. `output/` に新規ファイル作成
2. `CrawledPage[]` を受け取り、ファイル出力
3. `tests/unit/` にテスト追加
4. `crawl.ts` の後処理に追加

---

## 7. 手動テスト

### 7.1 基本動作確認

```bash
# 静的サイト
bun run dev https://httpbin.org -d 1

# 複雑なサイト
bun run dev https://docs.github.com -d 2 --include "/en/get-started/"

# 差分クロール確認
bun run dev https://example.com -o ./test-diff
bun run dev https://example.com -o ./test-diff --diff
```

### 7.2 デバッグ

```bash
# 詳細ログ
DEBUG=1 bun run dev https://example.com

# ブラウザ表示
bun run dev https://example.com --headed
```

---

## 8. トラブルシューティング

### 8.1 playwright-cliが見つからない

```bash
# 確認
which playwright-cli

# 再インストール
npm install -g @playwright/cli@latest --force
```

### 8.2 Biomeエラー

```bash
# 設定確認
bunx biome check --config-path .

# キャッシュクリア
rm -rf node_modules/.cache
```

### 8.3 型エラーが解消しない

```bash
rm -rf node_modules bun.lock
bun install
```

### 8.4 ブラウザが起動しない

```bash
# Playwrightブラウザインストール
npx playwright install chromium
```

### 8.5 テストが失敗する

```bash
# キャッシュクリア
rm -rf node_modules/.vitest

# 依存関係再インストール
rm -rf node_modules bun.lock
bun install
```

---

## 9. リリース手順

```bash
# 1. テスト実行
bun run test

# 2. 品質チェック
bun run check
bun run typecheck

# 3. ビルド
bun run build

# 4. 動作確認
./dist/crawl.js https://example.com

# 5. バージョン更新
# package.json の version を更新（crawl.ts は自動的に反映されます）

# 6. コミット・タグ
git add -A
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

---

## 10. 設計ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [design.md](./design.md) | アーキテクチャ・データ構造・モジュール設計 |
| [cli-spec.md](./cli-spec.md) | CLIオプション・使用例・出力形式 |
