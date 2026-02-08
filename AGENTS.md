# dict-skills - AI Context

## プロジェクト構造

- `link-crawler/` - メインのクローラー実装

## 既知の制約

| 制約 | 理由 | 詳細 |
|------|------|------|
| デフォルトセッション使用 | playwright-cli 0.0.63+ の仕様変更 | [001](docs/decisions/001-playwright-cli-session.md) |
| 並列クロール不可 | 上記の制約による | [001](docs/decisions/001-playwright-cli-session.md) |
| スキル実行時は `-o` で絶対パス指定必須 | cwdがスキルディレクトリになるため | [006](docs/decisions/006-skill-output-directory.md) |

<!-- 
  ⚠️ このテーブルには「現在有効な制約・注意点」のみを記載
  - エージェントが重要な知見を発見した際、上の表に1行追加し、docs/decisions/ に詳細を記録する
  - 解決済み・不要になった項目は削除する（docs/decisions/ には履歴として残す）
  - 全ての意思決定ログ（解決済み含む）は docs/decisions/README.md を参照
-->

## 設計方針

- **playwright-cli統一**: 全サイト対応、SPA/静的の分岐なし
- **AIファースト出力**: `full.md` はLLMコンテキスト用
- **差分クロール**: `--diff` でハッシュベース変更検知

## 開発時の注意

- playwright-cliのバージョン変更時は [001](docs/decisions/001-playwright-cli-session.md) を確認
- テスト: `cd link-crawler && bun run test`
- 動作確認: `cd link-crawler && bun run src/crawl.ts https://example.com -d 1`

## 関連ドキュメント

- [docs/design.md](docs/design.md) - 詳細設計
- [docs/cli-spec.md](docs/cli-spec.md) - CLIオプション
- [docs/decisions/README.md](docs/decisions/README.md) - 意思決定ログ一覧（解決済み含む）
- [docs/decisions/](docs/decisions/) - 個別の意思決定ログ
