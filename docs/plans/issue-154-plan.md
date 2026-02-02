# 実装計画: Issue #154

## 概要
Biomeフォーマット警告を修正し、import順序を整理する。

## 問題
以下のファイルでBiomeのformatとorganizeImportsの警告が検出されていました：

1. **`src/crawl.ts`** - importの順序が不適切
2. **`src/crawler/fetcher.ts`** - importの順序が不適切、フォーマット
3. **`src/constants.ts`** - 配列のフォーマット（改行）
4. **`src/crawler/index.ts`** - importの順序、未使用import、フォーマット
5. **`src/crawler/logger.ts`** - 未使用import、フォーマット
6. **`src/crawler/post-processor.ts`** - フォーマット
7. **`src/output/index-manager.ts`** - フォーマット
8. **`src/output/writer.ts`** - importの順序、フォーマット
9. **`src/utils/runtime.ts`** - 未使用import

## 実装ステップ

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **Biomeチェックの実行**
   ```bash
   npx biome check src/
   ```

3. **自動修正の適用**
   ```bash
   npx biome check --write .
   npx biome check --write --unsafe src/
   ```

4. **テストの実行**
   ```bash
   npm run test
   ```

## 変更内容

- **9ファイル**が修正されました
- **14の警告**が解決されました
- Import順序が整理され、コードスタイルが統一されました

## テスト結果

すべてのテストがパスしました：
- **テストファイル**: 12 passed
- **テスト数**: 243 passed

## 検証方法

```bash
cd link-crawler
npx biome check src/
# 期待: 警告が0件
```
