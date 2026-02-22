# P0 行政巡標自動化——工作計畫

**日期**：2026-02-22
**發起**：Jin 定義流程 + JDNE 拆解
**狀態**：待施工
**優先級**：P0（全專案最高）
**出處**：`stash-product-direction-0222.md`，Jin 已確認

---

## 目標

取代行政人員每天上午手動上 PCC 網站抓公告的作業。做完之後：
- 系統每天自動從 PCC 抓新公告
- 自動用關鍵字分類（絕對可以/需要讀細節/先不要/留給別人）
- 巡標人只需要看清單，點「要」或「不要」
- 點「要」後全自動：Notion 建檔 → Google Drive 建資料夾 → 產摘要 → 跑情蒐 → 回寫 Notion

---

## 設計決定（Jin 確認）

| 問題 | 決定 |
|------|------|
| 排程觸發 | 預設每天自動跑，也能手動按按鈕再跑一次 |
| 關鍵字管理 | 放在系統設定頁面，行政人員或 Jin 可改；也可從 Notion 讀 |
| Drive 資料夾命名 | `({案件唯一碼})({民國年}.{月}.{日}){標案名稱}` |
| Drive 位置 | `共用雲端硬碟/專案執行中心/B. 備標集中區/` |
| Drive 內容 | 從範本資料夾複製（服務建議書/、備標評估文件/、各種範本檔） |
| 排除邏輯 | 按「不要」的標記排除不再顯示，保留「查看已排除案件」入口 |
| Claude API 初篩 | 先跳過，用關鍵字比對 |
| Notion 寫入目標 | 備標評估文件庫（先打沙盒測試，通過再切正式） |

---

## Notion 備標評估文件庫寫入規格

**正式庫 Data Source**：`collection://14cc71c7-7278-81cf-8521-000b97d017d1`
**沙盒 Data Source**：`collection://2181121c-79ef-4581-8b4e-9bb7fbb3984e`

### 新案件寫入欄位對照

| Notion 欄位 | 類型 | PCC 來源 | 備註 |
|------------|------|----------|------|
| 標案名稱 | title | 公告標題 | |
| 案號 | text | job_number | |
| 招標機關 | text | unit_name | |
| 預算金額 | number | budget | 單位：NT$ |
| 公告日 | date | publish_date | |
| 截標時間 | date+time | deadline | |
| 標案進程 | status | — | 固定寫「等標期間」 |
| 備標決策 | select | — | 留空或「案件送二級評估」 |
| 決標方式 | select | award_type | 對照：最有利標/最低標 |
| 標案類型 | multi_select | category | 需要對照 PCC 分類 → Notion 選項 |

### 不能碰的欄位

- `參考暨文件收發`（relation，API 無權限）
- `競爭對手`（relation，API 無權限）
- `通告單`（relation，API 無權限）

---

## 架構：四層分離

整條流程分四層，每層獨立開發，透過介面規格對接。**各機器自由認領，先宣告先做。**

```
┌─────────────────────────────────────────────────┐
│  Layer D：UI 層（巡標人操作介面 + 設定頁面）       │
│  /patrol 頁面、/settings/patrol 頁面              │
├─────────────────────────────────────────────────┤
│  Layer C：業務邏輯層                              │
│  關鍵字分類、欄位轉換、排除記憶、摘要情蒐串接       │
├─────────────────────────────────────────────────┤
│  Layer B：外部寫入層                              │
│  Notion 建檔/回寫、Google Drive 建資料夾           │
├─────────────────────────────────────────────────┤
│  Layer A：PCC 資料層                              │
│  排程搜尋、抓公告清單、抓完整公告詳情               │
└─────────────────────────────────────────────────┘
```

### 認領規則

1. 各機器讀完本計畫後，在自己的快照裡用 `[>]` 宣告要做哪一層
2. **先 push 的就是他的**，其他機器看到就避開
3. 計畫推上去 24 小時後仍沒人認的層 → JDNE 指派
4. **一次認一層**，做完（測試過、push 了）才認下一層
5. 認領前先讀介面規格，確認自己這層的輸入輸出

### 相依性說明

四層之間**開發時沒有真正的相依**——型別定義已在 `types.ts` 統一，各層都可以用假資料寫測試。
串接（第二階段驗收）才需要四層都到位。所以四台機器可以同時各認一層平行施工。

---

## 各層詳細規格

### Layer A：PCC 資料層

**職責**：跟 PCC API 打交道，提供原始公告資料

**包含任務**：
- 排程機制（每天自動跑 + 手動觸發）
- 用預設關鍵字呼叫 PCC 搜尋 API
- 結果合併去重（同一案號不重複）
- 提供「抓單筆完整公告」的能力（給 Layer B 用）

**已有基礎**：PCC 情報搜尋模組（1132 測試），搜尋、快取、速率控制都已實作

**對外提供的介面**：

```typescript
// Layer A 提供給 Layer C 的搜尋結果
interface PccAnnouncementRaw {
  title: string;           // 標案名稱（原始）
  budget: number | null;   // 預算金額
  agency: string;          // 招標機關
  deadline: string;        // 截標時間（ISO date）
  publishDate: string;     // 公告日（ISO date）
  jobNumber: string;       // 案號
  unitId: string;          // 機關 ID（PCC 內部用）
  url: string;             // PCC 公告 URL
}

// Layer A 提供給 Layer B 的完整公告
interface PccTenderDetail extends PccAnnouncementRaw {
  awardType: string | null;     // 決標方式
  category: string | null;      // 標案類型（PCC 原始分類）
  contractPeriod: string | null; // 履約期限
  description: string | null;    // 工作說明
  // ...其他 PCC 回傳的欄位
}

// API routes
POST /api/patrol/search          // 觸發搜尋（手動或排程呼叫）
GET  /api/patrol/search/results  // 取得搜尋結果
GET  /api/patrol/tender/:unitId/:jobNumber  // 取得單筆完整公告
```

**檔案位置**：`src/lib/patrol/pcc-source.ts`、`src/app/api/patrol/search/`

---

### Layer B：外部寫入層

**職責**：往 Notion 和 Google Drive 寫東西

**包含任務**：
- Notion 建檔（PCC 欄位 → Notion 欄位，寫入沙盒）
- Notion 回寫（摘要、情蒐結果、備標進度更新）
- Google Drive 建資料夾（命名規則 + 複製範本）
- Drive 連結回寫 Notion

**對外提供的介面**：

```typescript
// Layer B 接收 Layer C 傳來的結構化資料，寫進 Notion
interface NotionCaseCreateInput {
  title: string;              // 標案名稱
  jobNumber: string;          // 案號
  agency: string;             // 招標機關
  budget: number | null;      // 預算金額
  publishDate: string;        // 公告日
  deadline: string;           // 截標時間
  awardType?: string;         // 決標方式
  category?: string[];        // 標案類型（已轉換為 Notion 選項）
  description?: string;       // 工作說明
}

// Layer B 回傳建檔結果
interface NotionCaseCreateResult {
  success: boolean;
  notionPageId?: string;      // Notion 頁面 ID
  caseUniqueId?: string;      // 案件唯一碼（Notion auto_increment_id）
  error?: string;
}

// Layer B 接收摘要/情蒐結果，回寫 Notion
interface NotionCaseUpdateInput {
  notionPageId: string;
  summary?: string;           // 工作項目摘要
  intelligenceReport?: string; // 情蒐結果（寫進頁面內容）
  progressFlags?: string[];   // 備標進度標記（如「摘要完成」「情蒐完成」）
}

// Drive 建資料夾
interface DriveCreateFolderInput {
  caseUniqueId: string;       // 案件唯一碼
  publishDate: string;        // 公告日（用來轉民國年）
  title: string;              // 標案名稱
}

interface DriveCreateFolderResult {
  success: boolean;
  folderId?: string;
  folderUrl?: string;
  error?: string;
}

// API routes
POST /api/patrol/notion/create   // 建立 Notion 頁面
POST /api/patrol/notion/update   // 更新 Notion 頁面
POST /api/patrol/drive/create    // 建立 Drive 資料夾
```

**檔案位置**：`src/lib/patrol/notion-writer.ts`、`src/lib/patrol/drive-writer.ts`、`src/app/api/patrol/notion/`、`src/app/api/patrol/drive/`

**注意**：
- Notion 開發只打沙盒 `collection://2181121c-79ef-4581-8b4e-9bb7fbb3984e`
- Google Drive 需要 API 授權，施工前先確認能不能拿到

---

### Layer C：業務邏輯層

**職責**：所有不碰外部 API 的邏輯——分類、轉換、記憶、串接

**包含任務**：
- 關鍵字分類引擎（標題比對 + 預算條件 → 四類）
- PCC 欄位 → Notion 欄位的轉換（類型對照、民國年轉換等）
- 排除記憶（記住按過「不要」的案號，過濾搜尋結果）
- 摘要產出邏輯（串接現有分析函式）
- 情蒐串接邏輯（呼叫現有的競爭分析、機關情報等）

**對外提供的介面**：

```typescript
// 分類結果
type PatrolCategory =
  | 'definite'      // 絕對可以
  | 'needs_review'  // 需要讀細節
  | 'skip'          // 先不要
  | 'others';       // 留給別人

// 分類後的公告（Layer A 的原始資料 + Layer C 加工）
interface PatrolItem {
  id: string;                    // 內部唯一 ID（unitId-jobNumber）
  title: string;
  budget: number | null;
  agency: string;
  deadline: string;
  publishDate: string;
  jobNumber: string;
  unitId: string;
  url: string;
  category: PatrolCategory;      // 分類結果
  status: 'new' | 'accepted' | 'rejected';
}

// 分類規則（可從設定頁面編輯）
interface ClassificationRule {
  category: PatrolCategory;
  keywords: string[];            // 標題關鍵字
  budgetMax?: number;            // 預算上限（如 1000000）
}

// 分類函式
function classifyAnnouncements(
  raw: PccAnnouncementRaw[],
  rules: ClassificationRule[]
): PatrolItem[];

// 排除過濾
function filterExcluded(
  items: PatrolItem[],
  excludedIds: string[]
): PatrolItem[];

// PCC → Notion 欄位轉換
function convertToNotionInput(
  detail: PccTenderDetail
): NotionCaseCreateInput;

// 一鍵上新的完整流程編排
async function onAccept(item: PatrolItem): Promise<{
  notion: NotionCaseCreateResult;
  drive: DriveCreateFolderResult;
  summary: string;
  intelligence: string;
}>;
```

**檔案位置**：`src/lib/patrol/classifier.ts`、`src/lib/patrol/converter.ts`、`src/lib/patrol/exclusion.ts`、`src/lib/patrol/orchestrator.ts`

**預設分類規則**：
```
絕對可以：食農教育/藝術/服務採購/100萬以下/影片製作/行銷計畫/春聯
需要讀細節：主燈設計/...節（燈節、藝術節等）/舞台/布置/晚會演唱會
先不要：課後服務
其餘：留給別人
```

---

### Layer D：UI 層

**職責**：巡標人看到和操作的所有頁面

**包含任務**：
- `/patrol` 主頁面（今日新案清單 + 要/不要操作）
- `/patrol/excluded` 已排除案件（撈回入口）
- `/settings/patrol` 關鍵字設定頁面
- Feature Registry 註冊 `patrol`

**頁面規格**：

**`/patrol` 主頁面**：
- 頂部：今日日期、新案數量、上次搜尋時間、「手動搜尋」按鈕
- 分類 tabs：全部 / 絕對可以 / 需要讀細節 / 先不要 / 留給別人
- 清單：每筆顯示標題、預算（萬元）、機關、截標日、分類標籤
- 每筆右側：「要」（綠色按鈕）「不要」（灰色按鈕）
- 按「要」後顯示進度（建檔中 → Drive 建資料夾 → 跑情蒐 → 完成）
- 底部：「查看已排除案件」連結

**`/settings/patrol` 設定頁面**：
- 四個分類區塊，每個可增刪關鍵字
- 預算條件設定（目前只有「100萬以下」歸「絕對可以」）
- 儲存 / 重置按鈕

**UI 開發可以用 mock 資料先做**，不用等其他層完成。mock 資料格式就是 `PatrolItem[]`。

**檔案位置**：`src/app/patrol/`、`src/app/settings/patrol/`、`src/components/patrol/`

---

## 共用約定（所有施工機器必須遵守）

1. **檔案位置**：所有新程式碼放 `bidding-assistant/src/` 底下
   - 後端邏輯：`src/lib/patrol/`（新目錄）
   - 前端頁面：`src/app/patrol/`（新路由）
   - 設定頁面：`src/app/settings/patrol/`
   - UI 元件：`src/components/patrol/`
   - API routes：`src/app/api/patrol/`

2. **Notion 安全**：開發和測試只打沙盒 `collection://2181121c-79ef-4581-8b4e-9bb7fbb3984e`，不碰正式庫

3. **Feature Registry**：新功能在 `FEATURE_REGISTRY` 註冊為 `patrol`

4. **測試**：每個任務附 Vitest 測試，確保 `npm test` 全過

5. **介面遵守**：各層嚴格按照上面的 TypeScript 介面開發，不私自改介面。需要改的話先在快照裡提出，JDNE 協調

6. **commit 格式**：`[feat] P0 Layer{A/B/C/D}：{做了什麼}（{機器碼}）`

7. **衝突預防**：每層有自己的檔案範圍，正常情況不會衝突。唯一共用的是 `src/lib/patrol/types.ts`（介面定義），這個檔 JDNE 先建好，其他機器只讀不改

---

## 驗收標準

### 第一階段（各層獨立驗證）
- Layer A：搜尋 API 能回傳正確格式的公告清單，排程機制能觸發
- Layer B：給定正確的 input，能在沙盒 Notion 建出頁面，欄位對得上
- Layer C：給定測試公告，分類結果正確；排除記憶有效；欄位轉換正確
- Layer D：頁面能渲染 mock 資料，篩選和按鈕操作正常

### 第二階段（四層串接）
- 打開 `/patrol`，能看到從 PCC 即時搜尋的今日新案
- 每筆有正確的分類標籤
- 按「要」後沙盒 Notion 出現新頁面，欄位正確
- 按「不要」的案子隔天不再出現
- 手動搜尋按鈕能觸發

### 第三階段（完整流程）
- 上述 + Drive 資料夾建好（命名正確、範本複製完整）
- 摘要和情蒐結果回寫到 Notion
- 設定頁面能管理關鍵字
- Jin 確認後切正式庫

---

## 進度追蹤

這張表由認領的機器自己更新，JDNE 每次巡邏時同步檢查。

| 層 | 認領機器 | 狀態 | 備註 |
|----|---------|------|------|
| A：PCC 資料 | — | 待認領 | |
| B：Notion/Drive 寫入 | — | 待認領 | |
| C：業務邏輯 | — | 待認領 | |
| D：UI | — | 待認領 | |
| 串接 | — | 等四層完成 | |

狀態值：`待認領` → `施工中` → `測試過` → `已推送` → `待驗收`

**你什麼時候需要出場**：
- 四層都到「已推送」→ 串接開始 → 串接到「待驗收」→ **你來驗收第二階段**
- 第三階段（Drive + 情蒐回寫 + 切正式庫）→ **你來做最終驗收**

中間不需要你盯，有問題機器會在快照裡標出來，JDNE 巡邏時會通知你。

---

## 風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| Google Drive API 授權設定複雜 | Layer B 的 Drive 部分卡住 | Drive 是獨立子任務，Notion 先通就能用 |
| PCC API 速率限制 | 多關鍵字搜尋太慢 | 已有 300ms 間隔控制，必要時加快取 |
| Notion API 寫入格式不對 | Layer B 失敗 | 先打沙盒驗證 |
| 沙盒欄位跟正式庫不完全一致 | 切庫時要調整 | 第三階段預留時間 |
| 四層對接時介面不合 | 串接失敗 | 介面規格已定，types.ts 統一管理 |
