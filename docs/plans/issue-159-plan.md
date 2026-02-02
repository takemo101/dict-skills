# Issue #159 Implementation Plan

## 概要
link-crawlerスキルのテストカバレッジ不足を解消するため、優先度の高い4つのモジュールに対してユニットテストを追加します。

## 影響範囲

### 新規作成ファイル
- `tests/unit/errors.test.ts` - カスタムエラークラスのテスト
- `tests/unit/runtime.test.ts` - ランタイムアダプターのテスト
- `tests/unit/index-manager.test.ts` - インデックスマネージャーのテスト
- `tests/unit/crawler.test.ts` - クローラーのテスト（モック使用）

### 参照するソースファイル
- `src/errors.ts` - エラークラス定義
- `src/utils/runtime.ts` - ランタイムアダプター
- `src/output/index-manager.ts` - インデックス管理
- `src/crawler/index.ts` - クローラーメイン処理

## 実装ステップ

### Step 1: errors.test.ts
`src/errors.ts`の5つのエラークラスをテスト:

1. **CrawlError** (基底クラス)
   - メッセージとコードの設定
   - cause付きコンストラクタ
   - toString() メソッド（causeあり/なし）

2. **FetchError**
   - URLプロパティの設定
   - 親クラスの継承確認

3. **ConfigError**
   - configKeyプロパティの設定

4. **FileError**
   - filePathプロパティの設定
   - cause付きコンストラクタ

5. **DependencyError**
   - dependencyプロパティの設定

6. **TimeoutError**
   - timeoutMsプロパティの設定

### Step 2: runtime.test.ts
`src/utils/runtime.ts`の3つのクラスをテスト:

1. **BunRuntimeAdapter**
   - spawn: 成功ケース（Bun.spawnのモック）
   - spawn: 失敗ケース（コマンド不存在）
   - sleep: Bun.sleepの呼び出し確認

2. **NodeRuntimeAdapter**
   - spawn: 成功ケース（child_processモック）
   - spawn: 失敗ケース（エラーイベント）
   - sleep: setTimeoutベースの動作

3. **createRuntimeAdapter**
   - Bun環境時のファクトリー動作
   - Node環境時のファクトリー動作

### Step 3: index-manager.test.ts
`src/output/index-manager.ts`のIndexManagerクラスをテスト:

1. **コンストラクタ**
   - 既存index.jsonの読み込み
   - 新規作成時の初期化

2. **loadExistingIndex**
   - 正常読み込み
   - ファイル不存在
   - 無効なJSON
   - 空のpages配列

3. **getExistingHash**
   - 存在するURL
   - 存在しないURL

4. **getNextPageNumber**
   - 初期値
   - ページ登録後の増加

5. **registerPage**
   - ページ情報の正確な登録
   - totalPagesの増加

6. **addSpec**
   - 仕様ファイルの追加

7. **saveIndex**
   - JSONファイルの保存
   - 保存内容の検証

8. **getResult/getTotalPages/getSpecsCount**
   - 各種ゲッターの動作確認

### Step 4: crawler.test.ts
`src/crawler/index.ts`のCrawlerクラスをテスト:

1. **コンストラクタ**
   - 依存オブジェクトの初期化
   - fetcherの注入

2. **initFetcher**
   - fetcherの遅延初期化

3. **crawl** (主要ロジック)
   - 単一ページのクロール（モック使用）
   - depth制限の確認
   - 既訪問URLのスキップ
   - リンク抽出と再帰

4. **差分モード**
   - 変更検出ロジック
   - スキップ動作

5. **specファイル検出**
   - 非HTMLコンテンツの処理

## テスト方針

### モック戦略
- **Fetcherインターフェース**: モック実装を使用
- **fsモジュール**: 実際のファイルI/Oを使用（一時ディレクトリで）
- **Bun/Nodeランタイム**: vi.mockで環境をシミュレート

### パターン
- 既存のテストファイル（`config.test.ts`, `hasher.test.ts`等）と同様のスタイル
- `describe`でグループ化
- `beforeEach`で状態リセット
- 一時ディレクトリを使用したファイルI/Oテスト

## リスクと対策

| リスク | 対策 |
|--------|------|
| Crawlerの依存関係が複雑 | Fetcherをモック化し、単体テスト可能にする |
| ファイルI/Oの副作用 | 一時ディレクトリ（`join(import.meta.dirname, ".test-xxx")`）を使用 |
| Bun/Node環境の検出 | vi.stubGlobalで`globalThis.Bun`を制御 |
| 非同期処理のテスト | async/awaitと適切なexpect awaitを使用 |

## 完了条件

- [ ] `errors.test.ts`が作成され、全テストパス
- [ ] `runtime.test.ts`が作成され、全テストパス
- [ ] `index-manager.test.ts`が作成され、全テストパス
- [ ] `crawler.test.ts`が作成され、全テストパス
- [ ] `npm run test`がパス
- [ ] カバレッジレポートで対象ファイルがカバーされている
