# SaaS Phase 1D：知識庫 UI 規格

> 負責方：Z1FV｜優先級：🟡 中｜里程碑：SaaS Phase 1

---

## 目標

建立知識庫管理介面，使用戶能以 UI 操作知識庫的 CRUD 功能：
- 瀏覽知識庫分類（00A-00E）
- 新增/編輯/刪除項目
- 全文搜尋
- 支援階層結構（父子關係）

---

## 技術棧

- **Frontend**：React 19 + TypeScript + Tailwind CSS 4
- **API Client**：Fetch API（呼叫 P1C API）
- **State Management**：React hooks（React Query 或 Zustand 可選）
- **UI Components**：shadcn/radix-ui 元件庫
- **Tables**：TanStack Table v8（大量資料表格）

---

## 實現清單

### A. 頁面佈局

**檔案**：`src/app/kb/page.tsx`（新增）

佈局結構：
```
┌─────────────────────────────────────────┐
│  知識庫管理                              │
├──────────┬──────────────────────────────┤
│ 分類選單 │ 搜尋欄 + 新增按鈕            │
│ • 00A    ├──────────────────────────────┤
│ • 00B    │ 項目表格（名稱、分類、操作） │
│ • 00C    │                              │
│ • 00D    │                              │
│ • 00E    │                              │
│          │                              │
│ 展開/收合 │  [分頁控制]                 │
└──────────┴──────────────────────────────┘
```

- **左側**：分類選單（filter），每類單獨計數
- **右側**：表格 + 搜尋欄
- **表格欄位**：checkbox + title + category + tags + created_by + created_at + 操作（編輯/刪除）

### B. 服務層

**檔案**：`src/lib/kb/api-client.ts`（新增）

```ts
export class KBApiClient {
  // 列表查詢（含分頁、篩選、排序）
  async listItems(
    tenantId: string,
    filters: {
      category?: string;
      search?: string;
      parentId?: string;
      page?: number;
      perPage?: number;
      sortBy?: string;
    }
  ): Promise<{ items: KBItem[], total: number }>

  // 單筆查詢
  async getItem(tenantId: string, itemId: string): Promise<KBItem>

  // 新增
  async createItem(tenantId: string, data: Omit<KBItem, 'id' | 'created_at'>): Promise<KBItem>

  // 編輯
  async updateItem(tenantId: string, itemId: string, data: Partial<KBItem>): Promise<KBItem>

  // 刪除
  async deleteItem(tenantId: string, itemId: string): Promise<void>

  // 搜尋
  async searchItems(tenantId: string, query: string): Promise<KBItem[]>
}
```

### C. Custom Hook

**檔案**：`src/lib/kb/useKBItems.ts`（新增）

```ts
export function useKBItems(category?: string) {
  // 回傳：
  // - items: 項目陣列
  // - total: 總數
  // - isLoading: 載入狀態
  // - error: 錯誤訊息
  // - refetch: 重新載入
  // - pagination: { page, setPage, perPage, setPerPage }
  // - selection: { selected[], setSelected, toggleAll, toggleOne }

  return { items, total, isLoading, error, refetch, pagination, selection }
}

export function useKBForm() {
  // 表單 hook（新增/編輯）
  // 回傳：
  // - form: { title, category, tags, content, parentId }
  // - setForm: 更新表單
  // - reset: 重置表單
  // - errors: { field => errorMsg }
  // - validate: () => boolean
  // - submit: async (tenantId, itemId?) => void

  return { form, setForm, reset, errors, validate, submit, isSubmitting }
}
```

### D. UI 元件

**檔案**：`src/components/kb/` （新增）

| 元件 | 說明 | Acceptance |
|------|------|-----------|
| `KBSidebar.tsx` | 分類選單 + 計數 | 點擊切換分類，表格重新載入 |
| `KBSearchBar.tsx` | 搜尋欄 + 篩選條件 | 輸入搜尋、按 Enter 或點擊搜尋按鈕 |
| `KBTable.tsx` | 項目表格 TanStack Table | 支援排序、分頁、多選 |
| `KBActionCell.tsx` | 表格操作欄（編輯/刪除） | 編輯開對話框，刪除確認對話框 |
| `CreateKBItemDialog.tsx` | 新增項目對話框 | 表單驗證、API 呼叫、成功回饋 |
| `EditKBItemDialog.tsx` | 編輯項目對話框 | 預填表單、修改後提交 |
| `DeleteKBItemConfirm.tsx` | 刪除確認對話框 | 二度確認、不可復原警告 |

### E. 頁面集成

**檔案**：`src/app/kb/page.tsx`

```ts
export default function KBPage() {
  const { items, isLoading, error, refetch, pagination, selection } = useKBItems(selectedCategory);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KBItem | null>(null);

  return (
    <div className="flex h-screen gap-4 p-4">
      <KBSidebar onCategoryChange={(cat) => {/* */}} />
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <KBSearchBar onSearch={refetch} />
          <Button onClick={() => setIsCreateDialogOpen(true)}>新增項目</Button>
        </div>
        {isLoading && <Skeleton />}
        {error && <ErrorAlert message={error} />}
        {items && <KBTable items={items} onEdit={setEditingItem} onDelete={setDeletingItem} />}
        {/* Dialogs */}
        {isCreateDialogOpen && <CreateKBItemDialog open onClose={() => { setIsCreateDialogOpen(false); refetch(); }} />}
        {editingItem && <EditKBItemDialog item={editingItem} open onClose={() => { setEditingItem(null); refetch(); }} />}
        {deletingItem && <DeleteKBItemConfirm item={deletingItem} open onConfirm={() => { setDeletingItem(null); refetch(); }} />}
      </div>
    </div>
  );
}
```

---

## 測試計劃

| 場景 | 預期結果 |
|------|--------|
| 載入頁面 | 預設顯示全部分類，表格列出所有項目 |
| 點擊分類篩選 | 表格只顯示該分類的項目 |
| 輸入搜尋關鍵字 + Enter | 表格篩選出包含關鍵字的項目（標題或內容） |
| 點擊「新增項目」 | 開啟建立對話框，可填入標題/分類/標籤/內容 |
| 提交新項目 | API 呼叫 POST /api/kb/items，成功後刷新表格 |
| 點擊編輯 | 開啟編輯對話框，預填當前項目資訊 |
| 修改並提交 | API 呼叫 PATCH /api/kb/items/{id}，成功後表格更新 |
| 點擊刪除 → 確認 | API 呼叫 DELETE /api/kb/items/{id}，成功後表格移除該列 |
| 分頁 | 翻頁正常，表格資料切換 |
| 多選 + 批量操作 | 選中多筆項目，支援批量刪除（可選） |

---

## 驗收標準

- [ ] 頁面載入無錯誤
- [ ] 分類篩選功能正常
- [ ] 搜尋功能正常（支援中文）
- [ ] 表格能正確顯示所有欄位
- [ ] 新增/編輯/刪除三大操作通過驗收
- [ ] 分頁正常
- [ ] API 呼叫成功率 100%（無 timeout、400、500）
- [ ] 全部 40+ 測試通過（含 UI 單體測試 + 整合測試）
- [ ] Lighthouse 效能分數 > 80（FCP < 1.5s）

---

## 依賴與基礎

- **P1C 完成**（API endpoints 已實裝）
- **P1B 完成**（Session 和租戶 ID 可取得）
- **Supabase Schema 已初始化**

---

## 後續與關聯

- **P1E**：Notion 同步（知識庫資料往 Notion 同步）
- **M02 知識庫模組**：使用此 UI 作為初期版本

---

## 所需依賴

```json
{
  "@tanstack/react-table": "^8.x",
  "react-query": "^3.x",  // 或 @tanstack/react-query ^5.x
  "zustand": "^4.x"       // 可選
}
```

確認已安裝：`npm list @tanstack/react-table react-query`
