# SaaS Phase 1E：Notion 同步規格

> 負責方：3O5L｜優先級：🟡 中｜里程碑：SaaS Phase 1

---

## 目標

建立 Notion ↔ Supabase 知識庫雙向同步機制：
- **新增項目**：Supabase 新增 → 自動同步到 Notion
- **編輯項目**：Supabase 編輯 → 自動同步到 Notion
- **刪除項目**：Supabase 刪除 → Notion 標記為已刪除（不實際刪除）
- **Notion 單向讀**：初期支援從 Notion 單向讀取（M02 未來支援雙向編輯）

---

## 技術棧

- **Notion API**：Node.js SDK (`@notionhq/client`)
- **Message Queue**：可選，初期用簡單 cron（定時任務）
- **Monitoring**：Sync logs 記錄到 Supabase `sync_logs` 表

---

## 架構決策

### 雙向同步的複雜性 vs 初期簡化

> 為降低初期複雜度，Phase 1E 採用「**Supabase 為主，Notion 為輔**」策略：
>
> - **新增/編輯/刪除**一律在 Supabase 發生，自動推到 Notion
> - **Notion 單向讀**：定時掃描 Notion，發現新的行則匯入 Supabase
> - **衝突處理**：Supabase timestamp 優先（last_updated_at）
> - **Phase 2** 升級為真正的雙向同步（webhook + transaction）

### 同步時機

| 事件 | 觸發方式 | 延遲 |
|------|---------|------|
| 新增項目 | API route 直接呼叫 sync | 同步 |
| 編輯項目 | API route 直接呼叫 sync | 同步 |
| 刪除項目 | API route 標記 `deleted_at` + async sync | 非同步（<5min） |
| Notion 變更掃描 | Cron 每 1 小時 | 無 |

---

## 實現清單

### A. Notion 表結構設計

**表名稱**：`知識庫` (DB ID 待配置)

| 欄位 | Notion 類型 | 對應 Supabase | 說明 |
|------|-----------|-------------|------|
| 名稱 | Title | title | 主鍵 |
| 分類 | Select | category | 00A-00E |
| 標籤 | Multi-select | tags | 用逗號分隔存放 |
| 內容 | Rich text | content | Markdown 格式 |
| 建立者 | People | created_by | User email |
| 建立時間 | Date | created_at | ISO 8601 |
| 修改時間 | Date | updated_at | ISO 8601 |
| 同步狀態 | Select | sync_status | `pending/done/failed` |

### B. Sync Engine

**檔案**：`src/lib/kb/notion-sync.ts`（新增）

#### 同步 Supabase → Notion

```ts
export async function syncItemToNotion(
  item: KBItem,
  operation: 'create' | 'update' | 'delete'
) {
  // 1. 準備 Notion 格式資料
  const notionData = {
    properties: {
      '名稱': { title: [{ text: { content: item.title } }] },
      '分類': { select: { name: item.category } },
      '標籤': { rich_text: [{ text: { content: item.tags?.join(', ') || '' } }] },
      '內容': { rich_text: [{ text: { content: item.content || '' } }] },
      '修改時間': { date: { start: item.updated_at.toISOString() } },
      '同步狀態': { select: { name: 'done' } },
    },
  };

  try {
    if (operation === 'create') {
      // 在 Notion 新建頁面
      await notion.pages.create({
        parent: { database_id: NOTION_KB_DB_ID },
        properties: notionData.properties,
      });
    } else if (operation === 'update') {
      // 查詢該項目對應的 Notion page ID，然後更新
      const pageId = await findNotionPageByTitle(item.title);
      if (!pageId) throw new Error(`Notion page not found for ${item.title}`);

      await notion.pages.update({
        page_id: pageId,
        properties: notionData.properties,
      });
    } else if (operation === 'delete') {
      // 標記為已刪除（不實際刪除 Notion 頁面）
      const pageId = await findNotionPageByTitle(item.title);
      if (pageId) {
        await notion.pages.update({
          page_id: pageId,
          properties: {
            '同步狀態': { select: { name: 'deleted' } },
          },
        });
      }
    }

    // 2. 記錄到 sync_logs
    await recordSyncLog('success', `${operation} ${item.id}`, null);
  } catch (error) {
    await recordSyncLog('error', `${operation} ${item.id}`, error.message);
    throw error;
  }
}
```

#### 同步 Notion → Supabase（單向讀）

```ts
export async function syncNotionToSupabase(tenantId: string) {
  // 1. 掃描 Notion 表
  const pages = await notion.databases.query({
    database_id: NOTION_KB_DB_ID,
    filter: {
      property: '同步狀態',
      select: { does_not_equal: 'deleted' }, // 忽略已刪除的
    },
  });

  // 2. 逐頁檢查是否在 Supabase 已存在
  for (const page of pages.results) {
    const title = extractTitleFromNotionPage(page);
    const existingItem = await supabase
      .from('kb_items')
      .select('id, updated_at')
      .eq('tenant_id', tenantId)
      .eq('title', title)
      .single();

    // 3. 新項目或 Notion 較新 → 匯入
    if (!existingItem.data || new Date(page.last_edited_time) > existingItem.data.updated_at) {
      const item = notionPageToKBItem(page, tenantId);

      if (!existingItem.data) {
        // 新增
        await supabase.from('kb_items').insert(item);
      } else {
        // 更新（只在 Notion 較新時）
        await supabase.from('kb_items').update(item).eq('id', existingItem.data.id);
      }

      await recordSyncLog('success', `import ${title}`, null);
    }
  }
}
```

### C. API Routes

**檔案**：`src/app/api/kb/items/route.ts`（修改 P1C，新增同步邏輯）

```ts
// 在 POST /api/kb/items 後呼叫
export async function POST(req: Request) {
  const data = await req.json();
  const item = await createKBItemService(data);

  // 立即同步到 Notion（同步）
  try {
    await syncItemToNotion(item, 'create');
  } catch (syncError) {
    // 不阻塞 API 回應，但記錄錯誤
    logger.error('sync', `Failed to sync item ${item.id} to Notion: ${syncError.message}`);
  }

  return Response.json(item, { status: 201 });
}

// 在 PATCH /api/kb/items/{id} 後呼叫
export async function PATCH(req: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  const updates = await req.json();
  const item = await updateKBItemService(id, updates);

  // 非同步同步
  syncItemToNotion(item, 'update').catch((syncError) => {
    logger.error('sync', `Failed to sync item ${id} to Notion: ${syncError.message}`);
  });

  return Response.json(item);
}
```

### D. Cron Job

**檔案**：`src/app/api/cron/sync-notion/route.ts`（新增）

```ts
export async function GET(req: Request) {
  // 驗證 cron secret
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 掃描所有租戶
    const tenants = await supabase.from('tenants').select('id');

    for (const tenant of tenants.data || []) {
      await syncNotionToSupabase(tenant.id);
    }

    return Response.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    logger.error('cron', `Notion sync failed: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### E. 同步紀錄表

**Supabase 已在 P1A 中定義 `sync_logs` 表**：

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| operation | TEXT | `create/update/delete/import` |
| item_id | UUID | KB 項目 ID（import 無 ID） |
| status | TEXT | `success/error` |
| error_msg | TEXT | 錯誤訊息（如有） |
| created_at | TIMESTAMP | 記錄時間 |

### F. 環境變數

```env
NOTION_TOKEN=secret_...
NOTION_KB_DB_ID=123abc...
CRON_SECRET=your-secret-key
```

---

## 測試計劃

| 場景 | 預期結果 |
|------|--------|
| 在 Supabase 新增項目 | 1 秒內同步到 Notion |
| 在 Supabase 編輯項目 | 編輯後同步到 Notion |
| 在 Supabase 刪除項目 | Notion 頁面狀態改為 `deleted` |
| 在 Notion 新增頁面 → Cron 觸發 | 1 小時內匯入 Supabase |
| Notion 修改 ← 更新時間較新 | 下次 Cron 時覆蓋 Supabase |
| API 呼叫時 Notion 暫時不可用 | API 仍返回 200，記錄 sync error log |
| 批量建立 10 項 | 全部同步完成（無遺漏） |

---

## 驗收標準

- [ ] 新增項目自動同步到 Notion
- [ ] 編輯項目自動同步到 Notion
- [ ] 刪除項目標記為 deleted（Notion 頁面保留）
- [ ] Cron 每小時掃描 Notion 並匯入新頁面
- [ ] Sync logs 完整記錄所有操作
- [ ] 衝突時以 Supabase 為準（timestamp）
- [ ] 20+ 測試通過
- [ ] 文件完整（配置指南、故障排除）

---

## 後續與優化

### Phase 2：真正的雙向同步

- 支援 Notion webhook（即時推播）
- 真正支援 Notion 側編輯同步回 Supabase
- Transaction 層級的一致性保證
- Conflict resolution 策略升級

### 可選優化

- Message queue（RabbitMQ / Bull）替代 cron
- Batch sync（每批 50 筆減少 API 呼叫）
- Retry logic（指數退避）

---

## 所需依賴

```json
{
  "@notionhq/client": "^2.x",
  "date-fns": "^3.x"
}
```

確認已安裝：`npm list @notionhq/client`
