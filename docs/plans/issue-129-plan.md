# Issue #129 実装計画: リファクタリング - コードベースの改善

## 概要

コードベースのメンテナンス性向上のため、責務分離・定数の外部化・エラーハンドリング統一を実施する。

---

## 実装ステータス

### ✅ 1. Crawler クラスの責務分離

**状況**: 完了

| コンポーネント | 責務 | ファイル |
|--------------|------|---------|
| `Crawler` | クロールロジックのみ | `crawler/index.ts` |
| `CrawlLogger` | ログ出力の責務 | `crawler/logger.ts` |
| `PostProcessor` | Merger/Chunker呼び出しの責務 | `crawler/post-processor.ts` |
| `IndexManager` | ページ内容の管理・index.json操作 | `output/index-manager.ts` |

**変更内容**:
- `Crawler`クラスからログ出力を`CrawlLogger`に分離
- `buildFullMarkdown`と`loadPageContentsFromDisk`を`PostProcessor`に移動
- `OutputWriter`からインデックス管理を`IndexManager`に分離

---

### ✅ 2. OutputWriter の責務分離

**状況**: 完了

**改善内容**:
- ✅ ハッシュ計算は`diff/hasher.ts`の`computeHash`を使用（重複解消）
- ✅ インデックス管理を`IndexManager`に統一
- ✅ `SPEC_PATTERNS`と`FILENAME`を`constants.ts`からインポート

---

### ✅ 3. Fetcher のパス検索ロジック改善

**状況**: 完了

**改善内容**:
- ✅ `RuntimeAdapter`インターフェースを導入
  - `BunRuntimeAdapter`: Bun.runtime用実装
  - `NodeRuntimeAdapter`: Node.js互換実装
- ✅ `PlaywrightPathConfig`でパス候補を設定可能に
- ✅ `parseCliOutput`を独立したユーティリティ関数としてエクスポート

---

### ✅ 4. 設定・定数の外出し

**状況**: 完了

**作成した定数** (`constants.ts`):

```typescript
DEFAULTS          // デフォルト設定値
FILENAME          // ファイル名・プレフィックス
PATTERNS          // 正規表現パターン
SPEC_PATTERNS     // API仕様ファイルパターン
PATHS             // 実行ファイルパス候補
EXIT_CODES        // 終了コード
```

---

### ✅ 5. エラーハンドリングの統一

**状況**: 完了

**作成したカスタムエラークラス** (`errors.ts`):

| エラークラス | 用途 | コード |
|------------|------|-------|
| `CrawlError` | 基底エラークラス | - |
| `FetchError` | フェッチ関連エラー | `FETCH_ERROR` |
| `ConfigError` | 設定関連エラー | `CONFIG_ERROR` |
| `FileError` | ファイル入出力エラー | `FILE_ERROR` |
| `DependencyError` | 依存関係エラー | `DEPENDENCY_ERROR` |
| `TimeoutError` | タイムアウトエラー | `TIMEOUT_ERROR` |

**改善内容**:
- ✅ エラーは呼び出し元に伝播し、`crawl.ts`エントリーポイントで処理
- ✅ `EXIT_CODES`定数を使用（マジックナンバー排除）

---

### ✅ 6. テストカバレッジの向上

**状況**: 完了

**テスト状況**:
- 総テスト数: **224 tests**
- テストファイル: 12 files
- すべてのテストがパス

**テストカバレッジ**:
- Unit tests: `hasher`, `writer`, `chunker`, `merger`, `fetcher`, `config`, `links`, `extractor`, `converter`
- Integration tests: `crawler`

**依存性注入パターン**:
- `Fetcher`インターフェースを定義し、テスト時にモック可能に
- `RuntimeAdapter`インターフェースでランタイム依存を抽象化

---

## 影響範囲

### 変更ファイル

```
src/
├── constants.ts              # 新規: 定数集約
├── errors.ts                 # 新規: カスタムエラークラス
├── crawl.ts                  # 修正: エントリーポイントのエラーハンドリング
├── config.ts                 # 修正: constants.tsからDEFAULTSを使用
├── crawler/
│   ├── index.ts              # 修正: 責務分離後のCrawlerクラス
│   ├── logger.ts             # 新規: ログ出力クラス
│   ├── post-processor.ts     # 新規: 後処理クラス
│   └── fetcher.ts            # 修正: RuntimeAdapter対応
├── output/
│   ├── writer.ts             # 修正: IndexManagerを使用
│   └── index-manager.ts      # 新規: インデックス管理クラス
├── diff/
│   └── hasher.ts             # 既存: computeHash関数（重複なし）
└── utils/
    └── runtime.ts            # 新規: RuntimeAdapter実装
```

---

## テスト方針

1. **既存テストの維持**: すべての既存テストがパスすることを確認
2. **新規テスト**: 新しいクラス・関数の単体テストを追加
3. **統合テスト**: リファクタリング後の統合テストを実行

---

## 実装済みの成果

### Before → After

| 項目 | Before | After |
|-----|--------|-------|
| Crawlerクラス | 270行、複数責務 | 責務分離済み |
| OutputWriter | 170行、重複コードあり | IndexManager使用、重複解消 |
| Fetcher | Bun依存ハードコード | RuntimeAdapter対応 |
| 定数 | 散在 | constants.tsに集約 |
| エラー処理 | console.error散在 | カスタムエラークラス統一 |
| テスト | 不明 | 224 tests passing |

---

## 完了条件

- [x] Issueの要件を完全に理解した
- [x] 関連するコードを調査した
- [x] 実装計画書を作成した
- [x] すべてのリファクタリング項目を実装した
- [x] テストがすべてパスした（224 tests）
- [x] 計画書をファイルに保存した
