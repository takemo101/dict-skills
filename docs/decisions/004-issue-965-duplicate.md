# 004: Issue #965 は Issue #961 と重複 (2026-02-08)

## 問題

Issue #965 で「`docs/decisions/` ディレクトリ内でファイル番号が重複している」という問題が報告された。

具体的には：
```
001-playwright-cli-session.md
002-issue-854-duplicate.md
002-issue-946-duplicate.md   ← 番号が 002 で重複
```

## 調査結果

Issue #965 の worktree (`issue-965-fix-docs-decisions`) を調査した結果、**この問題は既に PR #961 で解決済み**であることが判明した。

### PR #961 の内容

コミット `5039c5b` (PR #961) で以下の修正が実施された：

1. **ファイルリネーム**
   - `docs/decisions/002-issue-946-duplicate.md` → `docs/decisions/003-issue-946-duplicate.md`

2. **見出し修正**
   - `002-issue-854-duplicate.md`: `# 854:` → `# 002:`
   - `003-issue-946-duplicate.md`: `# 002:` → `# 003:`

3. **README.md 更新**
   - 002, 003 のエントリを追加

### 現在の状態

```bash
docs/decisions/
├── 001-playwright-cli-session.md
├── 002-issue-854-duplicate.md
├── 003-issue-946-duplicate.md  ← 既に修正済み
└── README.md
```

## 結論

- Issue #965 は Issue #961 の**重複Issue**である
- 実装作業は不要（既に完了済み）
- この ADR（004）で重複の記録を残し、Issue #965 をクローズする

## 教訓

- Issue 作成前に既存の PR/Issue を検索することが重要
- 同じ問題が並行して報告される可能性があるため、作業開始前の最新状態確認が必須
- worktree ベースの並行開発では、ベースコミットが最新でない場合がある

## 参考

- Issue #965: fix: docs/decisions/ のファイル番号の重複を解消する
- Issue #961 / PR #961: docs: ADR番号重複を解消 (002→002,003)
- Commit: 5039c5b
