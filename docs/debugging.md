# Debugging & Development Lessons

## 1. 修 Bug 必須深挖根因，不可頭痛醫頭

**案例（2026-02-17 case-board 搜尋測試）：**

問題：測試搜尋 "台北" 預期配對 1 筆，實際配對 3 筆。

錯誤做法（頭痛醫頭）：
- 只改搜尋詞 "台北" → "公園" 讓測試通過
- 沒有追問：為什麼 3 筆都 match？

正確做法（深挖根因）：
- 發現 `makePage` helper 把所有 agency 硬寫成 "台北市政府"
- 搜尋 "台北" 同時匹配 name + agency，所以 3 筆全中
- 修正：`makePage` 加 agency 參數 + 每筆測試資料用不同 agency
- 拆分 4 個精確測試：name-only / agency-only / OR 邏輯 / 組合篩選

**原則 — 測試不通過時的調查流程：**
1. **先理解失敗訊息**：expected 1 got 3 — 為什麼是 3？不是「怎麼改成 pass」
2. **追溯資料流**：搜尋 "台北" → `applyBoardFilters` → 比對 name + agency → 3 筆 agency 都含「台北」
3. **判斷錯在哪一層**：是產品代碼有 bug？還是測試寫錯？還是測試資料有缺陷？
4. **從根源修正**：本例根因是測試資料設計不良，所以修 makePage + 測試資料，而非改斷言

**絕對不做：**
- 看到 expected 1 got 3 就把斷言改成 3
- 換一個搜尋詞碰巧讓結果 = 1 就收工
- 只看表面（「搜尋詞選錯了」）而不追問底層（「為什麼這個詞會配對到不該配的資料」）

## 2. 測試資料設計原則

- 每筆 mock 資料的區分欄位必須不同，否則無法隔離測試
- 避免所有 mock 共用同一個值（如 agency 全部 "台北市政府"）
- 測試名稱要明確說明測試的是哪條路徑（e.g. "matching name only" 而非 "search keyword"）

## 3. 閉環原則

閉環有兩層，缺一不可（詳見 CLAUDE.md §6）：

1. **做對了**（正確性）— 修改無錯誤、無遺漏、全域一致
2. **有效**（目的性）— 修改達成了原本要解決的目的

### 第一層：做對了

- 程式碼 → `npm test` + `npm run build` 全過
- 文件 / 設定檔 → grep 舊值，殘留為零、所有副本一致
- 環境變數 / 欄位改名 → grep 全 codebase，無斷鏈

### 第二層：有效

回到原始需求問自己：**那個問題現在真的解決了嗎？**
測試全過不代表功能真的能用。grep 零殘留不代表服務真的連得上。

### 常犯錯誤

- 跳過步驟 2（自我審查）直接跑 build
- 先跑 build 再寫測試（順序反了）
- 測試當事後補丁而非開發流程的一部分
- 改了一處文件，沒 grep 全 codebase 找其他副本（第一層斷裂）
- 測試全過就交付，沒確認功能實際行為符合預期（第二層缺失）
- 改了一處文件，沒 grep 全 codebase 找其他副本（閉環斷裂）

## 4. DocumentSettings.margins 單位不一致（已知問題，待用戶裁決）

**現象（0226 JDNE 審查發現）：**

`src/lib/settings/types.ts` 的 `DocumentSettings.margins` 沒有明確標注單位，導致兩個模組各自假設：
- `src/lib/docgen/generate-docx.ts`：把 margins 當 **cm**，乘 10 轉 mm 後再轉 twip（`margins.top * 10` → `convertMillimetersToTwip`）
- `src/lib/output/print-export.ts`：把 margins 當 **mm**，直接注入 CSS（`${margins.top}mm`）

**影響：**

`DEFAULT_SETTINGS.document.page.margins = { top: 1, bottom: 1, left: 1, right: 1 }`
- DOCX 輸出：1cm = 10mm 邊距（合理）
- HTML 列印：1mm 邊距（極小，幾乎無邊距）

兩個模組的測試資料也不同（generate-docx.test.ts 用 `{top:1,...}`，print-export.test.ts 用 `{top:25,...}`），各自測試通過但行為不同。

**待裁決：**

修法方向需要確認 UI 設定頁面顯示的單位標籤：
- 若 UI 顯示「cm」→ `print-export.ts` 需要改為 `${margins.top * 10}mm` 或 `${margins.top}cm`
- 若 UI 顯示「mm」→ `generate-docx.ts` 需要移除 `* 10`，並更新 `DEFAULT_SETTINGS` 為合理 mm 值（如 25/25/30/30）

在用戶裁決前，不應單方面修改任何一個模組。

## 6. Vitest Mock 三個陷阱

多台機器在補 page-level 測試時踩到，整理如下。（來源：3O5L/A44T/AINL 效率討論 0223）

### 陷阱一：Mock 工廠函式每次回傳新物件 → useEffect 無限重渲染 → OOM

```ts
// 危險：每次 render 都是新物件，React 認為 dependency 改變
vi.mock("@/lib/useData", () => ({
  useData: () => ({ items: [] }),  // 新物件
}));

// 安全：抽出常數，保持物件同一個引用
const MOCK_ITEMS: Item[] = [];
vi.mock("@/lib/useData", () => ({
  useData: () => ({ items: MOCK_ITEMS }),
}));
```

**根因**：`useEffect` 依賴陣列用 `Object.is` 比較，新物件 = 永遠不等 → 無限 re-render → OOM 崩潰。

### 陷阱二：靜態 import 含 recharts 的元件 → ESM 錯誤

即使元件被條件渲染（`{showChart && <Chart />}`），只要在測試環境靜態 import 就會觸發 recharts 的 ESM 問題。

**解法**：在測試檔頂部 mock 掉含圖表的元件：

```ts
vi.mock("@/components/charts/SomeChart", () => ({
  SomeChart: () => <div data-testid="mock-chart" />,
}));
```

**根因**：recharts 的 ESM 模組在 vitest 的 jsdom 環境下無法正常解析，即使不執行也會在 import 階段出錯。

### 陷阱三：Mock 預設值踩在業務邊界上

```ts
// 危險：budget "1,000,000元" 恰好命中分類門檻 budgetMax: 1_000_000
const mockDetailSuccess = (override = {}) => ({
  budget: "1,000,000元",  // 邊界值，默默觸發 must 分類
  ...override,
});

// 安全：預設值遠離業務邊界
const mockDetailSuccess = (override = {}) => ({
  budget: "50,000,000元",  // 遠超門檻，分類行為明確
  ...override,
});
```

**根因**：Mock 的預設值在業務邊界上，測試結果依賴具體數字而非邏輯，難以發現、難以維護。

**原則**：Mock 預設值選「離業務邊界遠的安全值」，邊界條件測試才明確設定邊界值。

## 5. Claude Desktop App 大檔問題

Session 檔案超過 10MB 時，Claude Desktop App 會出現 "Failed to load session" 錯誤，無法載入對話。這是 Desktop App 的已知限制，與 Claude Code CLI 無關。
