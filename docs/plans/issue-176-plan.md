# Issue #176 実装計画

## 概要

README.mdに未記載のCLIオプションを追加するドキュメント更新タスク。

## 影響範囲

- `README.md` - オプション表に4つのオプションを追加
- `link-crawler/SKILL.md` - `--keep-session` オプションを追加（整合性のため）

## 実装ステップ

1. README.mdのオプション表に以下を追加:
   - `--timeout <sec>` - リクエストタイムアウト（秒）
   - `--no-pages` - ページ単位出力無効
   - `--no-merge` - 結合ファイル無効
   - `--keep-session` - デバッグ用に.playwright-cliディレクトリを保持

2. SKILL.mdのオプション表に `--keep-session` を追加

## テスト方針

ドキュメント変更のみなので、以下で検証:
- `grep -oE "\-\-[a-z-]+" README.md | sort -u` でオプション一覧確認
- crawl.tsの `.option(...)` 定義と整合性確認

## リスクと対策

- リスク: なし（ドキュメント変更のみ）
- 対策: 既存のSKILL.mdとの整合性を確認
