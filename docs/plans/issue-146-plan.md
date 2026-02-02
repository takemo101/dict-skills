# Issue #146 実装計画

## 概要

`npm run test` を実行すると `sh: vitest: command not found` となる問題を修正します。これは `package.json` の scripts が `vitest run` を直接呼び出しているため、PATH に vitest が無い環境で失敗します。

## 影響範囲

- **link-crawler/package.json**: test 関連の scripts を修正
- **link-crawler/SKILL.md**: ドキュメントの確認（必要に応じて更新）

## 実装ステップ

### 1. package.json の修正

以下の scripts を `npx` 経由に変更:

```json
"scripts": {
  "test": "npx vitest run",
  "test:watch": "npx vitest",
  "test:coverage": "npx vitest run --coverage"
}
```

### 2. テスト実行による検証

```bash
cd link-crawler
npm run test
```

## テスト方針

- `npm run test` が正常に実行できることを確認
- `bun run test` も引き続き動作することを確認
- すべてのテストがパスすることを確認

## リスクと対策

| リスク | 対策 |
|--------|------|
| npx が利用できない環境 | npm 標準機能なので問題なし |
| bun run test の互換性 | npx は npm/yarn 用、bun は直接 vitest を見つけるため両方動作 |
| CI での動作 | CI は bun run test を使用しているため影響なし |

## 完了条件

- [ ] `link-crawler/package.json` の scripts を修正
- [ ] `npm run test` でテストが実行される
- [ ] `bun run test` でもテストが実行される
- [ ] すべてのテストがパスする
