# 007: Coverage Directory Already Untracked (2026-02-09)

## 問題

Issue #1069 で `link-crawler/coverage/coverage-summary.json` がGitに追跡されていると報告された。

## 調査結果

### Git追跡状態の確認

```bash
$ git ls-files link-crawler/coverage/
# 結果: 出力なし（追跡されていない）

$ git log --all --full-history -- "link-crawler/coverage/*"
# 結果: 履歴なし（過去にも追跡されていない）
```

### .gitignore設定の確認

- `link-crawler/.gitignore`: `coverage/` を含む
- ルート `.gitignore`: `**/coverage/` を含む

### テストによる検証

```bash
$ cd link-crawler && bun run test --coverage
# カバレッジが正常に生成される
# git status: "nothing to commit, working tree clean"
# coverageディレクトリは正しく無視されている
```

## 結論

**Issueの完了条件は既に満たされている**:
- ✅ `git ls-files link-crawler/coverage/` が空である
- ✅ `.gitignore` で `coverage/` が適切に除外されている

## 原因

このIssueは以下のいずれかの理由で作成された可能性がある:

1. プロジェクトレビューツールがディスク上に存在するcoverageディレクトリを検出した
2. Git追跡状態を正しく確認せず、物理的な存在だけで判断した
3. 他のブランチでの状態を基に作成された

## 対応

コード変更は不要。このドキュメントで調査結果を記録し、Issueをクローズする。

## 参考

- Issue: #1069
- 調査日: 2026-02-09
