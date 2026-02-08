# Link Crawler ドキュメント

link-crawlerの技術ドキュメントへようこそ。

## 機能概要

| 機能 | 説明 |
|------|------|
| **playwright-cliクロール** | SPA/静的サイト両対応 |
| **差分クロール** | ハッシュベースで変更ページのみ更新 |
| **結合出力 (full.md)** | 全ページを1ファイルに結合、AIコンテキストに最適 |
| **チャンク分割** | 見出しベースで分割、RAG等に利用 |
| **API仕様検出** | OpenAPI/GraphQL/JSON Schema自動検出 |

## クイックスタート

### 方法1: install.sh を使用（推奨）

```bash
cd link-crawler
./install.sh

# クロール実行
bun run dev https://docs.example.com -d 2

# 出力は link-crawler/.context/example/ に生成されます
cat .context/example/full.md
```

### 方法2: 手動インストール

```bash
cd link-crawler
bun install

# クロール実行
bun run dev https://docs.example.com -d 2

# 出力は link-crawler/.context/example/ に生成されます
cat .context/example/full.md
```

## piスキル統合

グローバルスキルとして登録:

```bash
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler
```

## 📚 ドキュメント一覧

### 利用者向け

| ドキュメント | 対象読者 | 内容 |
|-------------|---------|------|
| [プロジェクトREADME](../README.md) | 初めての方 | 概要・クイックスタート・インストール |
| [SKILL.md](../link-crawler/SKILL.md) | **piユーザー** | piスキルとしての簡潔な使い方 |
| [CLI仕様書](./cli-spec.md) | **CLIユーザー** | 完全なオプション一覧・詳細な使用例・出力形式の仕様（SSOT） |

### 開発者向け

| ドキュメント | 内容 |
|-------------|------|
| [設計書](./design.md) | アーキテクチャ・データ構造・モジュール設計 |
| [開発ガイド](./development.md) | 開発ワークフロー・コーディング規約・テスト方針 |

## 🚀 目的別ガイド

### 「とにかく早く使いたい」

→ **[プロジェクトREADME](../README.md)** → [CLI仕様書](./cli-spec.md)

### 「piエージェントで使いたい」

→ **[SKILL.md](../link-crawler/SKILL.md)**

- piスキルとしてのセットアップ
- piエージェントでの使用例
- AIコンテキストとしての活用方法

### 「詳細なオプションを知りたい」

→ **[CLI仕様書](./cli-spec.md)**

- 全オプションの詳細説明
- 様々なユースケースの使用例
- 出力形式の完全な仕様
- 終了コード・環境変数

### 「開発に参加したい」

→ **[設計書](./design.md)**

- アーキテクチャの全体像
- データフロー
- モジュール構成と責務
- 技術スタック

## 📋 情報の所在（クイックリファレンス）

| 知りたい情報 | 参照先 |
|-------------|--------|
| オプション一覧 | [CLI仕様書 - セクション3](./cli-spec.md#3-オプション一覧) |
| 使用例 | [CLI仕様書 - セクション4](./cli-spec.md#4-使用例) |
| 出力形式 | [CLI仕様書 - セクション5](./cli-spec.md#5-出力構造) |
| 終了コード | [CLI仕様書 - セクション6](./cli-spec.md#6-終了コード) |
| 環境変数 | [CLI仕様書 - セクション7](./cli-spec.md#7-環境変数) |

## 📁 ディレクトリ構造

`docs/` ディレクトリの構成と各サブディレクトリの役割：

### decisions/ - 意思決定記録（ADR: Architecture Decision Records）

過去の重要な技術的決定の記録。解決済み問題の歴史的コンテキストを保持します。

- **命名規則**: `{番号}-{タイトル}.md` (例: `001-playwright-cli-session.md`)
- **用途**: 
  - 技術選択の理由と背景
  - 解決済み問題の詳細な記録
  - 将来の類似問題への参考資料
- **追加時**: 重要な技術的決定や制約が発生した際に追加
- **参照**: AGENTS.md から簡潔にリンク

### verification/ - 検証レポート

完了済みIssueの検証記録。「既に解決済み」であることを証明するドキュメント。

- **命名規則**: `issue-{番号}-{概要}-verification.md`
- **用途**:
  - 報告された問題が既に解決済みであることの証明
  - 将来の類似問題発生時の参照資料
  - 品質保証活動の記録
- **注意**: これらは歴史的記録であり、現在のアクションは不要
- **詳細**: [verification/README.md](./verification/README.md) を参照

### plans/ - 実装計画

Issue実装時の計画書。自動生成され、PRマージ後に削除されます。

- **命名規則**: `issue-{番号}-plan.md`
- **用途**: pi-issue-runner ワークフローによる自動実装時の計画書作成
- **ライフサイクル**: Issue対応中のみ存在、PRマージ後に自動削除
- **注意**: Git追跡対象外（plans/.gitignore で除外）

### その他の主要ファイル

| ファイル | 説明 |
|---------|------|
| cli-spec.md | CLIオプションの完全な仕様（SSOT） |
| design.md | アーキテクチャと設計の詳細 |
| development.md | 開発ワークフロー・テスト方針 |
| maintenance.md | メンテナンス・リリースプロセス |

### ドキュメント追加のガイドライン

新しいドキュメントを追加する際の判断基準：

| 内容 | 追加先 |
|------|--------|
| 技術的な決定・制約 | `decisions/` + AGENTS.md に要約 |
| 問題の検証結果 | `verification/` |
| 実装計画（自動生成） | `plans/` |
| ユーザー向け情報 | `README.md`, `cli-spec.md` など既存ファイルに統合 |
| 開発者向け情報 | `design.md`, `development.md` など既存ファイルに統合 |

## 🔗 関連リンク

- [GitHubリポジトリ](https://github.com/takemo101/dict-skills)
- [piエージェント公式](https://github.com/badlogic/pi)
- [@playwright/cli](https://www.npmjs.com/package/@playwright/cli)
