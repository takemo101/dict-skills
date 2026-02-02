# Issue #53 実装計画

## 概要

設計書と実装の不整合を修正する。
設計書には `index-writer.ts` が存在するように記載されているが、実際には `writer.ts` に `saveIndex()` メソッドとして実装されている。

## 選択した修正方針

**オプションA**: 設計書を修正（推奨）

理由:
- 現在の実装はシンプルで機能的に問題ない
- `saveIndex()` は `writer.ts` の `OutputWriter` クラスの一部として適切に機能している
- 過度なモジュール分割は避けるべき（YAGNI原則）

## 影響範囲

| ファイル | 変更内容 |
|----------|----------|
| `docs/link-crawler/design.md` | `index-writer.ts` を `writer.ts` に統合されている旨を反映 |
| `docs/link-crawler/development.md` | 同上 |

## 実装ステップ

1. `design.md` のモジュール構成図を修正
   - `index-writer.ts` の行を削除
   - `writer.ts` の説明に index.json 生成を追加

2. `design.md` のモジュール責務テーブルを修正
   - `IndexWriter` の行を削除
   - `PageWriter` の責務に index.json 生成を追加

3. `development.md` のプロジェクト構成を修正
   - `index-writer.ts` の行を削除
   - `writer.ts` の説明に index.json 生成を追加

## テスト方針

検証コマンド:
```bash
grep -r "index-writer" docs/
# 期待: 言及がないか、writer.tsに統合されている旨の説明がある
```

## リスクと対策

| リスク | 対策 |
|--------|------|
| 誤って実装側を変更する | 実装計画を確認し、必ず設計書のみを修正 |
| 他のドキュメントへの言及が残る | grep で全文検索して確認 |

## 完了条件

- [ ] `design.md` から `index-writer.ts` の記載が削除されている
- [ ] `development.md` から `index-writer.ts` の記載が削除されている
- [ ] `writer.ts` の説明に index.json 生成が含まれている
- [ ] grep で `index-writer` の言及がないことを確認
