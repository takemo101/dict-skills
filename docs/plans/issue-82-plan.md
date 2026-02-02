# Issue #82 実装計画

## 概要

設計書 (`design.md`, `development.md`) に記載されている `output/index-writer.ts` が実際には存在しません。実際には `writer.ts` が index.json の生成も担当しているため、設計書を実態に合わせて修正します。

## 問題詳細

### 実際のファイル構成
```
link-crawler/src/output/
├── chunker.ts
├── merger.ts
└── writer.ts    # index.json生成もここで担当
```

### 設計書の記載（誤り）
```
output/
├── writer.ts
├── merger.ts
├── chunker.ts
└── index-writer.ts    # ← 存在しない
```

## 修正対象ファイル

1. `docs/link-crawler/design.md`
   - 行100付近: モジュール構成図から `index-writer.ts` を削除
   - 行130付近: モジュール責務テーブルから `IndexWriter` を削除

2. `docs/link-crawler/development.md`
   - 行52付近: プロジェクト構成から `index-writer.ts` を削除
   - 行192付近: 命名規則の例にある `index-writer.ts` を削除

## 実装ステップ

1. **design.md の修正**
   - モジュール構成図（3.2節）から `index-writer.ts` の行を削除
   - モジュール責務テーブル（3.3節）から `IndexWriter` の行を削除

2. **development.md の修正**
   - プロジェクト構成（2節）から `index-writer.ts` の行を削除
   - 命名規則の例（4.5節）で `index-writer.ts` を別の適切な例に変更

3. **検証**
   - 修正後の設計書と実際のファイル構成が一致することを確認

## テスト方針

- ドキュメント修正のみのため、コードテストは不要
- 修正後のマークダウンファイルの構文チェックを実施

## リスクと対策

| リスク | 対策 |
|--------|------|
| 他の箇所でも `index-writer.ts` が言及されている可能性 | grep で全文検索して確認 |
| `IndexWriter` クラスの説明が他に必要な箇所がある | 責務テーブルの `writer.ts` の説明を確認・更新 |

## 完了条件

- [ ] `docs/link-crawler/design.md` のモジュール構成を実態に合わせて修正
- [ ] `docs/link-crawler/development.md` のモジュール構成を実態に合わせて修正
- [ ] 修正箇所が grep で検出されないことを確認
