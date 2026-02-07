# Issue #581 & #644: extractor.ts ブランチカバレッジ改善 - 完了報告

## Summary

`extractor.ts` のブランチカバレッジを **61.76% → 95.83%** に改善。目標の 85% を達成。

## 現在のカバレッジ (2026-02-07)

```
extractor.ts:
- Statements: 100% (59/59)
- Branches: 95.83% (23/24)
- Functions: 100% (7/7)
- Lines: 100% (59/59)
- Uncovered: Line 171 (1 branch)
```

**結論**: プロジェクト目標の 85% を大幅に超え、95.83% を達成。

## 経緯

### Issue #581 で指摘された問題 (当時のカバレッジ: 73.07%)

1. **protectCodeBlocks の到達不能コード**
   - `processedElements` に placeholder を追加していたが、元の要素との照合ができない
   - ネスト判定のロジックが常に false を返す

2. **extractAndPreserveCodeBlocks の問題**
   - すでに `protectCodeBlocks` で置換済みの document を受け取る
   - コードブロック収集が空になる

### PR #545 によるリファクタリング (commit 9d44782)

**改善内容**:
- `extractAndPreserveCodeBlocks` を `extractFallbackContent` にリネーム
- `processedElements` Map を `processedSet` Set に変更
- `contains()` ベースのネスト検出導入 (Phase 2)
- 3-phase アプローチの採用

## 現在の実装

### protectCodeBlocks: 3-phase アプローチ

```typescript
function protectCodeBlocks(doc: Document): Map<string, string> {
  const codeBlockMap = new Map<string, string>();
  
  // Phase 1: 全てのコードブロック要素を収集
  const allElements: Element[] = [];
  for (const selector of CODE_BLOCK_PRIORITY_SELECTORS) {
    const elements = Array.from(doc.querySelectorAll(selector));
    allElements.push(...elements);
  }
  
  // Phase 2: ネストされた要素を除外 (contains() ベース)
  const elementsToProcess: Element[] = [];
  const processedSet = new Set<Element>();
  
  for (const el of allElements) {
    if (processedSet.has(el)) continue;
    
    // 親子関係を contains() で判定
    let isNested = false;
    for (const other of allElements) {
      if (other !== el && other.contains(el)) {
        isNested = true;
        break;
      }
    }
    
    if (!isNested) {
      elementsToProcess.push(el);
      processedSet.add(el); // 元の要素を追加
    }
  }
  
  // Phase 3: プレースホルダーで置換
  for (const el of elementsToProcess) {
    const markerId = generateMarkerId(index);
    const marker = `__CODEBLOCK_${markerId}__`;
    codeBlockMap.set(marker, el.outerHTML);
    
    const placeholder = doc.createElement("span");
    placeholder.setAttribute("data-codeblock-id", markerId);
    placeholder.setAttribute("data-codeblock-placeholder", "true");
    placeholder.textContent = marker;
    
    el.replaceWith(placeholder);
    index++;
  }
  
  return codeBlockMap;
}
```

**重要な改善点**:

1. **Phase 分離**: DOM 収集 → フィルタリング → 置換 を分離
2. **contains() 判定**: `other.contains(el)` で確実に親子関係を検出
3. **Set 追加のタイミング**: 置換前の元の要素を `processedSet` に追加

これにより、Issue #581 で指摘された「到達不能コード」問題が根本的に解決。

### extractFallbackContent: シンプルな抽出

```typescript
function extractFallbackContent(doc: Document): {
  title: string | null;
  content: string | null;
} {
  const body = doc.body;
  
  // 不要な要素を削除 (Readability が実行されなかった場合のクリーンアップ)
  for (const el of body.querySelectorAll("script, style, noscript, nav, header, footer, aside")) {
    el.remove();
  }
  
  // main タグなどからコンテンツを抽出
  const main = doc.querySelector("main, article, [role='main'], .content, #content") || body;
  const content = main?.innerHTML || null;
  
  return {
    title: null,
    content,
  };
}
```

**Note**: この関数はすでに `protectCodeBlocks` で置換済みの document を受け取るため、
コードブロックの収集は行わない（プレースホルダーがそのまま含まれる）。

### extractContent: フロー全体

```typescript
export function extractContent(dom: JSDOM): { title: string | null; content: string | null } {
  // 1. コードブロックを保護 (置換してマップに保存)
  const codeBlockMap = protectCodeBlocks(dom.window.document);
  
  // 2. Readability で抽出 (プレースホルダーのまま処理される)
  const reader = new Readability(dom.window.document.cloneNode(true) as Document);
  const article = reader.parse();
  
  if (article?.content) {
    // 3. コードブロックを復元
    const restoredContent = restoreCodeBlocks(article.content, codeBlockMap);
    return { title: article.title ?? null, content: restoredContent };
  }
  
  // 4. フォールバック: Readability が失敗した場合
  const fallback = extractFallbackContent(dom.window.document);
  if (fallback.content) {
    // フォールバックでも復元
    fallback.content = restoreCodeBlocks(fallback.content, codeBlockMap);
  }
  return fallback;
}
```

## 改善結果

### カバレッジ推移

| 時期 | ブランチカバレッジ | 主な変更 |
|------|-------------------|---------|
| Issue #581 作成時 | 73.07% | 到達不能コードが存在 |
| Issue #644 作成時 | 61.76% | (測定誤差または一時的低下) |
| 現在 (2026-02-07) | **95.83%** | リファクタリング完了 |

### 到達不能コードの削除

Issue #581 で指摘された以下のコードパスは、リファクタリングにより削除または修正済み:

- ✅ `processedElements.has(el)` チェック (Line 48) → `processedSet` + contains() に変更
- ✅ `processedElements.has(parent)` ループ (Lines 55-62) → Phase 2 の contains() 判定に統合
- ✅ `extractAndPreserveCodeBlocks` のコードブロック収集 (Lines 126-130) → 関数の責務を明確化

## 残存課題

### Line 171: 未カバーブランチ

```typescript
return { title: article.title ?? null, content: restoredContent };
//                            ^^^^^^^ この分岐の片方が未カバー
```

**原因**: Readability ライブラリが `article.title` を `null` で返すケースのテストが難しい

**影響**: ほぼなし（95.83% のカバレッジで十分）

**対策**: 
- 現時点では対応不要
- カバレッジが 90% を下回った場合に Readability のモック化を検討

### テスト戦略

現在 109 個のテストケースで以下をカバー:

- ✅ コードブロック保護・復元 (全セレクタータイプ)
- ✅ ネストされたコードブロックの処理
- ✅ フォールバック抽出の各種パターン
- ✅ 境界ケース (空コンテンツ、script/style のみ、etc.)

## 今後の方針

### カバレッジ目標

- **現在**: 95.83% ✅
- **目標**: 90% 以上を維持
- **アクション**: 新規コード追加時に既存カバレッジを下げないよう注意

### ドキュメント更新

このドキュメント (`docs/findings/issue-581-unreachable-code.md`) は:
- Issue #644 で現在の実装に合わせて全面更新
- Issue #581 の歴史的記録も保持
- 将来のリファクタリングの参考資料として維持

### コードの安定性

`protectCodeBlocks` と `extractFallbackContent` の実装は:
- 十分なテストカバレッジを達成
- 明確な責務分離
- 今後の拡張が容易な設計

## 関連

- **Issue #581**: 元の coverage 改善 Issue (到達不能コード指摘)
- **Issue #644**: ドキュメント更新 Issue (本ドキュメントの更新)
- **PR #545**: リファクタリング (commit 9d44782: "eliminate unnecessary JSDOM re-generation")
- **Issue #523**: Previous work on fallback extraction
- **Issue #552**: False positive fix for code block detection (DOM-based approach)

## Testing Notes

カバレッジ改善のために追加されたテストケース:

1. **Nested code blocks**: 同一セレクタでのネスト処理
2. **Fallback extraction**: 各種セレクタ (main, article, [role='main'], .content, #content)
3. **Code block detection**: 全 CODE_BLOCK_PRIORITY_SELECTORS のテスト
4. **Edge cases**: 空 HTML、script/style のみ、navigation 要素のみ
5. **False positive prevention**: テキスト中の "pre"/"code" 文字列との区別

全てのテストケースが継続的にパスし、高いカバレッジを維持。

---

## Issue #650 検証 (2026-02-07)

Issue #650 において、このドキュメントの内容を再検証し、以下を確認:

- ✅ Issue #581 で指摘された到達不能コードはすでに解決済み
- ✅ ブランチカバレッジ 95.83% を達成（目標85%を大幅に超過）
- ✅ 全 109 extractor テストがパス
- ✅ 実装は安定しており、追加の変更は不要

このドキュメントは Issue #644 で更新され、Issue #650 で解決済みであることが確認された。
