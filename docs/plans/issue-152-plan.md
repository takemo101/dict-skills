# 実装計画書: Issue #152

## 概要

CLI仕様書（`docs/link-crawler/cli-spec.md`）と実装コード（`link-crawler/src/crawl.ts`）で `--chunks` オプションのデフォルト値が矛盾している問題を修正する。

## 影響範囲

- `docs/link-crawler/cli-spec.md` - ドキュメント修正のみ

## 実装ステップ

1. **オプションテーブルの修正** (3.4 出力制御)
   - `--no-chunks` → `--chunks` に変更
   - デフォルト値 `false` を追加
   - 説明を「チャンク分割出力を無効化」→「チャンク分割出力を有効化」に変更

2. **使用例セクションの修正** (4.4 出力形式制御)
   - `crawl https://docs.example.com --no-pages --no-chunks` の例を修正
   - `--chunks` を使わない例に変更（`--no-pages` のみにする）

## テスト方針

- `bun run link-crawler/src/crawl.ts --help` で `--chunks` が表示されることを確認
- `--no-chunks` は表示されないことを確認

## リスクと対策

- **リスク**: なし（ドキュメント修正のみ）
- **対策**: 実際のコード動作と一致させることでリスクを低減
