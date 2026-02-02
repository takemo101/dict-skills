# GitHub Issue #129 Implementation Plan

## 概要

コードベースのメンテナンス性向上のため、リファクタリングを実施します。主な改善点は責務分離、エラーハンドリングの統一、定数の外部化です。

## 影響範囲

### 変更対象ファイル
- `src/crawler/index.ts` - Crawlerクラスの責務分離
- `src/crawler/fetcher.ts` - ランタイム依存の抽象化
- `src/output/writer.ts` - OutputWriterの責務分離
- `src/diff/hasher.ts` - ハッシュ計算の一元化
- 新規: `src/constants.ts` - 定数の集約
- 新規: `src/errors.ts` - カスタムエラークラス
- 新規: `src/crawler/logger.ts` - ログ出力専用クラス
- 新規: `src/crawler/post-processor.ts` - 後処理専用クラス
- 新規: `src/output/index-manager.ts` - インデックス管理専用クラス
- 新規: `src/utils/runtime.ts` - ランタイムアダプター

## 実装ステップ

### Phase 1: 基盤構築（定数・エラー）

#### 1.1 定数ファイルの作成
- ファイル: `src/constants.ts`
- 内容:
  - `PAGE_PREFIX = "page-"`
  - `RESULT_PATTERN = "### Result"`
  - ファイル拡張子パターン
  - `specPatterns` の移動
  - デフォルト設定値

#### 1.2 カスタムエラークラスの作成
- ファイル: `src/errors.ts`
- クラス:
  - `CrawlError` - クロール全般のエラー
  - `FetchError` - フェッチ関連のエラー
  - `ConfigError` - 設定関連のエラー
- 基底クラスで共通のエラー処理を提供

### Phase 2: Crawlerクラスの責務分離

#### 2.1 CrawlLoggerクラスの作成
- ファイル: `src/crawler/logger.ts`
- 責務:
  - クロール開始/終了ログ
  - ページクロールログ（インデント対応）
  - 後処理ログ
  - 統計情報出力

#### 2.2 PostProcessorクラスの作成
- ファイル: `src/crawler/post-processor.ts`
- 責務:
  - Merger呼び出し
  - Chunker呼び出し
  - `buildFullMarkdown` メソッドの移行
  - `loadPageContentsFromDisk` メソッドの移行

#### 2.3 Crawlerクラスの修正
- 依存: `CrawlLogger`, `PostProcessor`
- 責務: クロールロジックのみに集中
- 削除: ログ出力、後処理関連コード

### Phase 3: OutputWriterの責務分離

#### 3.1 IndexManagerクラスの作成
- ファイル: `src/output/index-manager.ts`
- 責務:
  - `index.json` の読み込み/保存
  - 既存ページ情報の管理
  - `existingPages` Mapの管理

#### 3.2 OutputWriterの修正
- `computeHash` メソッドの削除（`diff/hasher.ts` を使用）
- インデックス管理を `IndexManager` に委譲
- `specPatterns` の外部化

### Phase 4: Fetcherのランタイム抽象化

#### 4.1 RuntimeAdapterインターフェースの作成
- ファイル: `src/utils/runtime.ts`
- インターフェース:
  - `spawn(command, args)` - プロセス実行
  - `sleep(ms)` - スリープ

#### 4.2 BunRuntimeAdapterの作成
- Bun固有の実装を提供
- `Bun.spawn` と `Bun.sleep` のラップ

#### 4.3 Fetcherの修正
- `RuntimeAdapter` を依存に追加
- `nodePaths`, `cliPaths` を設定可能に
- `parseCliOutput` をユーティリティ関数に分離
- `process.exit(3)` の削除（エラーを伝播）

### Phase 5: エラーハンドリングの統一

#### 5.1 エントリーポイントの修正
- ファイル: `src/crawl.ts`
- 内容:
  - カスタムエラーのキャッチ
  - 適切な終了コードの設定
  - エラーメッセージの表示

#### 5.2 各クラスのエラー処理修正
- `console.error` / `console.log` の統一
- エラーの伝播（呼び出し元で処理）

## テスト方針

### 既存テストの確認
- `tests/unit/` - ユニットテスト
- `tests/integration/` - 統合テスト

### 新規テストの追加
- `CrawlLogger` のテスト
- `PostProcessor` のテスト
- `IndexManager` のテスト
- `RuntimeAdapter` のモックテスト
- カスタムエラークラスのテスト

### リグレッションテスト
- 既存の統合テストがパスすることを確認
- CLIの動作確認

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存機能の破壊 | 高 | 統合テストでカバー、段階的な実装 |
| 型エラー | 中 | TypeScriptの厳格なチェック、ビルド確認 |
| パフォーマンス劣化 | 低 | ベンチマーク実行、改善前後の比較 |
| テスト失敗 | 中 | テストの並行更新、モックの整備 |

## 実装順序

1. **定数・エラー基盤** → 他の変更の土台
2. **IndexManager** → OutputWriterの修正前に
3. **CrawlLogger** → Crawlerの修正前に
4. **PostProcessor** → Crawlerの修正前に
5. **Crawler** → 依存クラス完成後
6. **OutputWriter** → IndexManager完成後
7. **RuntimeAdapter** → Fetcher修正前に
8. **Fetcher** → 最後（動作中のため）
9. **エントリーポイント** → 全体のエラーハンドリング統一

## コミット計画

```
1. refactor: add constants and error classes
2. refactor: extract IndexManager from OutputWriter
3. refactor: add CrawlLogger for logging
4. refactor: add PostProcessor for post-processing
5. refactor: simplify Crawler class
6. refactor: simplify OutputWriter class
7. refactor: add RuntimeAdapter abstraction
8. refactor: improve Fetcher error handling
9. refactor: unify error handling in entry point
```
