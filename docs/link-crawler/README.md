# Link Crawler ドキュメント

link-crawlerの技術ドキュメントへようこそ。このページは各ドキュメントへのナビゲーションです。

## 📚 ドキュメント一覧

### 利用者向け

| ドキュメント | 対象読者 | 内容 |
|-------------|---------|------|
| [プロジェクトREADME](../../README.md) | 初めての方 | 概要・クイックスタート |
| [SKILL.md](../../link-crawler/SKILL.md) | piユーザー | piスキルとしての使い方 |
| [CLI仕様](./cli-spec.md) | CLIユーザー | 完全なオプション一覧・使用例・出力形式 |

### 開発者向け

| ドキュメント | 内容 |
|-------------|------|
| [設計書](./design.md) | アーキテクチャ・データ構造・モジュール設計 |

## 🚀 クイックスタート

### 基本的なインストールと実行

```bash
# 依存関係のインストール
cd link-crawler
bun install

# クロール実行
bun run link-crawler/src/crawl.ts https://docs.example.com -d 2

# 出力確認
cat .context/example-docs/full.md
```

### piスキルとして使う

```bash
# グローバルスキルとして登録
ln -s /path/to/link-crawler ~/.pi/agent/skills/link-crawler

# piエージェントから利用
# → "Next.jsのドキュメントをクロールして設計の参考にしたい"
```

## 💡 目的別ガイド

### 使い方を詳しく知りたい

→ **[CLI仕様書](./cli-spec.md)** を参照してください

- 全オプションの詳細説明
- 様々なユースケースの使用例
- 出力形式の完全な仕様

### piエージェントで使いたい

→ **[SKILL.md](../../link-crawler/SKILL.md)** を参照してください

- piスキルとしてのセットアップ
- piエージェントでの使用例
- AIコンテキストとしての活用方法

### 開発に参加したい

→ **[設計書](./design.md)** を参照してください

- アーキテクチャの全体像
- データフロー
- モジュール構成と責務
- 技術スタック

## 🔗 関連リンク

- [GitHubリポジトリ](https://github.com/takemo101/dict-skills)
- [piエージェント公式](https://github.com/badlogic/pi)
- [playwright-cli](https://www.npmjs.com/package/@playwright/cli)
