# Implementation Plan: Issue #81

## 概要
Biome CLIバージョン (2.3.13) と biome.json のスキーマバージョン (2.0.0) が一致していないため、警告が表示されています。この問題を修正するために、biome.json のスキーマバージョンを 2.3.13 に更新します。

## 影響範囲
- `link-crawler/biome.json` - 1行のみ変更

## 実装ステップ
1. biome.json の `$schema` フィールドを更新
   - Before: `"$schema": "https://biomejs.dev/schemas/2.0.0/schema.json"`
   - After: `"$schema": "https://biomejs.dev/schemas/2.3.13/schema.json"`
2. npm run check を実行して警告が消えることを確認

## テスト方針
- `npm run check` を実行し、スキーマバージョン警告が表示されないことを確認

## リスクと対策
- リスク: 低（単純なバージョン番号の更新のみ）
- 対策: Biome 2.3.13 のスキーマ互換性を確認済み（同じメジャーバージョン内のマイナーアップデート）
