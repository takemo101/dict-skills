# 003: Issue #946 は PR #944 で既に解決済み (2026-02-08)

## 問題

Issue #946「refactor: OutputWriter が config.outputDir を直接変更する副作用を解消する」が作成されたが、同じ問題が既に PR #944 で修正されていた。

## 経緯

### タイムライン

1. **2026-02-08 09:50:41 UTC**: PR #944 "refactor: OutputWriter が CrawlConfig.outputDir を変更しないように修正" がmainにマージ
2. **2026-02-08 09:56:30 UTC**: Issue #946 が作成される（約6分後）

### 原因

Issue #946 はプロジェクト全体レビューツールによって自動生成されたと推測される。レビュー実行時点で PR #944 がまだマージされていなかったため、古いコードベースに基づいて Issue が作成された。

## 対応

### PR #944 で実装済みの修正内容

1. **OutputWriter (`link-crawler/src/output/writer.ts`)**:
   - `config.outputDir` を変更する処理を削除
   - `finalOutputDir` と `workingOutputDir` を内部プロパティとして管理
   - `getWorkingOutputDir()` メソッドを追加して作業ディレクトリを公開

2. **PostProcessor (`link-crawler/src/crawler/post-processor.ts`)**:
   - コンストラクタで `outputDir: string` を明示的に受け取る
   - `config.outputDir` の代わりに `this.outputDir` を使用
   - Merger/Chunker を必要時のみ生成するように変更

3. **Crawler (`link-crawler/src/crawler/index.ts`)**:
   - `new PostProcessor(config, this.writer.getWorkingOutputDir(), this.logger)` で呼び出し

### Issue #946 の対応

- 既に修正済みであることを確認
- 全テスト（818件）が正常にパス
- 型チェックも正常
- PR作成により Issue #946 を自動クローズ

## 検証結果

```bash
cd link-crawler

# config.outputDir への代入がないことを確認
grep -rn "config\.outputDir\s*=" src/
# → 該当なし

# PostProcessor が config.outputDir を参照していないことを確認
grep -n "config\.outputDir" src/crawler/post-processor.ts
# → 該当なし

# テスト実行
bun run test
# → 818 tests passed

# 型チェック
bun run typecheck
# → No errors
```

## 教訓

### 自動レビューツールの実行タイミング

プロジェクト全体レビューツールを実行する際は:

1. 最新のmainブランチを pull してから実行する
2. 既存の未マージPRをレビューして重複を避ける
3. 生成された Issue を作成する前に、同様の PR/Issue がないか確認する

### Issue作成前のチェック

自動生成された Issue を作成する前に:

1. GitHub で同じファイル・行番号に関する最近の PR を検索
2. 同様の問題を扱っている open/closed Issue を確認
3. 最新のコードで問題が再現するか確認

## 関連

- **PR #944**: https://github.com/takemo101/dict-skills/pull/944
- **Issue #935**: 元の Issue（PR #944 で対応）
- **Issue #946**: この重複 Issue
- **Commit f695cdd**: "refactor: OutputWriter が CrawlConfig.outputDir を変更しないように修正"
