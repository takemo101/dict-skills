# Issue #73 実装計画

## 概要
Biomeの `organizeImports` ルールに違反しているimport文の順序を修正する。

## Issue分析
- `npm run check` 実行時に、`src/crawler/index.ts` でimport順序の警告が表示される
- Biomeの自動修正機能 (`npm run fix`) を使用して解決可能

## 影響範囲
- `link-crawler/src/crawler/index.ts` のimport文のみ

## 実装ステップ
1. `cd link-crawler` でディレクトリ移動
2. `npm run fix` で自動修正を実行
3. `npm run check` で警告が解消されたことを確認

## 修正内容

### Before (未ソート)
```typescript
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { computeHash, Hasher } from "../diff/hasher.js";
import { OutputWriter } from "../output/writer.js";
import { Merger } from "../output/merger.js";
import { Chunker } from "../output/chunker.js";
```

### After (ソート済み)
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { computeHash, Hasher } from "../diff/hasher.js";
import { Chunker } from "../output/chunker.js";
import { Merger } from "../output/merger.js";
import { OutputWriter } from "../output/writer.js";
```

## テスト方針
- `npm run check` で `organizeImports` 警告が0件であることを確認
- 既存のテストがパスすることを確認（該当すれば）

## リスクと対策
- **リスク**: 自動修正による意図しない変更
- **対策**: 修正後にdiffを確認し、import順序のみの変更であることを確認
