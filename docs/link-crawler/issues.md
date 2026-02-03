# 実装Issue一覧

設計書に基づく実装タスク。依存関係順に記載。

---

## Phase 0: テスト基盤

### Issue #0: Vitest環境構築

**概要**: テストフレームワークVitestをセットアップ

**タスク**:
- [x] `vitest` を devDependencies に追加
- [x] `vitest.config.ts` を作成
- [x] `tests/unit/`, `tests/integration/` ディレクトリ作成
- [x] package.json に `test`, `test:watch`, `test:coverage` スクリプト追加
- [x] サンプルテスト作成で動作確認

**影響ファイル**: 3ファイル（`package.json`, `vitest.config.ts`, サンプルテスト）
**見積もり**: 40行程度

---

## Phase 1: 基盤整備

### Issue #1: PlaywrightFetcherへの統一

**概要**: StaticFetcherを削除し、PlaywrightFetcherに統一する

**背景**: 設計方針として全サイトplaywright-cli統一。SPA/静的の分岐を排除。

**タスク**:
- [ ] `src/crawler/static.ts` を削除
- [ ] `src/crawler/spa.ts` を `src/crawler/fetcher.ts` にリネーム
- [ ] クラス名を `SPAFetcher` → `PlaywrightFetcher` に変更
- [ ] `src/crawler/index.ts` からStaticFetcher参照を削除
- [ ] `--spa` オプションを削除（常にplaywright-cli使用）

**影響ファイル**: 3ファイル
**見積もり**: 50行程度の変更

---

### Issue #2: 型定義の更新

**概要**: 新設計に合わせて型定義を更新

**タスク**:
- [x] `CrawlConfig` に `diff`, `pages`, `merge`, `chunks` 追加
- [x] `CrawledPage` に `hash` フィールド追加
- [x] `PageIndex` 型を追加（index.json用）
- [x] 不要な `spa` フィールドを削除

**影響ファイル**: 1ファイル (`src/types.ts`)
**見積もり**: 30行程度の変更

---

### Issue #3: CLIオプションの追加

**概要**: 新しいCLIオプションを追加

**タスク**:
- [x] `--diff` オプション追加
- [x] `--no-pages` オプション追加
- [x] `--no-merge` オプション追加
- [x] `--no-chunks` オプション追加
- [x] `--spa` オプション削除
- [x] `src/config.ts` のパース処理更新

**依存**: Issue #2

**影響ファイル**: 2ファイル (`src/crawl.ts`, `src/config.ts`)
**見積もり**: 40行程度の変更

---

## Phase 2: 差分クロール

### Issue #4: Hasherモジュールの実装

**概要**: SHA256ハッシュ計算・差分検知モジュールを新規作成

**タスク**:
- [x] `src/diff/hasher.ts` を新規作成
- [x] `computeHash(content: string): string` 関数実装
- [x] `Hasher` クラス実装
  - `loadHashes(indexPath: string)`: 既存index.jsonからハッシュ読み込み
  - `isChanged(url: string, newHash: string): boolean`: 差分判定
  - `getHash(url: string): string | undefined`: 既存ハッシュ取得

**影響ファイル**: 1ファイル（新規）
**見積もり**: 60行程度

---

### Issue #4-T: Hasherのテスト

**概要**: Hasherモジュールのユニットテスト

**タスク**:
- [x] `tests/unit/hasher.test.ts` を作成
- [x] `computeHash` のテスト（同一性、一意性）
- [x] `Hasher.isChanged` のテスト（新規URL、同一ハッシュ、異なるハッシュ）

**依存**: Issue #4

**影響ファイル**: 1ファイル（新規）
**見積もり**: 50行程度

---

### Issue #5: CrawlerEngineへの差分クロール統合

**概要**: CrawlerEngineに差分検知ロジックを組み込み

**タスク**:
- [ ] `Hasher` をCrawlerEngineに注入
- [ ] `--diff` 時のみハッシュ比較を実行
- [ ] 変更なしページはスキップ
- [ ] ページ保存時にハッシュを記録
- [ ] スキップ時のログ出力

**依存**: Issue #4

**影響ファイル**: 1ファイル (`src/crawler/index.ts`)
**見積もり**: 50行程度の変更

---

## Phase 3: 出力処理

### Issue #6: index.jsonスキーマ更新

**概要**: index.jsonにハッシュ情報を追加

**タスク**:
- [ ] `PageIndex` に `hash`, `crawledAt` フィールド追加
- [ ] `OutputWriter` でハッシュを保存
- [ ] 既存index.json読み込み処理を追加

**依存**: Issue #2

**影響ファイル**: 1ファイル (`src/output/writer.ts`)
**見積もり**: 40行程度の変更

---

### Issue #7: Mergerモジュールの実装

**概要**: 全ページを結合してfull.mdを生成

**タスク**:
- [x] `src/output/merger.ts` を新規作成
- [x] `Merger` クラス実装
  - `merge(pages: CrawledPage[]): string`: ページ結合
  - `stripTitle(markdown: string): string`: 重複タイトル除去
- [x] ページを `# タイトル` 形式で結合
- [x] `full.md` として出力

**影響ファイル**: 1ファイル（新規）
**見積もり**: 50行程度

---

### Issue #7-T: Mergerのテスト

**概要**: Mergerモジュールのユニットテスト

**タスク**:
- [x] `tests/unit/merger.test.ts` を作成
- [x] 複数ページの結合テスト
- [x] タイトル重複除去テスト
- [x] 空ページ処理テスト

**依存**: Issue #7

**影響ファイル**: 1ファイル（新規）
**見積もり**: 50行程度

---

### Issue #8: Chunkerモジュールの実装

**概要**: full.mdを見出しベースでチャンク分割

**タスク**:
- [x] `src/output/chunker.ts` を新規作成
- [x] `Chunker` クラス実装
  - `chunk(fullMarkdown: string): string[]`: h1境界で分割
- [x] `chunks/chunk-001.md` 形式で出力
- [x] 番号は3桁ゼロパディング

**依存**: Issue #7

**影響ファイル**: 1ファイル（新規）
**見積もり**: 50行程度

---

### Issue #8-T: Chunkerのテスト

**概要**: Chunkerモジュールのユニットテスト

**タスク**:
- [x] `tests/unit/chunker.test.ts` を作成
- [x] h1境界での分割テスト
- [x] h1がない場合のテスト
- [x] 複数h1のテスト

**依存**: Issue #8

**影響ファイル**: 1ファイル（新規）
**見積もり**: 50行程度

---

### Issue #9: 後処理のCrawlerEngine統合

**概要**: クロール完了後にMerger/Chunkerを実行

**タスク**:
- [ ] CrawlerEngineにMerger/Chunker呼び出しを追加
- [ ] `--no-merge` 時はMergerスキップ
- [ ] `--no-chunks` 時はChunkerスキップ
- [ ] `--no-pages` 時はページ単位出力スキップ
- [ ] 完了ログにfull.md/chunks情報追加

**依存**: Issue #7, #8

**影響ファイル**: 1ファイル (`src/crawler/index.ts`)
**見積もり**: 40行程度の変更

---

## Phase 4: 既存コードのテスト

### Issue #10-T: Converterのテスト

**概要**: 既存Converterモジュールのユニットテスト

**タスク**:
- [ ] `tests/unit/converter.test.ts` を作成
- [ ] HTML→Markdown変換テスト
- [ ] 空リンク除去テスト
- [ ] 複数改行正規化テスト

**影響ファイル**: 1ファイル（新規）
**見積もり**: 60行程度

---

### Issue #11-T: Linksのテスト

**概要**: 既存Linksモジュールのユニットテスト

**タスク**:
- [ ] `tests/unit/links.test.ts` を作成
- [ ] `normalizeUrl` テスト
- [ ] `isSameDomain` テスト
- [ ] `shouldCrawl` テスト（フィルタ条件）
- [ ] `extractLinks` テスト

**影響ファイル**: 1ファイル（新規）
**見積もり**: 80行程度

---

## Phase 5: 仕上げ

### Issue #12: 統合テスト

**概要**: CrawlerEngine全体の統合テスト

**タスク**:
- [x] `tests/integration/crawler.test.ts` を作成
- [x] モックFetcherを使用したE2E風テスト
- [x] 差分クロールの動作確認テスト
- [x] 出力ファイル生成確認テスト

**依存**: Phase 1-4 完了後

**影響ファイル**: 1ファイル（新規）
**見積もり**: 100行程度

---

### Issue #13: ドキュメント最終調整

**概要**: 実装完了後のドキュメント微調整

**タスク**:
- [ ] SKILL.mdの `<skill-path>` を実際のパスに確認
- [ ] 使用例の動作確認
- [ ] ヘルプ出力の確認
- [ ] READMEの更新

**依存**: Issue #1-12 全て完了後

**影響ファイル**: 2ファイル (`SKILL.md`, `README.md`)
**見積もり**: 30行程度

---

## 依存関係図

```
Phase 0 (テスト基盤)
  #0 Vitest環境構築

Phase 1 (基盤)
  #1 PlaywrightFetcher統一
  #2 型定義更新
  #3 CLIオプション追加 ───────▶ #2

Phase 2 (差分クロール)
  #4 Hasher実装
  #4-T Hasherテスト ──────────▶ #0, #4
  #5 差分クロール統合 ─────────▶ #4

Phase 3 (出力処理)
  #6 index.json更新 ──────────▶ #2
  #7 Merger実装
  #7-T Mergerテスト ──────────▶ #0, #7
  #8 Chunker実装 ─────────────▶ #7
  #8-T Chunkerテスト ─────────▶ #0, #8
  #9 後処理統合 ──────────────▶ #7, #8

Phase 4 (既存テスト)
  #10-T Converterテスト ──────▶ #0
  #11-T Linksテスト ──────────▶ #0

Phase 5 (仕上げ)
  #12 統合テスト ─────────────▶ #0, Phase1-4
  #13 ドキュメント調整 ───────▶ #1-12
```

---

## 実装順序（推奨）

### ステップ1: テスト基盤
1. **#0** Vitest環境構築

### ステップ2: 基盤整備
2. **#1** PlaywrightFetcher統一
3. **#2** 型定義更新
4. **#3** CLIオプション追加

### ステップ3: 新機能（テスト駆動）
5. **#4** Hasher実装
6. **#4-T** Hasherテスト
7. **#7** Merger実装
8. **#7-T** Mergerテスト
9. **#8** Chunker実装
10. **#8-T** Chunkerテスト

### ステップ4: 統合
11. **#5** 差分クロール統合
12. **#6** index.json更新
13. **#9** 後処理統合

### ステップ5: 既存コードテスト
14. **#10-T** Converterテスト
15. **#11-T** Linksテスト

### ステップ6: 仕上げ
16. **#12** 統合テスト
17. **#13** ドキュメント調整

---

## 見積もりサマリ

| Issue | 種別 | 行数 |
|-------|------|------|
| #0 | 新規 | 40 |
| #1 | 変更 | 50 |
| #2 | 変更 | 30 |
| #3 | 変更 | 40 |
| #4 | 新規 | 60 |
| #4-T | テスト | 50 |
| #5 | 変更 | 50 |
| #6 | 変更 | 40 |
| #7 | 新規 | 50 |
| #7-T | テスト | 50 |
| #8 | 新規 | 50 |
| #8-T | テスト | 50 |
| #9 | 変更 | 40 |
| #10-T | テスト | 60 |
| #11-T | テスト | 80 |
| #12 | テスト | 100 |
| #13 | 変更 | 30 |
| **合計** | | **870** |

### カテゴリ別

| カテゴリ | 行数 | 割合 |
|---------|------|------|
| 実装 | 430 | 49% |
| テスト | 440 | 51% |
