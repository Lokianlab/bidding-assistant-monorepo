# 全能標案助理 — 專案根目錄規範

## 專案結構

```
cc程式/                      ← 專案根目錄（每台機器各自 clone，不放 OneDrive）
  bidding-assistant/         ← 主 Web App（Next.js 16 + React 19）
  smugmug-mcp/               ← SmugMug MCP Server
  pcc-api-mcp/               ← PCC 標案 API MCP Server
  pcc-monitor/               ← PCC API 更新延遲監控
  docs/                      ← 跨子專案共用文件
    records/                  ← 記錄層（AI 自動維護，詳見下方規範）
    operation-log.md          ← 操作日誌（已停用，歷史保留）
    機器設定指南.md            ← 新機器設定步驟
    methodology/              ← 方法論（索引 + 各方法詳細文件）
```

各子專案有自己的 CLAUDE.md（如 `bidding-assistant/CLAUDE.md`），本檔為根目錄共用規範。

---

## 專案背景（所有機器必須知道）

### 技術棧
- Node.js v22 + npm 10 + Git 2.53 + GitHub CLI
- Next.js 16.1.6 + React 19 + TypeScript 5 + Tailwind CSS 4 + Turbopack
- UI: shadcn/radix-ui (new-york style)，圖表: recharts
- 資料: Notion API，設定: localStorage
- 測試: Vitest 4 + Testing Library（26 files, 560 tests）
- Dev port: 3000（Next.js 預設）

### 系統定位
- **提案寫作駕駛艙**（不是儀表板/看板/RAG 聊天機器人）
- Discord Bot = 主要操作介面（駕駛座），Web app = 管理後台

### 架構重點
- Feature Registry Pattern：所有功能在 `FEATURE_REGISTRY` 註冊
- SSOT：常數在 `src/lib/constants/`，設定在 `src/lib/settings/`
- 資料/UI 分離：`src/lib/`（邏輯）vs `src/components/`（渲染）
- bidding-assistant/CLAUDE.md 有完整開發規範

### Agent 架構（雙層策略）
- **施工層**：Claude Code Agent Team（開發時用）
- **產品層**：Claude Code SDK + Discord Bot（5 個 AI Agent：戰略官/企劃官/品管官/知識官/簡報官）
- 全部走現有訂閱，額外成本 = $0

### MCP Server
- SmugMug MCP：已建好（`smugmug-mcp/`）
- Notion MCP：待建（本地版，讓三家 AI 都能用）
- PCC 標案 API MCP：待建（g0v 免費 API，有評委名單、投標金額等）
- PCC MCP 建議併入 Layer 0 同步建設

### 開發路線
- Layer 0：知識庫（00A-00E）+ PCC MCP
- Layer 1：P0 Bot 基礎 → P1 戰略+知識庫 → P2 寫作+品管
- Layer 2：統一 AI 調度 + 排版輸出
- Layer 3：視覺生成整合

### 已知注意事項
- Windows 上 Claude Code 用 bash 語法（Unix 風格）
- 避免 `> nul`（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`
- npm registry 用官方 `https://registry.npmjs.org/`（不要用 npmmirror）
- 詳細開發環境見 `docs/dev-environment.md`
- 除錯經驗見 `docs/debugging.md`
- 討論結論暫存在 `bidding-assistant/docs/dev-plan/_staging/`

---

## 自動同步規範（必須遵守）

本專案透過 **GitHub** 同步，不使用 OneDrive。多台機器同時在線，必須頻繁同步。

### 何時拉（git pull）

- **對話開始時**：執行重啟流程（見下方）
- **context compact 後**：執行壓縮流程（見下方）
- **準備修改檔案前**：先 pull 確保拿到最新版

### 何時推（git commit + push）

- **每完成一個工作單元就推一次**，不要累積。一次 push 包含：
  - 代碼/文件改動
  - 對應的 OP 記錄（如果有結論）
  - 快照更新
  - 這三者合在同一次 commit，不拆開
- **commit message 用中文**，簡述做了什麼

### 結論同步規則（必須遵守）

**每次 git push 時**，順便檢查有沒有漏推的結論。

**長時間討論中**，如果已經產生重要決策但還沒改檔案，主動暫停討論，先把結論推上去：
1. 寫 OP 記錄 + 更新快照
2. **可搭配 `/暫存`** 寫入開發計畫暫存檔
3. `git add` → `git commit` → `git push`
4. 然後再繼續討論

**不要隨意更新 `CLAUDE.md`** — 只有改規範或架構等級的大事（例如：技術棧變更、新的開發規則）才動。日常討論結論一律用 `/暫存`。

**不能只寫進本機 MEMORY.md。** 其他機器看不到 MEMORY.md。

### 定時同步（每 30 分鐘）

長時間對話中，**每 30 分鐘必須執行一次 git pull + push**，即使沒有新的改動也要 pull 確認。

- 對話開始或 context compact 後啟動計時（第一次 pull 即為起點）
- 每次完成 pull 或 push 時重置計時
- 如果距離上次拉推已超過 30 分鐘，立即執行：
  1. `git pull origin main`
  2. 有未推的改動 → `git add` + `git commit` + `git push`
  3. 沒有改動 → pull 完即可，重置計時
- 這條規則與「每完成一個操作就推一次」並行，取較早觸發的那個

### 同步指令

```bash
# 每次推之前都先拉（避免三台機器越走越遠）
git pull origin main
git add <修改的檔案>
git commit -m "簡述做了什麼"
git push origin main
```

**重點：不是只有開工拉一次。每次推之前都要先拉，確保拿到其他機器的最新改動。**

### 如果 pull 有衝突

1. 讀取衝突檔案，理解兩邊的改動
2. 合併成正確版本（保留兩邊有意義的內容）
3. `git add` → `git commit` → `git push`
4. 記錄層檔案的衝突：**永遠保留兩邊的記錄**，不刪除任何一方的內容

---

## 記錄層規範（必須遵守）

所有 Claude Code session 的操作透過 `docs/records/` 自動記錄。

### 目錄結構

```
docs/records/
  _index.md                 ← 主題索引（所有主題的一句話結論）
  _snapshot-{機器碼}.md      ← 各機器的工作備忘錄
  2026-02/                   ← 按月分子目錄
    20260219-JDNE.md         ← 每日每台機器一個檔案
```

### 機器代號

- 存放在專案根目錄 `.machine-id`（已 gitignored）
- 格式：`[A-Z0-9]{4}`，隨機生成，生成後永不改變
- 首次啟動沒有此檔時：自動生成隨機碼，掃描已存在的 `_snapshot-*.md` 避免碰撞

### OP 記錄格式（每日一檔，追加寫入）

檔名：`{YYYYMMDD}-{機器碼}.md`，時間戳用台北時間 UTC+8。
每筆 OP 用 `---` 分隔。每筆 OP 前兩行是 header：

```
OP|{YYYYMMDD}-{HHMM}|{機器碼}|{狀態}|topic:{主題ID}
{操作摘要}|F:{關鍵檔案}
---
背景: ...
操作: ...
結果: ...
```

- **第一行**：結構化元資料（日期、機器、狀態、主題）→ 結構化查詢用
- **第二行**：操作摘要 + 關鍵檔案 → 關鍵字搜尋用
- **狀態值**：`成功` / `失敗` / `進行中` / `修正`
- **topic**：可選。跨 session 或跨機器的工作才需要
- **必填欄位**：背景、操作、結果
- **選填欄位**：決策、檔案、細節、教訓

### Topic ID 命名規範

格式：`{類別}-{描述}`，描述用小寫英文+連字號，不超過 20 字元。
類別詞彙表：`feat`(新功能) / `fix`(修正) / `plan`(計畫) / `cleanup`(清理) / `infra`(基建) / `doc`(文件)
寫 OP 時先掃最近記錄，有已存在的相近 topic 就沿用。

### 修正記錄

不改原檔，寫新的 OP，摘要前綴「修正:」，背景欄引用原記錄。

### 快照

檔名：`_snapshot-{機器碼}.md`，定位為本機工作備忘錄。

```
SNAPSHOT|{YYYYMMDD-HHMM}|{機器碼}
[ ] {主題ID}|{描述}|{進度}
[x] {主題ID}|{描述}|{OP引用}
[?] {主題ID}|{描述}|{未決原因}
```

### 主題索引（`_index.md`）

每個主題一行：`{topic}|{狀態}|{一句話結論}|{最新出處}|{最後更新}`
寫 OP 或小結時自動更新。啟動時一次 Read 即可了解所有主題現況。

### 觸發規則

| 事件 | 動作 |
|------|------|
| git push | OP 記錄（如有結論）+ 快照更新 + 主題索引更新 |
| 空 session | 不寫任何東西 |

「有結論」= 改了檔案，或用戶做了決策。

Stop hook（`.claude/hooks/stop-check.sh`）會在 AI 回覆後自動檢查未提交改動，不靠 AI 自律。

### 寫入前自我檢查

1. 兩行 header 格式正確？
2. 背景、操作、結果三個必填欄位都有？
3. 檔名格式正確？月份子目錄存在？
4. 內容夠具體？（背景和操作各至少 20 字）

### 重啟流程（新 session 開始時執行）

```
1. 恢復檢查 + pull
   git status → 有未提交檔案？
   ├─ 有 → commit → pull → push
   ├─ 缺必填欄位 → 補註「中斷恢復」→ commit → pull → push
   └─ 無 → git pull origin main

2. 碰撞偵測（pull 有變化時）
   a. CLAUDE.md 一致性：讀 diff，檢查新規則是否與現有規則矛盾
   b. Topic ID 重複：掃 _index.md，相似概念不同 ID → 提醒合併
   c. MEMORY.md 清理：CLAUDE.md 有變更 → 刪已涵蓋項目

3. 條件式環境驗證（pull 有代碼變化時）
   npm install → npm test → npm run build
   失敗 → rm -rf node_modules → npm install → npm test

4. 完整恢復上下文
   Layer 0:   _index.md → 全局現況
   Layer 0.5: _staging/_index.md → 待推結論 + 待決討論
   Layer 1:   _snapshot-{自己}.md → 上次中斷進度
   Layer 2:   所有 _snapshot-*.md → 其他機器進度
   Layer 3:   近期 OP header（最多 30 筆）
   Layer 4:   按需搜尋

5. 差異摘要 + 回報
   - 其他機器最近做了什麼
   - 同 topic 多台機器 → 標出
   - 版本狀態、測試結果、碰撞偵測結果
```

### 壓縮流程（context compact 後執行）

壓縮前 hook（`.claude/hooks/pre-compact.sh`）自動執行 add → commit → pull → push（不保證完成）。

```
1. 恢復檢查
   git status → hook 沒做完的？
   ├─ 未 add → add → commit → pull → push
   ├─ 未 commit → commit → pull → push
   ├─ 未 push → pull → push
   └─ 乾淨 → 繼續

2. 條件式碰撞偵測
   步驟 1 有 pull 且有變化 → 執行碰撞偵測（同重啟步驟 2）

3. 恢復上下文（輕量版）
   讀 _snapshot-{自己}.md → 近期 OP

4. 接回工作
```

### 三層檢索架構

```
主題索引 _index.md    ← 「是什麼」「目前狀態」（1 次 Read）
    ↓ 需要更多細節
小結（待建）          ← 「為什麼」「決策脈絡」（1 次 Read）
    ↓ 需要原始細節
OP 記錄               ← 完整操作過程（grep + Read）
```

查詢時從上往下找，大部分問題在前兩層就能回答。
小結的讀取範圍 = 上次小結到現在，所有機器的快照 + OP。

### 歸檔

不搬檔案。靠檢索層級自動控制：有了小結後，小結之前的 OP 只在搜尋時才讀。

### 不需要記錄的

- 純閒聊或問答（不涉及操作決策）
- 純探索（grep、讀檔了解結構）且沒有結論或教訓

### MEMORY.md 維護規則

各機器的 MEMORY.md（`.claude/projects/` 內）是本機補充筆記，不透過 git 同步。

**定位**：記「CLAUDE.md 沒涵蓋、但會再犯的錯」和用戶交代要記住的事。

**寫入時機**（同時寫記錄層）：
- 踩到坑、浪費了時間，且 CLAUDE.md 沒涵蓋
- 用戶明確說「記住這件事」

**清理時機**：
- 重啟或 `/更新` 時若 CLAUDE.md 有變更 → 刪除已被涵蓋的項目
- 超過 150 行 → 精簡或拆子檔

**不做**：
- 不從 `_index.md` 或 OP 記錄搬運到 MEMORY.md
- 不在每次 push/pull 時同步
- 不複製 CLAUDE.md 已有的內容

---

## Git 協作規範（必須遵守）

本專案為 **monorepo**，所有子專案在同一個 git repo 裡。
遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`

### 基本流程（簡化版，適合日常開發）

1. **開工**：`git pull origin main`
2. **工作**：改程式碼
3. **收工**：`git add` → `git commit` → `git push origin main`

### 進階：分支策略（大改動時使用）

- `main`：穩定主幹
- **大功能用分支**：格式 `{machine}/{topic}`
  - 例：`laptop/pcc-mcp-setup`、`desktop/notion-integration`
- 完成後 merge 回 main

### 多機器協作規則

#### 規模與關係

- 機器數量**不限於 3 台**，未來可能有上千台
- 所有機器之間是**對等關係**（peer），沒有主從之分
- 任何機器都可以**審閱其他機器的決策**，並提出具體評價
- 機器之間可以**主動互相攻防**（像自問自答法，但由不同機器扮演提問者和回答者）

#### 核心原則：碰撞是常態，系統靠容錯

多台機器同時工作，檔案碰撞必然發生。不依賴人的紀律來預防，而是讓系統能自動處理或偵測提醒。

#### 已避免碰撞的檔案（不需處理）

- **OP 記錄**：每台每日一檔，不衝突
- **快照**：每台一檔，不衝突
- **暫存檔**：每主題一檔，衝突機率低

#### 碰撞處理策略

| 碰撞類型 | 處理方式 |
|----------|----------|
| `_index.md` 並行追加 | git auto-merge（append-only 格式）。衝突時保留兩邊 |
| Topic ID 重複 | 重啟或 `/更新` 時掃描偵測，提醒用戶合併 |
| CLAUDE.md 並行編輯 | git auto-merge。重啟或 `/更新` 時讀 diff 檢查語義一致性，矛盾時提醒用戶裁決 |
| 程式碼衝突 | 讀懂兩邊改動，合併成正確版本，跑測試驗證 |
| package-lock.json | 刪掉 `package-lock.json`，重新 `npm install` |
| 暫存檔矛盾（相反結論） | 兩份都保留，`/修改計畫` 時列出讓用戶裁決 |
| 平行決策（同 topic 多台） | 重啟或 `/更新` 時自動偵測（同 topic 出現在多台機器 → 標出提醒用戶） |

#### 良好習慣（非強制，能減少碰撞）

- 改共用檔案前先 `git pull`
- 推之前先跑測試（`npm test`）
- 建新 topic 前先 pull + 掃 `_index.md` 沿用已有 ID
- 開工時先 `git status`，有未推的改動先處理
- 不同機器盡量改不同檔案（A 改 src/，B 改 docs/ 等）
- 安裝套件（`npm install`）盡量在一台做完推上去，其他台 pull 後再裝

---

## 方法論

遇到需要取捨的問題時，查 `docs/methodology/_index.md` 找適用方法，按需讀取詳細文件。
