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

# 出力確認（サイト名ディレクトリ配下に生成されます）
cat .context/example/full.md
```

### 方法2: 手動インストール

```bash
cd link-crawler
bun install

# クロール実行
bun run dev https://docs.example.com -d 2

# 出力確認（サイト名ディレクトリ配下に生成されます）
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
| [プロジェクトREADME](../../README.md) | 初めての方 | 概要・クイックスタート・インストール |
| [SKILL.md](../../link-crawler/SKILL.md) | **piユーザー** | piスキルとしての簡潔な使い方 |
| [CLI仕様書](./cli-spec.md) | **CLIユーザー** | 完全なオプション一覧・詳細な使用例・出力形式の仕様（SSOT） |

### 開発者向け

| ドキュメント | 内容 |
|-------------|------|
| [設計書](./design.md) | アーキテクチャ・データ構造・モジュール設計 |
| [開発ガイド](./development.md) | 開発ワークフロー・コーディング規約・テスト方針 |

## 🚀 目的別ガイド

### 「とにかく早く使いたい」

→ **[プロジェクトREADME](../../README.md)** → [CLI仕様書](./cli-spec.md)

### 「piエージェントで使いたい」

→ **[SKILL.md](../../link-crawler/SKILL.md)**

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

## 🔗 関連リンク

- [GitHubリポジトリ](https://github.com/takemo101/dict-skills)
- [piエージェント公式](https://github.com/badlogic/pi)
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli)
