# 実装計画書: GitHub Issue #92

## 概要

クローラーコアモジュール（`parser/links.ts`, `parser/extractor.ts`）のユニットテストを追加し、テストカバレッジを向上させる。

## 影響範囲

- **追加ファイル**:
  - `link-crawler/tests/unit/parser/links.test.ts`
  - `link-crawler/tests/unit/parser/extractor.test.ts`

- **既存ファイルへの変更**: なし（新規テスト追加のみ）

## 実装ステップ

### Step 1: `parser/links.ts` のテスト作成

#### テストケース

1. **normalizeUrl**
   - 絶対URLの正規化
   - 相対URLの正規化（baseUrlからの解決）
   - フラグメント（#）の除去
   - 無効なURLの処理（null返却）

2. **isSameDomain**
   - 同一ドメインの判定
   - 異なるドメインの判定
   - サブドメインの扱い
   - 無効なURLの処理

3. **shouldCrawl**
   - 未訪問URLの許可
   - 訪問済みURLの拒否
   - sameDomain=true時の異ドメイン拒否
   - sameDomain=false時の異ドメイン許可
   - includePatternのマッチ
   - excludePatternのマッチ
   - バイナリファイル拡張子の拒否

4. **extractLinks**
   - HTMLからのリンク抽出
   - 相対URLの正規化
   - #, javascript:, mailto: の除外
   - shouldCrawlフィルタの適用

### Step 2: `parser/extractor.ts` のテスト作成

#### テストケース

1. **extractMetadata**
   - titleタグの抽出
   - description metaタグの抽出
   - og:description の抽出
   - keywords metaタグの抽出
   - author metaタグの抽出
   - og:title の抽出
   - og:type の抽出
   - 存在しないメタデータはnull

2. **extractContent**
   - Readabilityによる本文抽出
   - タイトル抽出
   - Readability失敗時のフォールバック
   - script/styleタグの除去
   - main/articleタグからの抽出

### Step 3: テスト実行とカバレッジ確認

```bash
cd link-crawler
npm test
npm run test:coverage
```

目標: カバレッジ80%以上

## テスト方針

- **フレームワーク**: Vitest（既存と統一）
- **モック**: JSDOMは実際に使用（軽量なため）
- **テストパターン**: 既存の `config.test.ts` に準拠

## リスクと対策

| リスク | 対策 |
|-------|------|
| Readabilityの動作が不安定 | 実際のHTMLを使用して統合テスト |
| JSDOMの環境依存 | Node.js環境で確実に動作するバージョンを使用 |
| カバレッジが目標に達しない | エッジケースを追加して網羅性を向上 |

## 完了条件

- [x] `parser/links.test.ts` を追加
- [x] `parser/extractor.test.ts` を追加
- [ ] 全テストがパス
- [ ] カバレッジ80%以上
