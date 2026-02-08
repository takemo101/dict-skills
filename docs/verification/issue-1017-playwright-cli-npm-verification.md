# Issue #1017 検証レポート: playwright-cli npm パッケージリンクの正確性

**Issue**: #1017  
**タイトル**: docs: README.md の playwright-cli npm パッケージリンクが不正確  
**検証日**: 2026-02-08  
**結果**: ✅ **既に正しい状態**

## 概要

README.md と SKILL.md で playwright-cli の npm パッケージリンクが `https://www.npmjs.com/package/@playwright/cli` と記載されているが、この正確性を検証した結果、**リンクは正しい**ことが確認された。

## 検証内容

### 1. npm パッケージの確認

```bash
$ npm view @playwright/cli

@playwright/cli@0.1.0 | Apache-2.0 | deps: 2 | versions: 8
Playwright CLI
https://playwright.dev

bin: playwright-cli

repository = {
  type: 'git',
  url: 'git+https://github.com/microsoft/playwright-cli.git'
}

homepage = 'https://playwright.dev'

maintainers:
- pavelfeldman <pavel.feldman@gmail.com>
- yurys <yury.semikhatsky@gmail.com>
- dgozman-ms <dgozman@microsoft.com>
- playwright-bot <playwright-npm-bot@microsoft.com>
```

### 2. 公式性の確認

✅ **確認事項**:
- リポジトリ: https://github.com/microsoft/playwright-cli.git （Microsoft 公式）
- メンテナー: Playwright チームメンバー
- ホームページ: https://playwright.dev （公式サイト）
- ライセンス: Apache-2.0
- 提供コマンド: `playwright-cli`

### 3. 現在のプロジェクトでの使用状況

```bash
$ npm list -g @playwright/cli
/opt/homebrew/lib
└── @playwright/cli@0.0.63

$ playwright-cli --version
0.0.63
```

✅ プロジェクトは `@playwright/cli@0.0.63` を使用中で、正常に動作している。

### 4. install.sh との整合性

`link-crawler/install.sh` (Line 58):
```bash
npm install -g @playwright/cli
```

✅ install.sh のインストールコマンドと完全に一致している。

### 5. 他のパッケージとの比較

#### `playwright-cli` (スコープなし)

```bash
$ npm view playwright-cli

playwright-cli@0.261.0 | Apache-2.0 | deps: 1 | versions: 106
Playwright CLI
https://playwright.dev

dependencies:
@playwright/cli: 0.0.61
```

このパッケージは `@playwright/cli` への**ラッパー**であり、実態は `@playwright/cli` を使用している。

#### `@playwright/test`

Playwright のテストフレームワーク本体。CLIスタンドアロンツールとは異なる用途。

## 結論

### 検証結果

| 項目 | 状態 | 備考 |
|------|------|------|
| パッケージの存在 | ✅ 正常 | npm で公開中 |
| 公式性 | ✅ 正常 | Microsoft/Playwright 公式リポジトリ |
| install.sh との一致 | ✅ 正常 | コマンドが一致 |
| 実際の動作 | ✅ 正常 | プロジェクトで使用中（v0.0.63） |
| リンク先の正確性 | ✅ 正常 | 正しいパッケージページ |

### 総合判定

**✅ README.md と SKILL.md の playwright-cli npm パッケージリンクは正確である**

- `https://www.npmjs.com/package/@playwright/cli` は正しいリンク
- `@playwright/cli` は Microsoft/Playwright の公式パッケージ
- 現在のドキュメントに誤りはない

## 対応

### 実施した変更

Issue で指摘された問題は存在しなかったため、以下の対応を実施：

1. ✅ **検証レポートの作成** (本ドキュメント)
2. ✅ **ドキュメントの明確化**: リンクテキストを実際のパッケージ名に合わせて変更

   ```markdown
   # Before (内容は正しいが、リンクテキストがパッケージ名と異なる)
   [playwright-cli](https://www.npmjs.com/package/@playwright/cli)
   
   # After (パッケージ名と一致するよう明確化)
   [@playwright/cli](https://www.npmjs.com/package/@playwright/cli)
   ```

   これにより、ユーザーが「playwright-cli というパッケージが存在するのか？」という混乱を避けられる。

### 今後の対応

- 特になし（現状で問題なし）
- バージョンアップ時も `npm install -g @playwright/cli` で対応可能

## 関連ドキュメント

- [docs/decisions/001-playwright-cli-session.md](../decisions/001-playwright-cli-session.md) - playwright-cli 0.0.63+ の仕様変更対応
- [link-crawler/install.sh](../../link-crawler/install.sh) - インストールスクリプト
- [公式リポジトリ](https://github.com/microsoft/playwright-cli)
- [npm パッケージページ](https://www.npmjs.com/package/@playwright/cli)

## まとめ

この Issue は「既に正しい状態」であることが判明しました。ただし、よりユーザーフレンドリーにするため、リンクテキストをパッケージ名 `@playwright/cli` に統一する小規模な改善を行いました。
