# Issue #312 実装計画

## 概要
`src/crawl.ts` のエラーハンドリングで、`TimeoutError` のチェック順序を修正します。
`TimeoutError` は `CrawlError` を継承しているため、親クラスのチェックより先に子クラスのチェックを行う必要があります。

## 現状分析

### エラークラスの継承関係
```
CrawlError (基底クラス)
├── DependencyError
├── ConfigError
├── FetchError
├── FileError
└── TimeoutError
```

### 現在のコード状態
`src/crawl.ts` のエラーハンドリング順序:
1. `DependencyError` - 行54
2. `ConfigError` - 行58
3. `FetchError` - 行62
4. `TimeoutError` - 行66 ✅
5. `CrawlError` - 行70 ✅

現在のコードでは既に `TimeoutError` が `CrawlError` の前にチェックされており、正しい順序になっています。

## 影響範囲
- `src/crawl.ts` - エラーハンドリング部分（行54-76）

## 実装ステップ
1. ✅ コードの現状確認（既に正しい順序）
2. テスト実行で動作確認
3. 必要に応じてコミット

## テスト方針
- 単体テスト実行: `bun test`
- エラーハンドリングの動作確認

## リスクと対策
- **リスク**: コードが既に修正済みの場合、変更が不要
- **対策**: テスト実行で現在の実装が正しく動作することを確認

## 完了条件
- [ ] エラーハンドリングの順序が正しいことを確認
- [ ] 全テストがパスすること
