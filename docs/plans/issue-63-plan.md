# GitHub Issue #63 実装計画

## 概要

ルートの README.md にインストール手順と使用方法を具体的に記載し、TODOコメントを削除する。

## Issue分析

### 現在の問題
- README.md の「インストール」セクションに `# TODO: インストール手順を追加` が残っている
- README.md の「使用方法」セクションに `# TODO: 使用例を追加` が残っている
- 新規ユーザーがプロジェクトの使い方を理解できない

### 関連ファイル
- `README.md` - メインドキュメント（変更対象）
- `link-crawler/SKILL.md` - 詳細な使用方法のドキュメント（参照先）
- `link-crawler/package.json` - スクリプト定義の確認用

## 実装ステップ

1. **README.md の更新**
   - 「インストール」セクションを具体的な手順に書き換え
     - リポジトリクローン手順
     - 依存関係インストール手順（bun install）
     - playwright-cli のインストール手順
   - 「使用方法」セクションを具体的な使用例に書き換え
     - 基本的なクロールコマンド例
     - 結合ファイルのみ出力する例
     - 差分クロールの例
   - SKILL.md へのリンクを追加
   - TODOコメントを全て削除

2. **検証**
   - `grep -n "TODO" README.md` でTODOが残っていないことを確認

## 変更内容

### インストールセクション（変更後）
```markdown
## インストール

```bash
# リポジトリクローン
git clone https://github.com/takemo101/dict-skills.git
cd dict-skills/link-crawler

# 依存関係インストール
bun install

# playwright-cli のインストール
npm install -g @playwright/cli
```
```

### 使用方法セクション（変更後）
```markdown
## 使用方法

```bash
# 基本的なクロール
bun run dev https://docs.example.com -d 2

# 結合ファイルのみ出力
bun run dev https://docs.example.com --no-pages --no-chunks

# 差分クロール
bun run dev https://docs.example.com --diff
```

詳細は [link-crawler/SKILL.md](./link-crawler/SKILL.md) を参照。
```

## テスト方針

- マニュアルテスト: grepコマンドでTODOが残っていないことを確認
- READMEの構文確認: 正しいMarkdown構文になっていることを確認

## リスクと対策

| リスク | 対策 |
|-------|------|
| コマンド例が誤っている | package.jsonとSKILL.mdを参照して正確なコマンドを記載 |
| パスが誤っている | 実際のディレクトリ構造を確認 |
| TODOが残っている | grepコマンドで検証 |

## 完了条件

- [ ] インストール手順を具体的に記載
- [ ] 使用例を具体的に記載
- [ ] SKILL.md へのリンクを追加
- [ ] TODOコメントを全て削除
- [ ] grep -n "TODO" README.md で出力なしを確認
