# Issue #131 Implementation Plan

## 概要
クロール完了後に `.playwright-cli` ディレクトリを自動的にクリーンアップする機能を実装する。また、デバッグ用に `--keep-session` オプションでクリーンアップをスキップできるようにする。

## 影響範囲

### 変更対象ファイル
1. `link-crawler/src/types.ts` - `CrawlConfig` インターフェースに `keepSession` オプションを追加
2. `link-crawler/src/config.ts` - `--keep-session` オプションのパース処理を追加
3. `link-crawler/src/crawl.ts` - CLIオプションに `--keep-session` を追加
4. `link-crawler/src/crawler/fetcher.ts` - `close()` メソッドで `.playwright-cli` ディレクトリのクリーンアップを実装
5. `link-crawler/src/crawler/index.ts` - `Fetcher` インスタンス作成時に `keepSession` 設定を渡す

## 実装ステップ

### Step 1: 型定義の更新
`CrawlConfig` インターフェースに `keepSession: boolean` を追加する。

### Step 2: 設定パース処理の更新
`parseConfig` 関数で `--keep-session` オプションをパースするようにする。

### Step 3: CLIオプションの追加
`crawl.ts` に `--keep-session` オプションを追加する。

### Step 4: Fetcherの更新
`PlaywrightFetcher` クラスに `keepSession` 設定を渡し、`close()` メソッドで `.playwright-cli` ディレクトリを削除するロジックを追加する。

### Step 5: Crawlerの更新
`Crawler` クラスで `Fetcher` を作成する際に `keepSession` 設定を渡すようにする。

## テスト方針

### 単体テスト
1. `config.test.ts` - `--keep-session` オプションのパーステスト
2. `fetcher.test.ts` - `close()` メソッドでのクリーンアップ動作テスト（`keepSession` フラグによる分岐）

### 統合テスト
1. 実際にクロールを実行し、`.playwright-cli` ディレクトリが削除されることを確認
2. `--keep-session` オプション付きで実行し、ディレクトリが残存することを確認

## リスクと対策

### 並行実行時の競合
複数のクローラーが同時に実行されている場合、`.playwright-cli` ディレクトリの削除が競合する可能性がある。

**対策**:
- `rmSync` に `force: true` オプションを使用して、削除に失敗してもエラーを無視する
- セッションIDでフィルタするのではなく、ディレクトリ全体を削除する（各セッションは固有のIDを持つが、ログファイル等は共有される）
- `try-catch` でエラーを捕捉し、クリーンアップ失敗でクロール全体が失敗しないようにする

### デバッグ時の利便性
開発時にはセッションログを確認したい場合がある。

**対策**:
- `--keep-session` オプションを提供し、意図的にクリーンアップをスキップできるようにする

## 実装コード例

### types.ts
```typescript
export interface CrawlConfig {
  // ... existing fields
  keepSession: boolean;
}
```

### config.ts
```typescript
keepSession: Boolean(options.keepSession),
```

### crawl.ts
```typescript
.option("--keep-session", "Keep .playwright-cli directory after crawl (for debugging)", false)
```

### fetcher.ts
```typescript
constructor(private config: CrawlConfig) {
  this.sessionId = `crawl-${Date.now()}`;
}

async close(): Promise<void> {
  try {
    await this.runCli(["close", "--session", this.sessionId]);
  } catch {
    // セッションが既に閉じている場合は無視
  }
  
  // .playwright-cli ディレクトリをクリーンアップ
  if (!this.config.keepSession) {
    try {
      const cliDir = join(process.cwd(), ".playwright-cli");
      if (existsSync(cliDir)) {
        rmSync(cliDir, { recursive: true, force: true });
      }
    } catch {
      // クリーンアップ失敗は無視
    }
  }
}
```

## 完了条件
- [ ] `CrawlConfig` に `keepSession` オプションが追加されている
- [ ] `--keep-session` CLIオプションが動作する
- [ ] デフォルトで `.playwright-cli` ディレクトリが削除される
- [ ] `--keep-session` 付きで実行時はディレクトリが残存する
- [ ] テストが追加・更新され、全てパスする
