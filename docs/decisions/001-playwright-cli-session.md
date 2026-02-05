# 001: playwright-cli セッション問題 (2026-02-05)

## 概要

playwright-cli 0.0.63+ でセッション管理の仕様が変更され、link-crawlerが動作しなくなった。

## 問題1: Unixソケットパス長制限

### 症状

```
Error: listen EINVAL: invalid argument /var/folders/.../playwright-cli/<hash>/crawl-1770282017186.sock
```

### 原因

- playwright-cliはセッションごとにUnixソケットを作成
- パス: `/var/folders/.../playwright-cli/<hash>/<sessionId>.sock`
- sessionIdが `crawl-${Date.now()}` (例: `crawl-1770282017186`) で長い
- Unixソケットパスの制限は約108文字
- 合計パス長が制限を超過

### 対応

sessionIdを短縮:
```typescript
// Before
this.sessionId = `crawl-${Date.now()}`;  // crawl-1770282017186 (18文字)

// After
this.sessionId = `c${Date.now().toString(36)}`;  // cml98fkjy (9文字)
```

## 問題2: --session オプションの仕様変更

### 症状

```
The session is already configured. To change session options, run:
  playwright-cli --session=xxx config 
```

2回目以降のコマンド（eval, network等）が失敗。

### 原因

playwright-cli 0.0.63+ では、`--session=xxx` でセッション作成後、同じセッションに対して再度 `--session=xxx` を指定すると「既に設定済み」エラーになる。

### 試したこと

1. `--session=xxx` を毎回指定 → ❌ "already configured" エラー
2. 最初だけ `--session=xxx`、以降は省略 → ❌ デフォルトセッションになる
3. 全てデフォルトセッション使用 → ✅ 動作する

### 対応

デフォルトセッション（--session省略）を使用:
```typescript
// Before
["open", url, "--session", this.sessionId]
["eval", expr, "--session", this.sessionId]
["close", "--session", this.sessionId]

// After
["open", url]
["eval", expr]
["session-stop"]
```

### 制約

- 並列クロールは不可（複数セッションを同時に使えない）
- 通常の逐次クロールでは問題なし

## 関連ファイル

- `src/crawler/fetcher.ts` - 修正箇所
- `docs/design.md` - 設計書のコード例も更新

## 参考

- Node.js: v25.2.1
- playwright-cli: 0.0.63
