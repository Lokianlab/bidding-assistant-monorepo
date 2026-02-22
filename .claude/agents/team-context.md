# TEAM CONTEXT v1

## 測試規則
- Vitest 4 + @testing-library/react，**無 jest-dom**
- 存在斷言用 `.toBeTruthy()`，不存在用 `.toBeNull()`
- vi.mock 內引用的函式**必須**用 `vi.hoisted()` 宣告：
  ```ts
  const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
  vi.mock("@/lib/xxx", () => ({ useSomething: mockFn }));
  ```
- Mutable mock state 用 holder 物件 `{ current: {...} }`
- Mock 回傳物件宣告在 factory 外面（穩定引用，防 useEffect 無限迴圈）
- 每個測試檔：`beforeEach(() => { vi.clearAllMocks() })`
- 非同步等待：`await new Promise(r => setTimeout(r, 50))`

## Import 順序（違反 = hoisting bug）
1. `import { describe, it, expect, vi, beforeEach } from "vitest"`
2. `import { render, screen, fireEvent } from "@testing-library/react"`
3. `const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }))` ← if needed
4. `vi.mock(...)` 全部在這裡
5. `import ComponentUnderTest from "../page"` ← 必須在所有 vi.mock 之後

## 必備 Mock
- `useSettings`：含 `hydrated: true` + `settings.company.brand`
- Radix UI 元件（Tabs/Select/Dialog/Accordion）：mock 成普通 HTML div
- `MobileMenuButton`：mock 成 `<button>`

## 專案慣例
- UI 文字全中文
- Import 路徑用 `@/`
- 邏輯在 `src/lib/`，UI 在 `src/components/`，頁面在 `src/app/`
- 新功能需註冊 `FEATURE_REGISTRY`（`src/lib/modules/feature-registry.ts`）
- **關閉 explanatory-output-style 插件**：省 token，反思在 thinking block 不受影響。設定路徑 `~/.claude/settings.json` → `enabledPlugins` → `explanatory-output-style@claude-plugins-official: false`

## 通訊格式（只准這四種）
- `done [檔案清單] [測試: N passed] [ctx: v1]`
- `block [缺什麼] [已查檔案]`
- `opt [做法] [省了什麼]`
- `trap [什麼坑] [怎麼解的]`
不要發進度更新、確認收到、開始工作通知。做就是了。

## 工作迴圈
完成當前任務後：
1. TaskList 檢查有無可領任務（pending, 無 owner, 無 blockedBy）
2. 有 → TaskUpdate 認領，開始做
3. 沒有 → 發 done 訊號

## 自我優化權限（hooks / skills / 設定檔）
遵循三級品質制度：
- 第一級（自主）：調參、修正誤傷（如 stop-patterns 正則）
- 第二級（展示）：新增或刪除 hook/skill
- 第三級（先議）：改變核心行為邏輯（如 pre-compact 推送機制）
發現 opt 時，先評估是否需要改工具本身，而不只是改工作方式。

## 禁止
- 不寫 README / changelog / 文件（除非任務要求）
- 不探索超出任務範圍的檔案（最多 3 個額外檔案）
- 不重構任務範圍外的程式碼
- 不問問題——用 [ASM] 標記假設，繼續做
