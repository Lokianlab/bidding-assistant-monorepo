# 全能標案助理 — 開發規範

## 專案概述

Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4 + Turbopack
UI 元件庫：shadcn/radix-ui，圖表：recharts
資料來源：Notion API，設定儲存：localStorage
使用者為中文母語（所有 UI 文字必須使用中文）
Dev server port: 3000

---

## 模組化架構原則（必須遵守）

### 1. 單一來源原則（Single Source of Truth）

所有常數、狀態值、欄位名稱**只在一個地方定義**，其他地方一律透過 import 使用。

| 資料類型 | 唯一定義位置 | 說明 |
|----------|-------------|------|
| 標案狀態值 | `src/lib/constants/bid-status.ts` | 所有狀態字串、分組 Set、顏色、API filter 都從此檔衍生 |
| Notion 欄位名稱 | `src/lib/constants/field-mapping.ts` | `FIELD_KEYS` + `DEFAULT_FIELD_MAP` + `FIELD_LABELS` |
| Notion API 欄位清單 | `src/lib/constants/notion-fields.ts` | `FIELDS_DASHBOARD` / `FIELDS_PERFORMANCE` / `FIELDS_DASHBOARD_KPI` |
| 功能模組定義 | `src/lib/modules/feature-registry.ts` | `FEATURE_REGISTRY` 陣列，側欄、路由守衛、設定頁面全部從此讀取 |
| AI 階段定義 | `src/data/config/stages.ts` | L1-L8 階段 ID、名稱、觸發指令 |
| 知識庫矩陣 | `src/data/config/kb-matrix.ts` | 各階段 × 知識庫的需求矩陣 |
| 應用程式設定 | `src/lib/settings/types.ts` + `defaults.ts` | `AppSettings` 介面 + `DEFAULT_SETTINGS` 預設值 |

**禁止**：在元件中硬編碼字串常數（如狀態名稱、欄位名稱、顏色值）。

### 2. 功能註冊表模式（Feature Registry Pattern）

所有功能模組必須在 `FEATURE_REGISTRY` 中註冊。每個功能有：
- `id`：唯一識別碼
- `name`：中文名稱
- `routes[]`：對應的 URL 路徑
- `section`：分類（core / tools / output）
- `dependencies[]`：依賴的其他功能
- `defaultEnabled`：預設是否啟用

功能的開關狀態由 `isFeatureEnabled()` 函式統一判斷，結合 registry 預設值 + 使用者設定。

### 3. 資料層與展示層分離

```
src/lib/          ← 資料層（商業邏輯、Hook、工具函式、型別）
src/components/   ← 展示層（UI 元件，只負責渲染，不含商業邏輯）
src/app/          ← 頁面層（串接資料層和展示層）
```

- **`src/lib/{feature}/`**：每個功能的邏輯、型別、Hook
  - `types.ts` — 介面定義
  - `helpers.ts` — 純函式（可獨立測試）
  - `use*.ts` — React Hook（資料取得與計算）
  - `constants.ts` — 功能專屬常數

- **`src/components/{feature}/`**：每個功能的 UI 元件
  - 元件只透過 props 或 Hook 接收資料
  - 不直接呼叫 API 或操作 localStorage

- **`src/components/ui/`**：共用基礎元件（shadcn/radix-ui）

### 4. 設定系統

- **型別定義**：`src/lib/settings/types.ts` 的 `AppSettings` 介面
- **預設值**：`src/lib/settings/defaults.ts` 的 `DEFAULT_SETTINGS`
- **存取方式**：`useSettings()` Hook（來自 `src/lib/context/settings-context.tsx`）
- **儲存位置**：localStorage key `"bidding-assistant-settings"`
- **Hydration 安全**：任何讀取 localStorage 的程式碼都必須用 `useEffect` + `hydrated` flag

新增設定時必須：
1. 在 `AppSettings` 介面中加型別（optional `?`）
2. 在 `DEFAULT_SETTINGS` 中加預設值
3. 透過 `updateSettings()` 或 `updateSection()` 更新

### 5. 新功能開發清單

新增功能時，依序檢查：

- [ ] 常數定義在 `src/lib/constants/` 或功能專屬 `constants.ts`，不硬編碼
- [ ] 型別定義在 `src/lib/{feature}/types.ts` 或 `src/lib/settings/types.ts`
- [ ] 商業邏輯放在 `src/lib/{feature}/`，不混入元件
- [ ] UI 元件放在 `src/components/{feature}/`，只負責渲染
- [ ] 如果是可開關的功能模組，必須在 `FEATURE_REGISTRY` 中註冊
- [ ] 如果有設定，必須加到 `AppSettings` 介面 + `DEFAULT_SETTINGS`
- [ ] 所有 UI 文字使用中文
- [ ] localStorage 存取使用 hydration-safe 模式（useEffect）

### 6. 閉環開發流程（必須遵守）

每次功能開發或修改必須完成以下閉環，不可跳過任何步驟：

1. **寫代碼** — 按模組化結構實作
2. **自我審查** — 逐檔檢查：型別正確、import 路徑正確、無硬編碼、符合 SSOT
3. **寫測試** — 為新增的 helpers/hooks/registry 撰寫測試檔（放在 `__tests__/` 資料夾）
4. **跑測試** — 執行 `npm test` 確認全部通過
5. **跑 build** — 執行 `npm run build` 確認 0 錯誤
6. **讀報錯** — 如有錯誤，完整閱讀錯誤訊息，定位根因
7. **修 bug** — 修復後重新從步驟 2 開始
8. **自證正確** — build 通過 + 測試通過 + dev server 可正常運作

**禁止**：寫完代碼直接交付，未經 build 驗證和測試驗證。

### 7. 新模組資料夾結構規範

每個新功能模組**必須**遵循以下結構：

```
src/lib/{feature}/
  types.ts        ← 介面與型別定義（必要）
  index.ts        ← 匯出彙整（選用）
  constants.ts    ← 功能專屬常數（選用）
  helpers.ts      ← 純函式（選用）
  use{Feature}.ts ← React Hook（選用）
  __tests__/      ← 測試檔案（必要）

src/components/{feature}/
  {Component}.tsx  ← UI 元件（只透過 props 接收資料）

src/data/config/   ← 靜態設定資料（選用）
```

**禁止**：跳過資料夾結構，直接在頁面檔中寫商業邏輯或硬編碼設定。

### 8. 註冊表模式擴展

凡是「可新增同類項目的集合」都必須使用 Registry 陣列模式：
- 功能模組 → `FEATURE_REGISTRY`
- 儀表板卡片 → `CARD_REGISTRY`
- 統計指標 → `METRIC_REGISTRY`
- 日誌分類 → `LOG_CATEGORIES`
- AI 階段 → `STAGES`

新增項目只需在 Registry 陣列中加一筆，不需修改渲染邏輯。

### 9. 日誌記錄規範

關鍵操作必須透過 `logger` 記錄：
- API 呼叫（成功/失敗）→ `logger.info("api", ...)` / `logger.error("api", ...)`
- 設定變更 → `logger.info("settings", ...)`
- 快取操作 → `logger.debug("cache", ...)`
- 使用者操作（佈局變更等）→ `logger.info("system", ...)`

匯入方式：`import { logger } from "@/lib/logger"`

### 10. 安全與環境變數

- 所有 API token、密鑰使用 `process.env` 讀取，**禁止**硬編碼或存入 localStorage
- `.env.local` 存放本地開發環境變數，`.env.example` 列出所有需要的變數名稱
- API 路由（`/api/*`）必須加入基本認證檢查

### 11. 匯入路徑規範

使用 `@/` 路徑別名：
```ts
import { useSettings } from "@/lib/context/settings-context";
import { FEATURE_REGISTRY } from "@/lib/modules/feature-registry";
import { BID_STATUS, SUBMITTED_STATUSES } from "@/lib/constants/bid-status";
import { F } from "@/lib/dashboard/types";  // Notion 欄位名稱
import { logger } from "@/lib/logger";      // 日誌記錄
```

### 12. 向後相容

- `src/lib/dashboard/types.ts` re-export 常數（如 `SUBMITTED_STATUSES`）以維持向後相容
- 新增 AppSettings 欄位時使用 `?` optional，讓舊資料自動 fallback 到 DEFAULT_SETTINGS
- `settings-context.tsx` 的 `loadSettings()` 會自動 merge 舊設定與新預設值

---

## 關鍵檔案索引

| 目的 | 檔案 |
|------|------|
| 功能註冊 | `src/lib/modules/feature-registry.ts` |
| 路由守衛 | `src/lib/modules/FeatureGuard.tsx` |
| 設定型別 | `src/lib/settings/types.ts` |
| 設定預設值 | `src/lib/settings/defaults.ts` |
| 設定 Context | `src/lib/context/settings-context.tsx` |
| 狀態常數 | `src/lib/constants/bid-status.ts` |
| 欄位對照 | `src/lib/constants/field-mapping.ts` |
| API 欄位 | `src/lib/constants/notion-fields.ts` |
| 側欄導覽 | `src/components/layout/Sidebar.tsx` |
| 儀表板指標 | `src/lib/dashboard/useDashboardMetrics.ts` |
| 儀表板輔助函式 | `src/lib/dashboard/helpers.ts` |
| 卡片註冊表 | `src/lib/dashboard/card-layout/card-registry.ts` |
| 指標註冊表 | `src/lib/dashboard/card-layout/metric-registry.ts` |
| 卡片佈局型別 | `src/lib/dashboard/card-layout/types.ts` |
| 佈局管理 Hook | `src/lib/dashboard/card-layout/useCardLayout.ts` |
| Logger 服務 | `src/lib/logger/index.ts` |
| Logger 型別 | `src/lib/logger/types.ts` |
| 版本歷史 | `src/data/changelog.ts` |
| AI 階段 | `src/data/config/stages.ts` |

---

## 指令

- `npm run dev` — 開發模式（port 3000）
- `npm run build` — 生產建置（每次修改後必須驗證）
- `npm test` — 執行測試（vitest）
- `npm run lint` — ESLint 檢查
