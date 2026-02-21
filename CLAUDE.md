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
- SaaS 網頁 = 主要產品介面（具體方案待定案），Web app = 管理後台

### 架構重點
- Feature Registry Pattern：所有功能在 `FEATURE_REGISTRY` 註冊
- SSOT：常數在 `src/lib/constants/`，設定在 `src/lib/settings/`
- 資料/UI 分離：`src/lib/`（邏輯）vs `src/components/`（渲染）
- bidding-assistant/CLAUDE.md 有完整開發規範

### Agent 架構（雙層策略）
- **施工層**：Claude Code Agent Team（開發時用）
- **產品層**：Claude Code SDK + SaaS 網頁（5 個 AI Agent：戰略官/企劃官/品管官/知識官/簡報官）
- 全部走現有訂閱，額外成本 = $0

### MCP Server
- SmugMug MCP：已完成（`smugmug-mcp/`，7 個工具）
- PCC 標案 API MCP：已完成（`pcc-api-mcp/`，6 個工具）
- PCC Monitor：已完成（`pcc-monitor/`，GAS 每小時監控）
- Notion MCP：待建（本地版，讓三家 AI 都能用）

### 開發路線
詳見 `docs/dev-map.md`（由 /地圖 指令維護）。

### 已知注意事項
- Windows 上 Claude Code 用 bash 語法（Unix 風格）
- 避免 `> nul`（Windows 會建立實體 `nul` 檔案），用 `> /dev/null`
- npm registry 用官方 `https://registry.npmjs.org/`（不要用 npmmirror）
- 詳細開發環境見 `docs/dev-environment.md`
- 除錯經驗見 `docs/debugging.md`
- 討論結論暫存在 `bidding-assistant/docs/dev-plan/_staging/`

---

## 同步規範（必須遵守）

Monorepo 透過 GitHub 同步。遠端：`https://github.com/Lokianlab/bidding-assistant-monorepo`

### 基本節奏

- 推之前先拉：`git pull origin main` → `git add` → `git commit -m "中文摘要"` → `git push origin main`
- 每完成一個工作單元就推一次，不累積。一次 push 包含代碼 + OP 記錄 + 快照。
- 長時間討論產生重要決策 → 主動暫停，先推結論再繼續。
- 不要隨意更新 CLAUDE.md，日常結論用 `/暫存`。
- 不能只寫進本機 MEMORY.md——其他機器看不到。

### 衝突處理

- 記錄層檔案：永遠保留兩邊內容
- 程式碼：讀懂兩邊改動，合併後跑測試
- package-lock.json：刪掉重裝
- CLAUDE.md：重啟或 `/更新` 時讀 diff 檢查語義一致性
- 暫存檔矛盾：都保留，`/修改計畫` 時讓用戶裁決

### 分支策略

- main = 穩定主幹，大功能用分支（格式 `{machine}/{topic}`）
- 機器對等，不限數量，互相可審閱

### 多機器碰撞處理

多台機器同時工作，碰撞必然發生。不依賴人的紀律來預防，靠系統自動處理或偵測提醒。

| 碰撞類型 | 處理方式 |
|----------|----------|
| `_index.md` 並行追加 | git auto-merge。衝突時保留兩邊 |
| Topic ID 重複 | 重啟或 `/更新` 時掃描偵測，提醒用戶合併 |
| CLAUDE.md 並行編輯 | git auto-merge。重啟時讀 diff 檢查語義一致性 |
| 程式碼衝突 | 讀懂兩邊改動，合併後跑測試 |
| package-lock.json | 刪掉重裝 |
| 暫存檔矛盾 | 都保留，`/修改計畫` 時讓用戶裁決 |
| 平行決策（同 topic 多台） | 重啟時自動偵測，標出提醒用戶 |

### 重啟流程（新 session 開始時）

git status → 有未提交就 commit → pull → 碰撞偵測（CLAUDE.md 一致性 + Topic ID 重複 + MEMORY.md 清理）→ 代碼變化時 npm test → 工具檢查（CLI + MCP）→ 讀 dev-map + index + snapshot + staging 恢復上下文（Layer 0-4）→ 報告差異

### 壓縮流程（context compact 後）

pre-compact hook 自動 commit/push（不保證完成）→ 檢查 hook 遺漏 → 有 pull 變化則碰撞偵測 → 讀 snapshot + 近期 OP 恢復上下文 → 接回工作

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

### 觸發規則

| 事件 | 動作 |
|------|------|
| git push | OP 記錄（如有結論）+ 快照更新 + 主題索引更新 |
| 空 session | 不寫任何東西 |

「有結論」= 改了檔案，或用戶做了決策。

Stop hook（`.claude/hooks/stop-check.sh`）自動檢查未提交改動，不靠 AI 自律。

OP、快照、主題索引的格式規範在 `.claude/rules/record-formats.md`（碰到 `docs/records/` 檔案時自動載入）。

### 不需要記錄的

- 純閒聊或問答（不涉及操作決策）
- 純探索（grep、讀檔了解結構）且沒有結論或教訓

### MEMORY.md 維護規則

MEMORY.md（`.claude/projects/` 內）是本機限定暫存筆記，不經 git 同步。

只有三類內容進 MEMORY.md：首次觀察（根因不明的除錯現象）、本機限定偏好、本機環境問題。其他全寫共享位置（除錯→debugging.md、規範→CLAUDE.md、決策→/暫存、方法論→methodology/）。

首次觀察再次遇到且確認為通用問題 → 搬到共享位置 → 從 MEMORY.md 刪除。超過 150 行時精簡。

---

## 溝通原則

- 用戶質疑時，先查事實再回應，不要先認錯
- 基於規則就提出說明，不一味討好或應和
- **主動表態**：遇到需要判斷的情境（該做什麼、哪個好、問題出在哪），先給出建議和理由，再標注不確定的部分。「不確定」不是不表態的理由——說出來讓用戶裁決，比讓用戶追問好。

### 對人輸出必須說人話（必須遵守）

所有給用戶看的文字（回報、討論回覆、暫存檔）必須讓人讀得懂，不能像 AI 之間的技術備忘錄。

| 不要這樣寫 | 要這樣寫 |
|-----------|---------|
| 時間完備原則 | 每個項目必須有明確結局 |
| A↔C 雙向完備性規則 | 兩章之間要互相對得上 |
| PreCompact hook 機制 | 壓縮前自動把記錄推上 git |
| 經蘇格拉底式討論引導出設計原則 | 用戶用一連串提問，一步步引導出設計 |
| @op:20260219-JDNE#0930 | （放在元資料欄，不混進正文） |

原則：
- **用具體描述取代抽象標籤**——說這東西做什麼，不要只說它叫什麼
- **機器格式放在該放的地方**——OP 引用、檔案路徑、topic ID 放元資料或檔案變更章，不混進敘事
- **隔一週回頭看還能讀懂**——如果一句話需要知道當時的對話脈絡才看得懂，就改寫

---

## 工作行為原則

- **目標先行**：動手前確認目標明確且可量化。含效益宣稱的要查證事實。說不清就問。
- **風險正比**：改前檢查影響範圍。1 檔腦中過；≥3 檔 grep 並把影響點列給用戶看；規範檔全掃展示完整分析。
- **大事先拆**：超過 3 步的任務先列步驟，風險最高或解鎖最多的先做。
- **失敗追因**：同一件事失敗兩次，停下來找根因再繼續，不重試。
- **做完閉環**：做對了→有效→做全了→沒矛盾。規模小腦中過，規模大展示給用戶。

方法論內部清單和自我批評迴路見 `.claude/rules/methodology-checklists.md`（永遠載入）。
方法論操作步驟和選擇邏輯見 `docs/methodology/_index.md`。
獎懲回饋機制見 `docs/methodology/reward-feedback.md`。

---

## AI 行為規範（必須遵守）

- **主動推進**：做完一步 → 告訴用戶下一步 → 等確認 → 繼續。有工作清單時按順序自動推進。不等用戶問「接下來呢」。
- **主動回報**：開工前說打算做什麼，做完回報結果。
- **主動記錄**：OP、快照、推送——該做就做，不等提醒。
- **能判斷的不問**：根據上下文和專案慣例有明顯更好的選項就直接做。只在需要用戶價值判斷時才問。
- **表態不問**：給出判斷後自問自答，附帶下一步行動計畫，不以問句結尾。單純任務可直接執行不等核准。用戶不同意會自己說。
- **控制提問**：一次最多兩問。能從 CLAUDE.md、記錄層或專案慣例找到答案的不問。
