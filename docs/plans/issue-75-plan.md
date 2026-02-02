# Issue #75 実装計画

## 概要
設計書 `docs/link-crawler/design.md` および `docs/link-crawler/development.md` に記載されている `src/output/index-writer.ts` ファイルが実際のソースコードに存在しない。実装では `index.json` 生成機能は `writer.ts` の `OutputWriter.saveIndex()` メソッドに統合されている。

## 影響範囲
- `docs/link-crawler/design.md` (1箇所: モジュール構成図)
- `docs/link-crawler/development.md` (2箇所: プロジェクト構成図と命名規則例)

## 実装ステップ

### Step 1: design.md の修正
1. モジュール構成図から `index-writer.ts` の行を削除
2. `writer.ts` の説明を更新して index.json 生成機能を含めることを明記

修正前:
```
│       ├── writer.ts           # ページ書き込み
│       ├── merger.ts           # full.md 生成
│       ├── chunker.ts          # chunks/*.md 生成
│       └── index-writer.ts     # index.json 生成
```

修正後:
```
│       ├── writer.ts           # ページ書き込み + index.json生成
│       ├── merger.ts           # full.md 生成
│       └── chunker.ts          # chunks/*.md 生成
```

### Step 2: development.md の修正
1. プロジェクト構成図から `index-writer.ts` の行を削除
2. `writer.ts` の説明を更新
3. 命名規則の例を変更（`index-writer.ts` の代わりに別の例を使用）

### Step 3: 検証
- `grep -r "index-writer" docs/link-crawler/` が0件になることを確認

## テスト方針
- ドキュメント変更のみのため、テストは不要
- grep で変更後に `index-writer` への参照が残っていないことを確認

## リスクと対策
- **リスク**: なし（ドキュメント修正のみ）
- **対策**: 該当箇所のみを変更し、他の内容には影響を与えない
