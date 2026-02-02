# Issue #170 実装計画書

## 1. 概要

設計書（`docs/link-crawler/design.md`）のモジュール構成図とモジュール責務表を、実際のディレクトリ構造に合わせて更新する。

## 2. 影響範囲

- **変更対象ファイル**: `docs/link-crawler/design.md`
- **変更箇所**:
  1. 3.2 モジュール構成（ディレクトリツリー図）
  2. 3.3 モジュール責務（責務表）

## 3. 実装ステップ

### Step 1: 実際のディレクトリ構造を確認

実際の構造:
```
link-crawler/src/
├── crawl.ts
├── config.ts
├── types.ts
├── constants.ts         <- 設計書に不足
├── errors.ts            <- 設計書に不足
├── crawler/
│   ├── index.ts
│   ├── fetcher.ts
│   ├── logger.ts        <- 設計書に不足
│   └── post-processor.ts <- 設計書に不足
├── parser/
│   ├── extractor.ts
│   ├── converter.ts
│   └── links.ts
├── diff/
│   ├── hasher.ts
│   └── index.ts         <- 設計書に不足
├── output/
│   ├── writer.ts
│   ├── merger.ts
│   ├── chunker.ts
│   └── index-manager.ts <- 設計書に不足
├── types/
│   └── turndown-plugin-gfm.d.ts  <- 設計書に不足
└── utils/
    └── runtime.ts       <- 設計書に不足
```

### Step 2: モジュール構成図を更新

設計書の3.2節「モジュール構成」のディレクトリツリーを更新:

```
link-crawler/
├── SKILL.md
├── src/
│   ├── crawl.ts                # エントリーポイント
│   ├── config.ts               # 設定パース
│   ├── types.ts                # 型定義
│   ├── constants.ts            # 定数定義
│   ├── errors.ts               # エラークラス
│   │
│   ├── crawler/
│   │   ├── index.ts            # CrawlerEngine
│   │   ├── fetcher.ts          # PlaywrightFetcher
│   │   ├── logger.ts           # ログ出力
│   │   └── post-processor.ts   # 後処理
│   │
│   ├── parser/
│   │   ├── extractor.ts        # HTML → 本文抽出
│   │   ├── converter.ts        # HTML → Markdown
│   │   └── links.ts            # リンク抽出・正規化
│   │
│   ├── diff/
│   │   ├── index.ts            # バレルエクスポート
│   │   └── hasher.ts           # SHA256ハッシュ・差分検知
│   │
│   ├── output/
│   │   ├── writer.ts           # ページ書き込み
│   │   ├── merger.ts           # full.md 生成
│   │   ├── chunker.ts          # chunks/*.md 生成
│   │   └── index-manager.ts    # index.json管理
│   │
│   ├── types/
│   │   └── turndown-plugin-gfm.d.ts  # Turndown型定義
│   │
│   └── utils/
│       └── runtime.ts          # ランタイムアダプター
│
├── package.json
├── tsconfig.json
├── biome.json
└── .gitignore
```

### Step 3: モジュール責務表を更新

設計書の3.3節「モジュール責務」に以下を追加:

| モジュール | 責務 | 入力 | 出力 |
|-----------|------|------|------|
| `Constants` | 定数定義（デフォルト値、ファイル名、パターン等） | - | 定数オブジェクト |
| `Errors` | エラークラス定義（基底エラー、特定エラー） | Error情報 | Typed Error |
| `CrawlLogger` | クロールログ出力（開始、進捗、完了等） | Config | コンソール出力 |
| `PostProcessor` | 後処理実行（Merger/Chunker呼び出し） | CrawledPages | full.md, chunks/ |
| `IndexManager` | index.jsonの読み込み・保存・管理 | CrawledPage | index.json |
| `RuntimeAdapter` | ランタイム抽象化（Bun/Node互換） | Command | SpawnResult |

## 4. テスト方針

- ドキュメント更新のみのため、コード変更はなし
- 変更後にビルド・テストが正常に動作することを確認

## 5. リスクと対策

| リスク | 対策 |
|--------|------|
| 責務の記述が不正確 | ソースコードを確認して正確な責務を記載 |
| 構造が将来的に再び不一致になる | 設計書に「最終更新日」を明記することで検知しやすくする |

## 6. 完了条件

- [ ] 設計書のモジュール構成図を更新
- [ ] 追加されたモジュールの責務を「3.3 モジュール責務」表に追加
