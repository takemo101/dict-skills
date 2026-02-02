# Issue #120 実装計画

## 概要
`docs/link-crawler/README.md`内のドキュメントリンクパスを修正します。現在`../docs/link-crawler/`という不正な相対パスが使用されていますが、ファイルは既に`docs/link-crawler/`ディレクトリ内にあるため、`./`相対パスに修正する必要があります。

## 影響範囲
- `docs/link-crawler/README.md` (3箇所のリンク修正)

## 実装ステップ
1. `docs/link-crawler/README.md` を読み込み
2. 以下のリンクパスを修正：
   - `../docs/link-crawler/design.md` → `./design.md`
   - `../docs/link-crawler/cli-spec.md` → `./cli-spec.md`
   - `../docs/link-crawler/development.md` → `./development.md`
3. 修正後、リンク先ファイルが存在することを確認

## テスト方針
- リンク切れチェック：`grep -n "../docs/link-crawler" docs/link-crawler/README.md` が0件であることを確認
- リンク先存在確認：`ls docs/link-crawler/{design.md,cli-spec.md,development.md}` で全ファイルが存在することを確認

## リスクと対策
- **リスク**: なし（単純なパス修正）
- **対策**: 修正後の grep 検索で誤修正がないことを確認
