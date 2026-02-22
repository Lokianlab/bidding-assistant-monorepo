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

## 5. Vitest Mock 陷阱（Page 測試）

補 `src/app/` 頁面測試時，兩個非顯而易見的 mock 問題（3O5L 0223 整理）：

### 陷阱一：mock 工廠每次回傳新物件 → useEffect 無限重渲染 → OOM 崩潰

```ts
// ❌ 危險：每次 render 都回傳不同物件參考
vi.mock('@/lib/settings', () => ({
  useSettings: () => ({ user: { name: 'test' } })  // 新物件 ≠ 舊物件
}))

// ✅ 安全：物件在 mock 外部宣告，參考穩定
const mockUser = { name: 'test' }
vi.mock('@/lib/settings', () => ({
  useSettings: () => ({ user: mockUser })
}))
```

**根因**：React `useEffect` 的依賴陣列比對用 `Object.is`（參考相等）。mock 每次回傳新物件 → 每次 render 依賴「改變」→ effect 觸發 → setState → render → 無限循環。

### 陷阱二：靜態 import 含 recharts 的元件 → ESM 錯誤（即使條件渲染不走到）

```ts
// ❌ 危險：即使從不渲染 CardRenderer，import 就已觸發 recharts ESM 解析
import CardRenderer from '@/components/dashboard/CardRenderer'

// ✅ 解法一：dynamic import（讓 vitest 跳過靜態解析）
const CardRenderer = dynamic(() => import('@/components/dashboard/CardRenderer'))

// ✅ 解法二：在測試中 mock 掉整個模組
vi.mock('@/components/dashboard/CardRenderer', () => ({
  default: () => null
}))
```

**根因**：vitest 在 Node.js 環境執行，recharts 使用 ESM 語法（`import.meta`），Node.js 原生解析時爆錯，跟元件是否被渲染無關。

### 陷阱三：mock 預設值踩在業務邊界 → 意外觸發業務規則

```ts
// ❌ 危險：budget 剛好 = budgetMax 邊界，觸發 must 分類而非 other
const mockDetailSuccess = { budget: '1,000,000元', ... }  // 100萬 = 分類門檻

// ✅ 安全：遠離業務邊界的安全值
const mockDetailSuccess = { budget: '50,000,000元', ... }  // 5千萬，不觸發任何邊界
```

**根因**：mock 預設值恰好等於或接近程式的判斷門檻（`budgetMax: 1_000_000`），導致看起來無關的測試改動突然讓多個測試同時爆。
**教訓**：mock 預設值要選「中性值」——遠離所有業務邊界，不觸發任何特殊邏輯。（A44T 0223）

## 6. Claude Desktop App 大檔問題

Session 檔案超過 10MB 時，Claude Desktop App 會出現 "Failed to load session" 錯誤，無法載入對話。這是 Desktop App 的已知限制，與 Claude Code CLI 無關。
