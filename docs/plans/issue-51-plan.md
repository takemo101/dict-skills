# Issue #51 実装計画

## 概要

GitHub Issue #51: テストカバレッジが不足している - parser/links.ts, parser/converter.ts, parser/extractor.tsのテストが存在しない

`link-crawler`プロジェクトのparserモジュールに対するユニットテストを新規作成し、開発ガイドで定められたカバレッジ目標（80%+）を達成する。

## 影響範囲

- **新規作成ファイル**:
  - `link-crawler/tests/unit/converter.test.ts` - HTML→Markdown変換のテスト
  - `link-crawler/tests/unit/links.test.ts` - リンク抽出・正規化のテスト
  - `link-crawler/tests/unit/extractor.test.ts` - コンテンツ抽出のテスト

- **影響モジュール**:
  - `link-crawler/src/parser/converter.ts` (既存、変更なし)
  - `link-crawler/src/parser/links.ts` (既存、変更なし)
  - `link-crawler/src/parser/extractor.ts` (既存、変更なし)

## 実装ステップ

### Step 1: converter.test.ts の作成

対象関数: `htmlToMarkdown`

テストケース:
1. 基本的なHTMLからMarkdownへの変換
2. 見出し（h1-h6）の変換
3. コードブロックの変換
4. 空リンクの除去
5. 複数スペースの正規化
6. カンマ・ピリオド前のスペース除去
7. 3つ以上の改行を2つに正規化
8. 壊れたリンク記法の除去

### Step 2: links.test.ts の作成

対象関数:
- `normalizeUrl`
- `isSameDomain`
- `shouldCrawl`
- `extractLinks`

テストケース:
1. **normalizeUrl**:
   - 相対URLの正規化
   - 絶対URLの正規化
   - ハッシュフラグメントの除去
   - 無効なURLの処理

2. **isSameDomain**:
   - 同一ドメインの判定
   - 異なるドメインの判定
   - 無効なURLの処理

3. **shouldCrawl**:
   - 未訪問URLの許可
   - 訪問済みURLの拒否
   - 同一ドメイン制限の適用
   - includePatternの適用
   - excludePatternの適用
   - バイナリファイル拡張子の拒否

4. **extractLinks**:
   - アンカータグからのリンク抽出
   - 相対URLの解決
   - 無効なリンクの除外（#、javascript:、mailto:）
   - shouldCrawlフィルタの適用

### Step 3: extractor.test.ts の作成

対象関数:
- `extractMetadata`
- `extractContent`

テストケース:
1. **extractMetadata**:
   - タイトルの抽出
   - descriptionメタタグの抽出
   - og:descriptionの抽出
   - keywordsの抽出
   - authorの抽出
   - og:titleの抽出
   - og:typeの抽出
   - 存在しないメタデータの処理

2. **extractContent**:
   - Readabilityによる本文抽出
   - タイトルの抽出
   - フォールバック処理（mainタグ等）
   - script/style等の除外
   - 空コンテンツの処理

## テスト方針

- **フレームワーク**: Vitest
- **テストスタイル**: 既存のテストファイルに従い、`describe`と`it`を使用
- **テストデータ**: モックHTML文字列を使用
- **外部依存**:
  - `jsdom`: モック用DOM構築
  - `@mozilla/readability`: コンテンツ抽出
  - `turndown`: HTML→Markdown変換

## リスクと対策

| リスク | 対策 |
|--------|------|
| JSDOMの初期化が複雑 | シンプルなHTML文字列でテスト |
| Turndownの出力が環境依存 | 主要な変換パターンに焦点を当てる |
| Readabilityの結果が不安定 | 十分なHTML構造を持つテストデータを使用 |
| カバレッジ目標未達 | エッジケースを含む包括的なテストケースを作成 |

## 完了条件

- [ ] `tests/unit/converter.test.ts`が作成されている
- [ ] `tests/unit/links.test.ts`が作成されている
- [ ] `tests/unit/extractor.test.ts`が作成されている
- [ ] 全テストがパス
- [ ] カバレッジ目標を達成（parser/配下で80%+）

## 検証方法

```bash
cd link-crawler
bun run test
bun run test:coverage
```
