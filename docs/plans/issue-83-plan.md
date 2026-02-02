# Issue #83 Implementation Plan

## 概要

統合テスト（integration test）の実装。`tests/integration/` ディレクトリに `crawler.test.ts` を新規作成し、モックFetcherを使用したCrawlerEngineの統合テストを実装する。

## 影響範囲

### 変更対象ファイル
1. `link-crawler/src/crawler/index.ts` - CrawlerクラスにFetcher注入機能を追加
2. `link-crawler/tests/integration/crawler.test.ts` - 新規作成

### 依存関係
- vitest（既存）
- 既存のCrawler、Fetcher型、CrawlConfig型

## 実装ステップ

### Step 1: Crawlerクラスの修正
Crawlerクラスのコンストラクタにオプショナルなfetcherパラメータを追加し、DI（依存性注入）を可能にする。

```typescript
constructor(private config: CrawlConfig, fetcher?: Fetcher) {
    this.fetcher = fetcher ?? new PlaywrightFetcher(config);
    // ...
}
```

### Step 2: 統合テストの実装
以下のテストケースを含む `crawler.test.ts` を作成：

1. **基本クロールテスト**
   - 単一ページをクロールしてMarkdownに変換
   - 出力ディレクトリとindex.jsonの検証

2. **複数ページクロールテスト**
   - リンクを含むページから再帰的にクロール
   - depth制御の検証

3. **同一ドメインフィルタリングテスト**
   - sameDomainオプションの動作確認

4. **差分モードテスト**
   - diffモードでの変更検出

5. **オプション組み合わせテスト**
   - pages/merge/chunksオプションの組み合わせ

### Step 3: モックFetcherの実装
テスト用のMockFetcherクラスを作成：
- URLパターンに応じたHTMLレスポンスを返す
- テストケースごとにカスタマイズ可能

## テスト方針

### 単体テストとの違い
- 単体テスト：個別モジュールのテスト
- 統合テスト：Crawler → Fetcher → Parser → Writer → Output の一連の流れをテスト

### テストデータ
- テスト用HTML文字列をハードコード
- 実際のHTTPリクエストは行わない（MockFetcher使用）

### クリーンアップ
- 各テスト後に一時出力ディレクトリを削除
- beforeEach/afterEachでのセットアップ・クリーンアップ

## リスクと対策

| リスク | 対策 |
|--------|------|
| Crawlerクラスへの変更が既存機能に影響 | デフォルト値を維持し、既存コードとの互換性を保つ |
| テストの不安定性 | ファイルシステム操作は一時ディレクトリで行い、必ずクリーンアップ |
| テスト実行時間 | MockFetcher使用により、実際のブラウザ操作を回避 |

## 完了条件

- [x] Crawlerクラスがオプショナルなfetcherパラメータを受け入れる
- [x] `tests/integration/crawler.test.ts` が作成される
- [x] 少なくとも3つの統合テストケースが実装される
- [x] `npm test` で統合テストが実行される
- [x] 全テストがパスする
