# 記錄格式完整參考

需要寫 OP、快照、審查結果、訊息時，Read 此檔看範例。平時不需載入。

---

## OP 記錄範例

檔名：`{YYYYMMDD}-{機器碼}.md`，時間戳 UTC+8。每筆 OP 用 `---` 分隔：

```
OP|{YYYYMMDD}-{HHMM}|{機器碼}|topic:{主題ID}
自然語言描述（發生什麼、為什麼、學到什麼）
---
```

- topic 可選，跨 session/跨機器才需要
- 只記例外：失敗、意外、重要決策、教訓

## Topic ID 命名

格式：`{類別}-{描述}`，小寫英文+連字號，≤20 字元。
類別：`feat`/`fix`/`plan`/`cleanup`/`infra`/`doc`

## Commit Message 範例

```
[類型] 一句話（機器碼）
```

| 標籤 | 含義 |
|------|------|
| `feat` | 產品功能 |
| `fix` | 修 bug |
| `test` | 補測試 |
| `review` | 審查結果 |
| `infra` | 基建 |
| `admin` | 行政 |

## 快照範例

```
SNAPSHOT|{YYYYMMDD-HHMM}|{機器碼}|{模型}
[ ] topic|desc|progress
[>] topic|desc|in-progress-note
[x] topic|desc|ref
[?] topic|desc|reason
[~] topic|desc|放棄：reason
```

### 時間戳取法
```bash
# 日期：從 system prompt currentDate（如 2026-02-23 → 20260223）
# 時分：powershell -c "Get-Date -Format 'HHmm'"
```

### `[>]` 補測試粒度
連續多天補同一測試檔 → 描述標具體檔名，避免碰撞：
```
[>] feat-test|orchestrateAccept.test.ts|補整合測試中
```

### 完成標準
L1: test+build; L2: +非作者審查; L3: +Jin確認

### 更新流程
1. 讀舊 snapshot
2. [x]/[~] 遷入 `_snapshot-archive.md` 再刪除
3. 逐項更新留下的
4. 加新項目
5. Write 覆蓋

## 審查結果格式

```
[x] review-{模組}|{模組}審查完成|PASS：{N} issues，{M} fixed，{K} deferred
  [deferred] {issue 描述}
```

## 主題索引

每行：`{topic}|{狀態}|{一句話}|{出處}|{日期}`
狀態：`進行中`/`完成`/`已被取代`/`已放棄`

## 跨 session 訊息

```
docs/records/messages/
  {YYYYMMDD}-{HHMM}-{寄件人}-to-{收件人}.md
  archive/
```

訊息格式：
```
MSG|{YYYYMMDD}-{HHMM}|{寄件人}|to:{收件人}
{壓縮短格式內容}
```

收件人 = 機器碼 或 `ALL`。收發：Write→git push; SessionStart hook 自動掃描; 已讀搬 archive/。
