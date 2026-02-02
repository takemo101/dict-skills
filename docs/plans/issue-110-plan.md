# Issue #110 実装計画

## 概要

`link-crawler/src/crawler/fetcher.ts` で使用している `playwright-cli content` コマンドが、実際の playwright-cli には存在しないため、クローラーが動作しない問題を修正する。

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `link-crawler/src/crawler/fetcher.ts` | `playwright-cli content` を `playwright-cli eval` に置換 |
| `docs/link-crawler/design.md` | 設計書のコード例を更新 |

## 実装ステップ

1. **fetcher.ts の修正**
   - 行42: `playwright-cli content --session ${this.sessionId}` を `playwright-cli eval "document.documentElement.outerHTML" --session ${this.sessionId}` に変更
   - 動作確認のためのログ出力を追加（必要に応じて）

2. **design.md の更新**
   - セクション 6.2 の実装イメージのコード例を修正
   - `playwright-cli content` の箇所を `playwright-cli eval` に変更

3. **テスト**
   - 構文エラーチェック（TypeScriptコンパイル）
   - 実際にサイトをクロールして動作確認（可能な場合）

## 技術的詳細

### 修正前
```typescript
const result = await $\`playwright-cli content --session \${this.sessionId}\`.quiet();
```

### 修正後
```typescript
const result = await $\`playwright-cli eval "document.documentElement.outerHTML" --session \${this.sessionId}\`.quiet();
```

## リスクと対策

| リスク | 対策 |
|-------|------|
| evalコマンドの出力形式が異なる | 実際にテストして確認 |
| 特殊文字のエスケープ | 引用符を適切に使用 |

## 完了条件

- [ ] `fetcher.ts` の修正
- [ ] `design.md` の更新
- [ ] テストパス
