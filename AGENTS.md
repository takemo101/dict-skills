# dict-skills - AI Context

## プロジェクト構造

- `link-crawler/` - メインのクローラー実装

## 既知の制約

| 制約 | 理由 | 詳細 |
|------|------|------|
| デフォルトセッション使用 | playwright-cli 0.0.63+ の仕様変更 | [001](docs/decisions/001-playwright-cli-session.md) |
| 並列クロール不可 | 上記の制約による | [001](docs/decisions/001-playwright-cli-session.md) |

<!-- エージェントが重要な知見を発見した際、上の表に1行追加し、docs/decisions/ に詳細を記録する -->

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
- [docs/decisions/](docs/decisions/) - 意思決定ログ
