# CLAUDE.md 精簡 v2

類別：rule
目標：CLAUDE.md
日期：2026-02-21
相關 OP：@op:20260221-JDNE#1100

---

## 背景

CLAUDE.md 第一輪拆分（記錄格式搬到 .claude/rules/record-formats.md）後從 479 行降到 377 行。加上 skill 系統重構（觸發規則表刪除、行為原則寫入），可以同時做第二輪精簡。

## 結論

目標：377 行 → ~250 行（再省 34%，兩輪合計省 48%）。

### 精簡項目

| # | 項目 | 現行行數 | 省多少 | 做法 |
|---|------|---------|--------|------|
| 1 | 同步規範 + Git 協作規範合併 | 112 行 | ~50 行 | 兩段內容重複（pull/push/衝突），合成一個「同步規範」 |
| 2 | 重啟/壓縮流程壓縮 | 58 行 | ~35 行 | 從詳細步驟壓成要點摘要，細節搬到 .claude/rules/startup-flows.md |
| 3 | 方法論段落改寫 | 40 行 | ~20 行 | 刪觸發規則表 + 工具指令表，換成行為原則（見 skill-system-v2.md） |
| 4 | MEMORY.md 規則壓縮 | 33 行 | ~15 行 | 分流表壓成一句話 + 三條要點 |
| 5 | 砍顯而易見的 | ~14 行 | ~10 行 | 良好習慣（基本 git 常識）、已避免碰撞列表 |

### 合併後的同步規範結構（草案）

```markdown
## 同步規範（必須遵守）

Monorepo 透過 GitHub 同步。遠端：https://github.com/Lokianlab/bidding-assistant-monorepo

### 基本節奏

- 推之前先拉：`git pull origin main` → `git add` → `git commit -m "中文摘要"` → `git push origin main`
- 每完成一個工作單元就推一次，不累積。一次 push 包含代碼 + OP 記錄 + 快照。
- 長時間討論產生重要決策 → 主動暫停，先推結論再繼續。
- 不要隨意更新 CLAUDE.md，日常結論用 /暫存。

### 衝突處理

- 記錄層檔案：永遠保留兩邊內容
- 程式碼：讀懂兩邊改動，合併後跑測試
- package-lock.json：刪掉重裝
- CLAUDE.md：重啟或 /更新 時讀 diff 檢查語義一致性
- 暫存檔矛盾：都保留，/修改計畫 時讓用戶裁決

### 分支策略

- main = 穩定主幹，大功能用分支（格式 {machine}/{topic}）
- 機器對等，不限數量，互相可審閱

### 重啟流程

git status → 有未提交就 commit → pull → 碰撞偵測（CLAUDE.md 一致性 + Topic ID 重複 + MEMORY.md 清理）→ 代碼變化時 npm test → 讀 index + snapshot + staging 恢復上下文（Layer 0-4）→ 報告差異

### 壓縮流程

確認 pre-compact hook 做完的 commit/push → 有 pull 變化則碰撞偵測 → 讀 snapshot 恢復上下文 → 接回工作
```

### 壓縮後的 MEMORY.md 規則（草案）

```markdown
### MEMORY.md 維護規則

MEMORY.md（`.claude/projects/` 內）是本機限定暫存筆記，不經 git 同步。

只有三類內容進 MEMORY.md：首次觀察（根因不明的除錯現象）、本機限定偏好、本機環境問題。其他全寫共享位置（除錯→debugging.md、規範→CLAUDE.md、決策→/暫存、方法論→methodology/）。

首次觀察再次遇到且確認為通用問題 → 搬到共享位置 → 從 MEMORY.md 刪除。超過 150 行時精簡。
```

## 寫入內容

見上方草案。需要在執行時根據實際合併結果調整。

## 整合指南

1. 先執行 skill-system-v2.md 的方法論段落改動（行為原則取代觸發表）
2. 合併「自動同步規範」(66-119) 和「Git 協作規範」(256-313) 為一個「同步規範」段落
3. 重啟/壓縮流程壓成摘要，詳細步驟考慮搬到 .claude/rules/startup-flows.md
4. MEMORY.md 規則壓縮
5. 砍良好習慣、已避免碰撞列表
6. 執行順序建議：先改方法論段落 → 再合併同步段落 → 最後壓縮其他
