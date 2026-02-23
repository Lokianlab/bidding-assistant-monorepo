# ITEJ + AINL 工作包：M02 知識庫模組

> **分派者**：JDNE | **優先序**：🔴 最高 | **截止日期**：2026-02-24（API）/ 2026-02-24（UI）

---

## 任務概覽

**雙機協作**：
- **ITEJ**：後端 API + Supabase schema（目標完成：2026-02-24）
- **AINL**：前端 UI + 搜尋引擎（目標完成：2026-02-24）

**工作量估計**：各約 1.5 天（並行推進）

**核心功能**：五大知識庫（00A-00E）的上傳、搜尋、管理 + 多租戶隔離

---

## 一、背景與五大知識庫

```
00A：團隊資料庫      👥 團隊成員、學歷、證照、經歷
00B：實績資料庫      🏆 公司專案實績、工作內容、成果數據
00C：時程範本庫      📅 標準專案時程範本、階段分工
00D：應變 SOP 庫     🛡️  風險應變標準作業程序
00E：案後檢討庫      📝 案件結案檢討與經驗回饋
```

---

## 二、ITEJ 工作包：後端 API + Supabase

### 2.1 代碼結構

```
src/lib/knowledge-base/
  ├── types.ts                  ← 介面定義（已部分存在）
  ├── constants.ts              ← 知識庫定義（已存在）
  ├── helpers.ts                ← 搜尋邏輯、索引
  ├── rls-policies.sql          ← RLS 隔離策略（新增）
  └── __tests__/
      ├── helpers.test.ts
      ├── integration.test.ts (API)

src/app/api/kb/
  ├── route.ts                  ← 統一路由
  ├── upload/                   ← POST /api/kb/upload
  ├── search/                   ← POST /api/kb/search
  ├── list/                     ← GET /api/kb/list
  ├── get/                       ← GET /api/kb/get/[entryId]
  ├── delete/                   ← DELETE /api/kb/delete/[entryId]
  ├── update/                   ← PATCH /api/kb/update/[entryId]
  └── export/                   ← POST /api/kb/export

src/lib/supabase/
  └── kb-schema.sql             ← 完整 schema 定義（新增）
```

### 2.2 Supabase Schema 設計

**ITEJ 負責**：執行以下 SQL（需在 Supabase 儀表板執行）

```sql
-- 知識庫主表
CREATE TABLE kb_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL CHECK (category_id IN ('00A', '00B', '00C', '00D', '00E')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,                    -- Markdown
  summary TEXT,                             -- 摘要（搜尋用）
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],     -- 標籤陣列
  metadata JSONB DEFAULT '{}'::JSONB,      -- 柔性欄位
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,                         -- 建立者名稱（展示用）
  source_bid_id TEXT,                      -- 來自哪個案件（M11 回流用）

  CONSTRAINT kb_entries_user_category UNIQUE (user_id, category_id, title)
);

-- 搜尋索引（全文搜尋）
CREATE INDEX kb_entries_search_idx ON kb_entries
  USING GIN(to_tsvector('chinese', title || ' ' || content));

CREATE INDEX kb_entries_category_idx ON kb_entries(user_id, category_id, status);
CREATE INDEX kb_entries_tags_idx ON kb_entries USING GIN(tags);

-- 訪問日誌（追蹤使用者搜尋行為，可選）
CREATE TABLE kb_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entry_id UUID REFERENCES kb_entries(id),
  action TEXT NOT NULL CHECK (action IN ('search', 'view', 'download', 'export')),
  query TEXT,                              -- 搜尋詞彙
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX kb_access_log_user_idx ON kb_access_log(user_id);

-- RLS 隔離策略
ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_access_log ENABLE ROW LEVEL SECURITY;

-- 只能看自己的知識庫條目
CREATE POLICY kb_entries_select_policy ON kb_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY kb_entries_insert_policy ON kb_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY kb_entries_update_policy ON kb_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY kb_entries_delete_policy ON kb_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 訪問日誌隔離
CREATE POLICY kb_access_log_select_policy ON kb_access_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY kb_access_log_insert_policy ON kb_access_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2.3 API 設計

#### POST /api/kb/upload
**功能**：上傳新的知識庫條目

**請求**：
```typescript
{
  categoryId: "00A" | "00B" | "00C" | "00D" | "00E";
  title: string;
  content: string;              // Markdown
  summary?: string;             // 搜尋摘要
  tags?: string[];
  metadata?: {
    [key: string]: string;      // 任意鍵值對
  };
  status?: "draft" | "active";
  sourceBidId?: string;         // M11 回流來源
}
```

**回應**：
```typescript
{
  success: boolean;
  entry: {
    id: string;
    categoryId: string;
    title: string;
    createdAt: ISO8601;
  };
}
```

#### POST /api/kb/search
**功能**：全文搜尋知識庫

**請求**：
```typescript
{
  query: string;                // 搜尋詞彙
  categoryFilter?: string[];    // 限定類別（如 ["00A", "00B"]）
  limit?: number;               // 預設 20
  offset?: number;              // 分頁
}
```

**回應**：
```typescript
{
  success: boolean;
  results: {
    id: string;
    categoryId: string;
    title: string;
    summary: string;
    relevanceScore: number;     // 0-1
    tags: string[];
    createdAt: ISO8601;
    highlight?: string;         // 搜尋高亮片段
  }[];
  total: number;               // 總筆數
  nextOffset?: number;         // 下一頁 offset
}
```

#### GET /api/kb/list?category=00A&status=active&limit=50
**功能**：列表檢視知識庫條目

**回應**：
```typescript
{
  success: boolean;
  entries: KBEntry[];
  total: number;
  categoryStats: {
    categoryId: string;
    count: number;
    lastUpdated: ISO8601;
  }[];
}
```

#### GET /api/kb/get/[entryId]
**功能**：取得完整條目內容

**回應**：
```typescript
{
  success: boolean;
  entry: {
    id: string;
    categoryId: string;
    title: string;
    content: string;            // 完整 Markdown
    metadata: Record<string, string>;
    createdAt: ISO8601;
    updatedAt: ISO8601;
    createdBy: string;
  };
}
```

#### PATCH /api/kb/update/[entryId]
**功能**：更新條目

**請求**：
```typescript
{
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  status?: "draft" | "active" | "archived";
  metadata?: Record<string, string>;
}
```

#### DELETE /api/kb/delete/[entryId]
**功能**：刪除條目（邏輯刪除或實體刪除）

### 2.4 型別定義（types.ts 擴展）

```typescript
// src/lib/knowledge-base/types.ts

export type KBCategoryId = "00A" | "00B" | "00C" | "00D" | "00E";
export type KBEntryStatus = "active" | "draft" | "archived";

export interface KBEntry {
  id: string;
  categoryId: KBCategoryId;
  title: string;
  content: string;              // Markdown
  summary?: string;
  tags: string[];
  metadata: Record<string, string>;
  status: KBEntryStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sourceBidId?: string;
}

export interface KBSearchResult {
  id: string;
  categoryId: KBCategoryId;
  title: string;
  summary: string;
  relevanceScore: number;       // 0-1
  tags: string[];
  createdAt: string;
  highlight?: string;           // 搜尋高亮片段
}

export interface KBSearchRequest {
  query: string;
  categoryFilter?: KBCategoryId[];
  limit?: number;
  offset?: number;
}

export interface KBUploadRequest {
  categoryId: KBCategoryId;
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  metadata?: Record<string, string>;
  status?: KBEntryStatus;
  sourceBidId?: string;
}
```

### 2.5 核心邏輯（helpers.ts）

```typescript
// src/lib/knowledge-base/helpers.ts

/**
 * 從 Markdown 內容提取摘要（前 200 字）
 */
export function extractSummary(content: string, maxLength = 200): string {
  // 移除 Markdown 語法
  let text = content
    .replace(/^#+\s/gm, "")                 // 移除標題
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 提取連結文字
    .replace(/[*_`]/g, "")                 // 移除強調符號
    .trim();

  return text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");
}

/**
 * 計算相關性分數（基於 TF-IDF 或簡單匹配）
 */
export function calculateRelevanceScore(
  query: string,
  title: string,
  content: string
): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const titleMatches = queryWords.filter((w) =>
    title.toLowerCase().includes(w)
  ).length;
  const contentMatches = queryWords.filter((w) =>
    content.toLowerCase().includes(w)
  ).length;

  // 標題匹配權重更高
  return Math.min((titleMatches * 0.5 + contentMatches * 0.1) / queryWords.length, 1);
}

/**
 * 搜尋高亮片段（提取匹配上下文）
 */
export function generateHighlight(content: string, query: string, contextLength = 50): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return "";

  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + query.length + contextLength);

  const snippet = content.substring(start, end);
  const highlighted = snippet.replace(
    new RegExp(`(${query})`, "gi"),
    "<mark>$1</mark>"
  );

  return (start > 0 ? "..." : "") + highlighted + (end < content.length ? "..." : "");
}
```

### 2.6 API Routes（route.ts 示例：upload）

```typescript
// src/app/api/kb/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractSummary } from "@/lib/knowledge-base/helpers";

export async function POST(req: NextRequest) {
  try {
    // 驗證使用者
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 取得 Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // 後端使用 service role
    );

    const body = await req.json();
    const { categoryId, title, content, summary, tags, metadata, status } = body;

    // 驗證輸入
    if (!categoryId || !title || !content) {
      return NextResponse.json(
        { error: "缺少必要欄位" },
        { status: 400 }
      );
    }

    // 提取摘要（如未提供）
    const finalSummary = summary || extractSummary(content);

    // 插入資料庫
    const { data, error } = await supabase
      .from("kb_entries")
      .insert([
        {
          category_id: categoryId,
          title,
          content,
          summary: finalSummary,
          tags: tags || [],
          metadata: metadata || {},
          status: status || "active",
          created_by: "user", // 應從 auth 取得
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      entry: {
        id: data[0].id,
        categoryId: data[0].category_id,
        title: data[0].title,
        createdAt: data[0].created_at,
      },
    });
  } catch (err) {
    console.error("KB upload error:", err);
    return NextResponse.json(
      { error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}
```

### 2.7 測試清單（目標：60+ tests）

**helpers.test.ts**：
- [ ] `extractSummary` 正確提取摘要
- [ ] `calculateRelevanceScore` 分數計算
- [ ] `generateHighlight` 高亮片段生成

**integration.test.ts**（API）：
- [ ] POST /api/kb/upload 成功上傳
- [ ] POST /api/kb/search 返回結果（排序正確）
- [ ] GET /api/kb/list 列表分頁
- [ ] PATCH /api/kb/update 更新條目
- [ ] DELETE /api/kb/delete 刪除條目
- [ ] RLS 隔離：使用者 A 無法看到使用者 B 的資料
- [ ] 多租戶隔離驗證
- [ ] 錯誤處理（無效輸入、權限不足）

---

## 三、AINL 工作包：前端 UI + 搜尋引擎

### 3.1 代碼結構

```
src/components/m02/
  ├── KBUploader.tsx            ← 上傳表單（拖曳支援）
  ├── KBSearchView.tsx          ← 搜尋介面 + 結果展示
  ├── KBManager.tsx             ← 條目管理（列表、編輯、刪除）
  ├── KBCategoryTabs.tsx        ← 分類選單
  ├── KBEntryDetail.tsx         ← 條目詳情頁
  └── KBStatsPanel.tsx          ← 統計面板

src/lib/m02/
  ├── useKBSearch.ts            ← Hook：搜尋功能
  ├── useKBUpload.ts            ← Hook：上傳功能
  ├── useKBManager.ts           ← Hook：管理功能
  └── __tests__/
      ├── useKBSearch.test.ts
      ├── useKBUpload.test.ts
      └── integration.test.ts

src/app/m02/
  └── page.tsx                  ← /m02 知識庫頁面
```

### 3.2 React Hook：useKBSearch.ts

```typescript
// src/lib/m02/useKBSearch.ts

export function useKBSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KBSearchResult[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<KBCategoryId[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const search = useCallback(
    async (searchQuery: string, cats: KBCategoryId[] = categoryFilter) => {
      setLoading(true);
      setOffset(0);
      try {
        const res = await fetch("/api/kb/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            categoryFilter: cats.length > 0 ? cats : undefined,
            limit: 20,
          }),
        });

        if (!res.ok) throw new Error("搜尋失敗");

        const { results: found, total: count } = await res.json();
        setResults(found);
        setTotal(count);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter]
  );

  const loadMore = useCallback(async () => {
    try {
      const res = await fetch("/api/kb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          categoryFilter: categoryFilter.length > 0 ? categoryFilter : undefined,
          limit: 20,
          offset: offset + 20,
        }),
      });

      if (!res.ok) throw new Error("載入更多失敗");

      const { results: found } = await res.json();
      setResults((prev) => [...prev, ...found]);
      setOffset((prev) => prev + 20);
    } catch (err) {
      console.error("Load more error:", err);
    }
  }, [query, categoryFilter, offset]);

  return {
    query,
    setQuery,
    results,
    categoryFilter,
    setCategoryFilter,
    loading,
    total,
    search,
    loadMore,
    hasMore: results.length < total,
  };
}
```

### 3.3 React Hook：useKBUpload.ts

```typescript
// src/lib/m02/useKBUpload.ts

export function useKBUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (request: KBUploadRequest): Promise<KBEntry | null> => {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        // 模擬上傳進度
        setUploadProgress(30);

        const res = await fetch("/api/kb/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        setUploadProgress(90);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "上傳失敗");
        }

        const { entry } = await res.json();
        setUploadProgress(100);

        return entry;
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知錯誤");
        return null;
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    []
  );

  return {
    uploading,
    uploadProgress,
    error,
    upload,
  };
}
```

### 3.4 UI 元件：KBUploader.tsx

```typescript
// src/components/m02/KBUploader.tsx

export function KBUploader({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [categoryId, setCategoryId] = useState<KBCategoryId>("00A");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { uploading, uploadProgress, upload } = useKBUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("請填入標題與內容");
      return;
    }

    const success = await upload({
      categoryId,
      title,
      content,
      tags,
      status: "active",
    });

    if (success) {
      setTitle("");
      setContent("");
      setTags([]);
      onUploadSuccess?.();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // 解析上傳的文件（Markdown / TXT）
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <div>
        <Label>分類</Label>
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v as KBCategoryId)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="00A">👥 團隊資料庫</SelectItem>
            <SelectItem value="00B">🏆 實績資料庫</SelectItem>
            <SelectItem value="00C">📅 時程範本庫</SelectItem>
            <SelectItem value="00D">🛡️  應變 SOP 庫</SelectItem>
            <SelectItem value="00E">📝 案後檢討庫</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>標題</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="輸入標題..."
        />
      </div>

      <div>
        <Label>內容</Label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-4 ${isDragging ? "bg-blue-50" : ""}`}
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="輸入內容（支援 Markdown）或拖曳檔案..."
            className="min-h-64"
          />
          {isDragging && (
            <p className="text-sm text-gray-600 mt-2">鬆開滑鼠上傳檔案</p>
          )}
        </div>
      </div>

      <div>
        <Label>標籤</Label>
        <Input
          placeholder="輸入標籤，用空格分隔（如：重點 架構 經驗）"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const newTag = (e.target as HTMLInputElement).value.trim();
              if (newTag) {
                setTags([...tags, newTag]);
                (e.target as HTMLInputElement).value = "";
              }
            }
          }}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
            >
              {tag} ✕
            </Badge>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            上傳中 ({uploadProgress}%)
          </>
        ) : (
          "上傳至知識庫"
        )}
      </Button>
    </form>
  );
}
```

### 3.5 UI 元件：KBSearchView.tsx

```typescript
// src/components/m02/KBSearchView.tsx

export function KBSearchView() {
  const {
    query,
    setQuery,
    results,
    categoryFilter,
    setCategoryFilter,
    loading,
    total,
    search,
    loadMore,
    hasMore,
  } = useKBSearch();

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    search(newQuery);
  };

  return (
    <div className="space-y-6">
      {/* 搜尋框 */}
      <div className="sticky top-0 bg-white p-4 border-b">
        <Input
          placeholder="搜尋知識庫..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              search(query);
            }
          }}
          className="text-lg"
        />
      </div>

      {/* 分類篩選 */}
      <KBCategoryTabs
        selected={categoryFilter}
        onChange={(cats) => {
          setCategoryFilter(cats);
          search(query, cats);
        }}
      />

      {/* 結果統計 */}
      {query && (
        <div className="text-sm text-gray-600 px-4">
          找到 {total} 筆結果
        </div>
      )}

      {/* 搜尋結果 */}
      <div className="space-y-3 px-4">
        {loading && results.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            搜尋中...
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {query ? "未找到相符結果" : "輸入搜尋詞彙..."}
          </div>
        ) : (
          results.map((result) => (
            <KBSearchResultCard key={result.id} result={result} />
          ))
        )}

        {hasMore && (
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? "載入中..." : "載入更多"}
          </Button>
        )}
      </div>
    </div>
  );
}

function KBSearchResultCard({ result }: { result: KBSearchResult }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base">{result.title}</CardTitle>
            <CardDescription>
              {getKBCategoryLabel(result.categoryId)} • {new Date(result.createdAt).toLocaleDateString("zh-TW")}
            </CardDescription>
          </div>
          <Badge variant="outline">{Math.round(result.relevanceScore * 100)}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-700">{result.summary}</p>
        {result.highlight && (
          <div
            className="text-sm bg-yellow-50 p-2 rounded border-l-2 border-yellow-400"
            dangerouslySetInnerHTML={{
              __html: result.highlight,
            }}
          />
        )}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.6 測試清單（目標：60+ tests）

**useKBSearch.test.ts**：
- [ ] 搜尋返回結果（排序正確）
- [ ] 分類篩選生效
- [ ] 分頁載入更多
- [ ] 空搜尋查詢處理
- [ ] 特殊字符轉義

**useKBUpload.test.ts**：
- [ ] 上傳成功
- [ ] 進度追蹤
- [ ] 錯誤處理
- [ ] 必填欄位驗證

**integration.test.ts**（UI）：
- [ ] 搜尋流程：輸入 → 搜尋 → 結果顯示
- [ ] 上傳流程：選類別 → 填內容 → 上傳
- [ ] 分類篩選變動時搜尋更新
- [ ] 拖曳上傳文件
- [ ] 標籤管理

---

## 四、分派指示

### 📋 檢查清單（ITEJ）

- [ ] 讀完本工作包
- [ ] 確認 Supabase 專案已連接（環境變數就位）
- [ ] 確認 `.env.local` 有 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] npm install && npm run build

### 📋 檢查清單（AINL）

- [ ] 讀完本工作包
- [ ] 確認 Supabase 連接同上（ITEJ 在做）
- [ ] 查看 `src/lib/knowledge-base/constants.ts` 現有的五大類別定義
- [ ] npm install && npm run build

### ⏱️ 時間線

| 日期 | ITEJ 進度 | AINL 進度 |
|------|-----------|-----------|
| 0223 16:00 | Supabase schema 設計 | UI 布局規劃 |
| 0224 09:00 | Schema 部署 + API routes 完成 | Hook 完成 |
| 0224 17:00 | API 測試 50+/60 | UI 元件完成 + 集成 |
| **0224 23:59** | **merge ready** | **merge ready** |

### 🚨 注意事項

1. **並行推進**：ITEJ 與 AINL 可獨立開發，API contract 已定義清楚
2. **RLS 隔離**：所有 API 必須驗證多租戶，ITEJ 負責測試
3. **搜尋索引**：Supabase 內建 PostgreSQL 全文搜尋，無需額外引擎
4. **Markdown 支援**：上傳內容用 Markdown，前端可直接顯示
5. **M11 協調**：知識庫回流（M11 KB 反流）依賴本模組 API，M11 可等 API ready 後開始測試

---

**開始日期**：2026-02-23 16:00
**預計完成**：2026-02-24 23:59
**目標分支**：`feature/m02-knowledge-base`
