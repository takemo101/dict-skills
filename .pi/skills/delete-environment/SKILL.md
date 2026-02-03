---
name: delete-environment
description: 開発環境（worktree、Dockerコンテナ）を削除し、環境管理JSONを更新する
---

# Delete Environment（環境削除）

開発環境のクリーンアップを行うスキル。worktreeでの開発完了後やCI/CD環境の削除時に使用します。

## 使用タイミング

- worktreeでの開発完了後（PRマージ後）
- 不要な開発環境の削除
- CI/CD環境のクリーンアップ
- 環境のリセット（再作成前）

## 機能

このスキルは以下の処理を自動的に実行します：

1. **環境管理JSONの更新**: `environments.json` から環境情報を削除
2. **Dockerリソースのクリーンアップ**: 
   - Docker Compose でコンテナを停止・削除
   - 関連するDockerコンテナを強制削除
3. **ファイルシステムのクリーンアップ**:
   - git worktree を削除
   - または通常のディレクトリを削除

## 使用方法

### 基本的な使い方

```bash
bash .pi/skills/delete-environment/scripts/delete_env.sh <env-id> [path-to-delete]
```

### パラメータ

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `<env-id>` | ✅ | 削除する環境のID（environments.jsonに登録されているID） |
| `[path-to-delete]` | ❌ | 削除するディレクトリパス（worktreeパスなど） |

### 実行例

#### 例1: 環境IDのみ指定（JSON更新とDockerクリーンアップのみ）

```bash
bash .pi/skills/delete-environment/scripts/delete_env.sh abc-123
```

#### 例2: worktreeディレクトリも同時に削除

```bash
bash .pi/skills/delete-environment/scripts/delete_env.sh issue-42-auth .worktrees/issue-42-auth
```

#### 例3: 通常のディレクトリを削除

```bash
bash .pi/skills/delete-environment/scripts/delete_env.sh temp-env /tmp/dev-env
```

## 処理の詳細

### 1. environments.json の更新

`environments.json` から指定された環境IDのエントリを削除します。

```bash
# 内部で env-json.sh を使用
bash .opencode/skill/environments-json-management/scripts/env-json.sh remove <env-id>
```

### 2. Docker リソースのクリーンアップ

#### Docker Compose による停止・削除

対象ディレクトリに `docker-compose.yml` が存在する場合、以下を実行：

```bash
cd <path-to-delete>
docker compose down -v
```

#### コンテナの強制削除

環境IDに一致するコンテナを強制削除：

```bash
docker ps -aq --filter "name=<env-id>" | xargs docker rm -f
```

### 3. ファイルシステムのクリーンアップ

#### git worktree の場合

```bash
git worktree remove --force <path-to-delete>
```

#### 通常のディレクトリの場合

```bash
rm -rf <path-to-delete>
```

スクリプトは自動的にworktreeかどうかを判定して適切な削除方法を選択します。

## 安全性と注意事項

### ✅ 安全機能

- **エラー時の停止**: `set -euo pipefail` により予期しないエラーで停止
- **存在チェック**: ディレクトリの存在を確認してから削除
- **強制削除**: Docker関連は強制削除でクリーンアップを保証

### ⚠️ 注意事項

- **データ消失**: このスクリプトはデータを完全に削除します（復元不可）
- **Docker Volume**: `-v` オプションで関連ボリュームも削除されます
- **PRマージ前の削除**: PRマージ前に実行すると作業内容が失われます

### 推奨される使用フロー

1. PRを作成
2. レビュー・承認
3. PRをマージ
4. **その後**にこのスキルで環境を削除

または、`pr-and-cleanup` スキルを使用すると、PR作成から環境削除まで自動化できます。

## 関連スキル

| スキル | 関連 | 説明 |
|--------|------|------|
| **create-worktree** | 対となるスキル | worktree環境を作成 |
| **pr-and-cleanup** | 推奨ワークフロー | PR作成と環境削除を自動化 |
| **ci-workflow** | 連携 | CI完了後の自動クリーンアップ |

## トラブルシューティング

### env-json.sh が見つからない

```bash
# 警告が表示されますが、他の処理は継続されます
[WARN] env-json.sh not found. Skipping JSON update.
```

**対処**: environments.json の手動更新が必要な場合があります

### Dockerコンテナが削除できない

```bash
# スクリプトは強制削除を試みます
docker rm -f <container-id>
```

**対処**: 手動で `docker ps -a` を確認し、残っているコンテナを削除

### worktree削除時のエラー

```bash
# --force オプションで強制削除を試みます
git worktree remove --force <path>
```

**対処**: 
1. `git worktree list` で状態を確認
2. 手動で `git worktree prune` を実行

## 実行ログの例

```bash
$ bash .pi/skills/delete-environment/scripts/delete_env.sh issue-42-auth .worktrees/issue-42-auth

[INFO] Starting deletion for environment: issue-42-auth
[INFO] Updating environments.json...
[INFO] Cleaning up Docker resources...
[INFO] Running docker compose down in .worktrees/issue-42-auth...
[INFO] Force removing containers matching 'issue-42-auth'...
[INFO] No lingering containers found for 'issue-42-auth'.
[INFO] Removing directory: .worktrees/issue-42-auth
[INFO] Detected git worktree. Removing with git worktree remove...
[INFO] Directory removed.
[INFO] Deletion complete for issue-42-auth
```

## まとめ

このスキルは開発環境の完全なクリーンアップを提供します：

- ✅ 環境管理JSONの自動更新
- ✅ Dockerリソースの完全削除
- ✅ worktree/ディレクトリの安全な削除
- ✅ エラーハンドリングとログ出力

**推奨**: PR作成から環境削除までを自動化したい場合は、`pr-and-cleanup` スキルの使用を検討してください。
