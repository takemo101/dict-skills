# 006: スキル実行時の出力ディレクトリ問題 (2026-02-08)

## 問題

link-crawler スキルを `cd link-crawler && bun run src/crawl.ts <url>` で実行すると、
`.context/` と `.playwright-cli/` がスキルディレクトリ内に作成されてしまう。

これらはプロジェクトルート（piを起動したディレクトリ）に作成されるべき。

### 原因

1. **`.context/`**: `-o` オプション未指定時、デフォルトが `process.cwd()` 基準の相対パス `./.context/<site-name>` になる
2. **`.playwright-cli/`**: playwright-cli が `process.cwd()` にセッションファイルを作成する。`spawn` 時に `cwd` を指定していなかった

## 対応

### `.context/` — SKILL.md で運用ルールを明記

`-o` オプションでプロジェクトルート配下の絶対パスを必ず指定するようSKILL.mdに記載。

### `.playwright-cli/` — コード修正

- `RuntimeAdapter.spawn()` に `cwd?` パラメータを追加
- `PlaywrightFetcher.runCli()` で `config.outputDir` を `cwd` として渡す
- クリーンアップ・ネットワークログのパス解決も `outputDir` ベースに変更

## 教訓

piスキルは**スキルディレクトリ内で実行されるが、出力はプロジェクトルートに向けるべき**。
新しいスキルやツールを実装する際は以下を確認すること：

1. ファイル出力は絶対パスで指定する（相対パスの `process.cwd()` 依存を避ける）
2. 外部CLIツールの `spawn` 時は `cwd` を明示的に指定する
3. SKILL.md にエージェント向けの出力先ルールを明記する
