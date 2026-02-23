# SaaS Phase 1d：Web UI 實裝 — 規格指令

> 狀態：待 Z1FV 承接確認
> 分派者：JDNE
> 優先序：P1（關鍵路徑）
> 目標完成日：2026-03-01（7 天）

---

## 一、任務概述

為 SaaS Web App 實裝使用者介面。涵蓋登入、多租戶儀表板、知識庫管理三大區塊。所有操作透過 P1c KB API 和 P1b OAuth 進行。

**依賴**：P1b OAuth ⏳ 進行中 / P1c KB API ✅ 完成
**被依賴**：無（P1d 是末端）
**協作方**：A44T P1b（登入流程）/ 3O5L P1e（Notion 同步狀態展示可選）

---

## 二、架構決策

### 2.1 UI 套件

繼承主 Web App 既有選型：
- **UI 框架**：React 19 + Next.js 16
- **元件庫**：shadcn/radix-ui (new-york style)
- **樣式**：Tailwind CSS 4
- **圖表**：recharts（知識庫統計用）

**前端狀態管理**：localStorage（設定） + React Context（臨時狀態）

**後端無縫對接**：P1c 的 6 個 KB API 端點

---

## 三、頁面架構

### 3.1 頁面清單

```
SaaS Web App (Next.js App Router)
├── /login                    ← 登入頁面（P1b OAuth 按鈕）
├── /dashboard                ← 多租戶儀表板（首頁）
├── /kb                       ← 知識庫管理區塊
│   ├── /kb/documents         ← 文件列表 + 搜尋
│   ├── /kb/upload            ← 文件上傳
│   └── /kb/[id]              ← 文件詳情 + 編輯
├── /settings                 ← 租戶設定（可選，P1 後延）
└── /api/*                    ← P1c KB API（已完成）
```

### 3.2 核心頁面詳細設計

#### 3.2.1 /login 登入頁面

**功能**：
- 頁頭：品牌 logo + 應用名稱
- 主體：
  - Google 登入按鈕（深色 + "Sign in with Google"）
  - Microsoft 登入按鈕（可選，"Sign in with Microsoft"）
  - 下方：隱私政策連結（可指向占位符）
- 登入後自動重導 → /dashboard

**技術**：
- 按鈕連結到 P1b 的 OAuth callback handler
- 使用 `useEffect` 檢查已登入狀態 → 自動重導
- 無多租戶概念（全局登入頁）

**設計參考**：簡潔單列居中（參考 Vercel / Stripe 登入頁風格）

---

#### 3.2.2 /dashboard 多租戶儀表板

**功能**：
1. **頂部導航欄**：
   - 左側：品牌 logo + 應用名稱
   - 中央：當前租戶名稱（下拉可切租戶 — 可選延後）
   - 右側：使用者頭像 + 登出按鈕

2. **側邊欄**（可折疊）：
   - 知識庫管理（/kb）
   - 文件列表（/kb/documents）
   - 上傳文件（/kb/upload）
   - 設定（/settings — 可選）
   - 登出

3. **主體區域**：
   - **卡片 1：知識庫統計**
     - 總文件數
     - 最後更新時間
     - 儲存空間使用量（若 P1c 提供）

   - **卡片 2：最近上傳的文件**
     - 表格：文件名 / 上傳時間 / 檔案大小 / 操作（詳情 / 下載 / 刪除）
     - 可排序 + 分頁（10 筆 / 頁）

   - **卡片 3：同步狀態**（可選，3O5L P1e）
     - 上次 Notion 同步時間
     - 同步狀態（成功 / 進行中 / 失敗）
     - 同步日誌連結

**設計風格**：卡片式佈局，灰階背景 + 深色文字（符合 Web App 既有風格）

---

#### 3.2.3 /kb/documents 文件列表

**功能**：
1. **搜尋 + 過濾**：
   - 全文搜尋輸入框（連接 P1c POST /api/kb/search）
   - 過濾選項：檔案類型（PDF / Word / Excel）/ 上傳時間範圍（可選）

2. **文件表格**：
   - 欄位：文件名 / 檔案類型 / 上傳時間 / 大小 / 作者（若有）/ 操作
   - 可排序
   - 可多選（勾選框）
   - 分頁（20 筆 / 頁）

3. **行操作**：
   - 查看詳情（→ /kb/[id]）
   - 下載原檔
   - 刪除（確認對話框）
   - 編輯（打開編輯模態框）

4. **批量操作**（多選後）：
   - 批量刪除（確認對話框）

**搜尋邏輯**：
- 即時搜尋（輸入 300ms 後發送 POST /api/kb/search）
- 結果分頁顯示
- 無搜尋結果時顯示空狀態

---

#### 3.2.4 /kb/upload 文件上傳

**功能**：
1. **拖放上傳**：
   - 拖放區域：中央大型投放箱
   - 提示文字：「拖放檔案或點擊選擇」
   - 支援檔案類型：PDF / Word (.doc / .docx) / Excel (.xls / .xlsx)
   - 單檔最大 50MB

2. **上傳進度**：
   - 進度條（百分比 + MB / 總大小）
   - 正在上傳的檔案列表
   - 上傳成功 / 失敗狀態

3. **上傳後**：
   - 成功訊息：「✅ 文件已上傳」
   - 新增按鈕：「查看文件」（→ /kb/documents）或「繼續上傳」

**技術**：
- 呼叫 POST /api/kb/documents 上傳檔案
- 使用 FormData 傳輸二進制
- 上傳失敗時重試（可選）

---

#### 3.2.5 /kb/[id] 文件詳情

**功能**：
1. **文件資訊**：
   - 文件名 / 檔案類型 / 大小 / 上傳時間 / 上傳者（若有）
   - 最後修改時間

2. **預覽**（若可行）：
   - PDF 線上預覽（embed PDF viewer）
   - Word / Excel：顯示元資料（無法線上預覽可標記）

3. **操作按鈕**：
   - 下載原檔
   - 編輯元資料（模態框）
   - 刪除（確認對話框）
   - 回到列表

4. **編輯模態框**（選用，P1 後延）：
   - 編輯文件名
   - 編輯描述/標籤
   - 儲存 / 取消

---

### 3.3 共用元件

| 元件 | 說明 | 複用 |
|------|------|------|
| **TopNav** | 頂部導航欄（logo + 租戶 + 使用者） | 全頁 |
| **Sidebar** | 側邊欄導航 | 全頁（除 /login） |
| **Card** | 資訊卡片（統計 / 最近檔案 / 同步狀態） | dashboard |
| **FileTable** | 檔案表格（排序 / 分頁 / 多選） | documents |
| **SearchBox** | 搜尋輸入框 | documents |
| **UploadDropZone** | 拖放上傳區域 | upload |
| **ProgressBar** | 上傳進度條 | upload |
| **ConfirmDialog** | 確認對話框（刪除） | 全頁 |
| **EmptyState** | 空狀態提示 | 全頁 |
| **Toast** | 操作回饋訊息 | 全頁 |

---

## 四、資料流

```
使用者登入 (/api/auth/callback)
  ↓
設定 JWT Token → localStorage
  ↓
重導 → /dashboard
  ↓
onMount：取得 JWT → 呼叫 GET /api/kb/documents
  ↓
渲染檔案列表 (Dashboard + FileTable)
  ↓
[使用者操作]
  ├─ 搜尋 → POST /api/kb/search → 更新列表
  ├─ 上傳 → POST /api/kb/documents → 顯示進度
  ├─ 刪除 → DELETE /api/kb/documents/:id → 移除列表項
  └─ 下載 → GET /api/kb/documents/:id → 觸發下載
```

---

## 五、狀態管理 + 儲存

| 狀態 | 儲存方式 | 清除時機 |
|------|---------|---------|
| JWT Token | localStorage | 登出 / 過期 |
| 使用者資訊 | React Context + localStorage | 登出 |
| 當前租戶 | React Context + localStorage | 切換租戶 |
| 檔案列表 | React Context（快取） | 重整或手動刷新 |
| 搜尋狀態 | 本地狀態（搜尋關鍵字 + 結果） | 清空搜尋框 |

---

## 六、效能考慮

| 項 | 目標 | 實作方式 |
|----|------|---------|
| **頁面載入時間** | <2 秒 | 分頁載入（20 筆 / 頁） + 懶加載 |
| **搜尋回應** | <500ms | 前端節流（debounce 300ms） |
| **檔案上傳** | 支援 50MB | multipart/form-data + 進度顯示 |
| **列表滑動** | 無卡頓 | 虛擬捲軸（500+ 檔案時） |

---

## 七、多租戶隔離

**實作**：
- 所有 API 呼叫自動帶 JWT token
- JWT token 含 tenant_id claim
- P1c KB API 使用 RLS 過濾（自動隔離）
- 前端無需額外邏輯（由後端 RLS 保證）

**驗證**：
- [ ] 租戶 A 登入，無法看到租戶 B 的檔案（即使手動呼叫 API）
- [ ] JWT 被竄改 → 401 Unauthorized

---

## 八、測試清單

| 測試項 | 目標 | 優先序 |
|--------|------|--------|
| **頁面載入** | 無 JS 錯誤，UI 完整渲染 | P0 |
| **登入流程** | P1b OAuth → 重導 /dashboard | P0 |
| **文件列表載入** | GET /api/kb/documents 正確渲染 | P0 |
| **搜尋功能** | 搜尋框 + POST /api/kb/search + 結果更新 | P0 |
| **上傳功能** | 拖放 + 進度條 + 成功回饋 | P0 |
| **刪除功能** | 確認對話框 + DELETE API + 列表移除 | P0 |
| **多租戶隔離** | 租戶 A 無法看到租戶 B 資料 | P0 |
| **響應式設計** | 桌面 / 平板 / 手機 UI 可用 | P1 |
| **深色模式**（可選） | 支持暗色主題 | P2 |
| **無障礙性** | ARIA labels + 鍵盤導航 | P2 |

**測試框架**：Vitest + Testing Library（與主 Web App 一致）

**測試量**：≥30 個單元 + 集成測試

---

## 九、驗收標準

### 9.1 功能驗收

- [ ] 登入頁面可點擊 OAuth 按鈕
- [ ] Dashboard 可加載檔案統計
- [ ] 文件列表可搜尋 / 排序 / 分頁
- [ ] 上傳功能可正常完成
- [ ] 刪除功能可確認後移除
- [ ] 多租戶隔離驗證無誤（無跨租戶洩漏）

### 9.2 UI/UX 驗收

- [ ] 所有文字採中文
- [ ] 設計風格與主 Web App 一致
- [ ] 響應式設計可用（720p 以上）
- [ ] 無論 JavaScript 是否啟用，UI 基本可見（漸進式增強）

### 9.3 效能驗收

- [ ] 頁面載入時間 <3 秒（測試環境）
- [ ] 搜尋 <500ms 回應（debounce 後）
- [ ] 上傳 50MB 檔案 ≤60 秒

### 9.4 測試驗收

- [ ] ≥30 個單元 + 集成測試 PASS
- [ ] `npm test` 無 skip
- [ ] `npm run build` 成功

---

## 十、時程預估

| 里程碑 | 預計日期 | 完成 |
|--------|---------|------|
| 頁面骨架 + 路由結構 | 2026-02-25 | — |
| /login 登入頁面 | 2026-02-25 | — |
| /dashboard 儀表板 | 2026-02-26 | — |
| /kb 文件管理區塊 | 2026-02-27 | — |
| 共用元件 + 測試 | 2026-02-28 | — |
| 多租戶隔離驗證 + 最終測試 | 2026-03-01 | — |

---

## 十一、依賴和協作

### 11.1 上游依賴

- **P1b OAuth**：登入流程、JWT token → A44T
- **P1c KB API**：6 個 API 端點 → ITEJ ✅ 完成
- **主 Web App 現有設計**：元件庫 / 樣式 / 架構

### 11.2 協作檢查點

1. **與 A44T 確認**（P1b OAuth）：
   - OAuth callback 後的重導目標（/dashboard）
   - JWT token 格式、claims 結構
   - 登出時的清理邏輯

2. **與 ITEJ 確認**（P1c KB API）：
   - 每個 API 的確切響應格式
   - 錯誤代碼（401 / 403 / 404 / 500）
   - 分頁參數（page / limit）

3. **與 3O5L 確認**（P1e Notion 同步 — 可選）：
   - 是否需要在 dashboard 展示同步狀態
   - sync_logs 表的查詢接口

### 11.3 推送點

完成後推送 commit：`[feat] SaaS P1d Web UI — 登入 + 儀表板 + KB 管理（Z1FV）`

隨後更新 `.claude/records/_snapshot-Z1FV.md`：
```
[x] saas-p1d-web-ui|Web UI 登入 + 儀表板 + KB 管理 + 多租戶隔離驗證|commit XYZ，35+ tests PASS
```

---

## 十二、溝通窗口

- **統籌者**：JDNE（遇到阻塞或方案改變直接通知）
- **協作方**：A44T P1b（OAuth） / ITEJ P1c（API）
- **後續**：與 3O5L 可選協調（P1e 整合）

---

## 十三、加分項（若時間充裕）

- [ ] 文件預覽（PDF viewer embed）
- [ ] 租戶切換功能（/dashboard 中央下拉）
- [ ] 檔案標籤 / 分類（編輯時可選）
- [ ] 匯出檔案列表（CSV / JSON）
- [ ] 深色模式支持
- [ ] 國際化（i18n） ← 可延後

---

> **版本**：v0.1
> **發布**：2026-02-23
> **分派者**：JDNE
> **待 Z1FV 確認承接**

---

## 附錄：參考資源

- [shadcn/ui 元件庫](https://ui.shadcn.com)
- [Next.js App Router 文件](https://nextjs.org/docs/app)
- [React 19 Hook 文檔](https://react.dev)
- [Tailwind CSS 4 工具類](https://tailwindcss.com)
