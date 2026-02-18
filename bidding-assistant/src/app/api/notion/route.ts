import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

// ─── Notion REST API response type definitions ───

/** Notion rich text item (minimal shape for plain_text extraction) */
interface NotionRichTextItem {
  plain_text: string;
}

/** Notion select/status option (minimal shape) */
interface NotionSelectOption {
  name: string;
}

/** Notion person (minimal shape) */
interface NotionPerson {
  name?: string;
  id: string;
}

/** A single Notion property value as returned by the REST API */
interface NotionPropertyValue {
  type: string;
  title?: NotionRichTextItem[];
  rich_text?: NotionRichTextItem[];
  number?: number | null;
  select?: NotionSelectOption | null;
  multi_select?: NotionSelectOption[];
  date?: { start: string | null } | null;
  checkbox?: boolean;
  url?: string | null;
  status?: NotionSelectOption | null;
  people?: NotionPerson[];
  unique_id?: { prefix?: string; number?: number };
  formula?: { type: string; [key: string]: unknown };
  rollup?: { type: string; [key: string]: unknown };
}

/** Shape of a Notion page as returned by the REST query endpoint */
interface NotionPage {
  id: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, NotionPropertyValue>;
}

/** Shape of a Notion database query response */
interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
  message?: string;
}

/** Shape of a Notion database schema property */
interface NotionSchemaProp {
  type: string;
  id?: string;
  select?: { options?: NotionSelectOption[] };
  multi_select?: { options?: NotionSelectOption[] };
  status?: { options?: NotionSelectOption[] };
}

/** Shape of the Notion database response */
interface NotionDatabaseResponse {
  title?: NotionRichTextItem[];
  properties?: Record<string, NotionSchemaProp>;
  message?: string;
}

/** Parsed property value type */
type ParsedPropertyValue = string | number | boolean | string[] | null;

/** Parsed page shape returned to the client */
interface ParsedPage {
  id: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  properties: Record<string, ParsedPropertyValue>;
}

/** Notion API error shape */
interface NotionApiError {
  code?: string;
  message?: string;
  status?: number;
}

// ─── Helper functions ───

// 共用：解析單筆 Notion page properties
function parsePage(page: NotionPage): ParsedPage {
  const props: Record<string, ParsedPropertyValue> = {};
  for (const [key, val] of Object.entries(page.properties)) {
    switch (val.type) {
      case "title":
        props[key] = val.title?.map((t) => t.plain_text).join("") ?? "";
        break;
      case "rich_text":
        props[key] = val.rich_text?.map((t) => t.plain_text).join("") ?? "";
        break;
      case "number":
        props[key] = val.number ?? null;
        break;
      case "select":
        props[key] = val.select?.name ?? null;
        break;
      case "multi_select":
        props[key] = val.multi_select?.map((s) => s.name) ?? [];
        break;
      case "date":
        props[key] = val.date?.start ?? null;
        break;
      case "checkbox":
        props[key] = val.checkbox ?? null;
        break;
      case "url":
        props[key] = val.url ?? null;
        break;
      case "status":
        props[key] = val.status?.name ?? null;
        break;
      case "people":
        props[key] = val.people?.map((p) => p.name ?? p.id) ?? [];
        break;
      case "unique_id": {
        const prefix = val.unique_id?.prefix ?? "";
        const num = val.unique_id?.number ?? "";
        props[key] = prefix ? `${prefix}-${num}` : String(num);
        break;
      }
      case "formula": {
        const fType = val.formula?.type as string | undefined;
        const fVal = fType ? (val.formula?.[fType] as unknown) : undefined;
        if (fType === "date" && fVal && typeof fVal === "object" && fVal !== null && "start" in fVal) {
          props[key] = (fVal as { start: string | null }).start ?? null;
        } else {
          props[key] = (typeof fVal === "string" || typeof fVal === "number" || typeof fVal === "boolean")
            ? fVal
            : null;
        }
        break;
      }
      case "rollup": {
        const rollupType = val.rollup?.type as string | undefined;
        const rollupVal = rollupType ? (val.rollup?.[rollupType] as unknown) : undefined;
        props[key] = (typeof rollupVal === "string" || typeof rollupVal === "number" || typeof rollupVal === "boolean")
          ? rollupVal
          : null;
        break;
      }
      default:
        props[key] = null;
    }
  }
  return {
    id: page.id,
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: props,
  };
}

// 共用：解析 schema
function parseSchema(dbData: NotionDatabaseResponse) {
  const dbProps: Record<string, NotionSchemaProp> = dbData.properties ?? {};
  const schema: Record<string, { type: string; options?: string[]; id?: string }> = {};
  for (const [key, prop] of Object.entries(dbProps)) {
    schema[key] = { type: prop.type, id: prop.id };
    if (prop.type === "select" && prop.select?.options) {
      schema[key].options = prop.select.options.map((o) => o.name);
    }
    if (prop.type === "multi_select" && prop.multi_select?.options) {
      schema[key].options = prop.multi_select.options.map((o) => o.name);
    }
    if (prop.type === "status" && prop.status?.options) {
      schema[key].options = prop.status.options.map((o) => o.name);
    }
  }
  return schema;
}

/** 從 schema 中根據欄位名稱列表取得對應的 property ID 列表 */
function resolvePropertyIds(
  schema: Record<string, { type: string; id?: string }>,
  fieldNames: string[],
): string[] {
  const ids: string[] = [];
  for (const name of fieldNames) {
    const entry = schema[name];
    if (entry?.id) ids.push(entry.id);
  }
  return ids;
}

// ─── Notion query body type ───
interface NotionQueryBody {
  sorts?: Record<string, unknown>[];
  page_size?: number;
  filter?: Record<string, unknown>;
  filter_properties?: string[];
  start_cursor?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { token, databaseId, action, data } = await req.json();

    if (!token || !databaseId) {
      return NextResponse.json(
        { error: "缺少 Notion token 或 databaseId" },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: token });
    const commonHeaders = {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    switch (action) {
      case "query": {
        const queryBody: NotionQueryBody = {
          sorts: data?.sorts ?? [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: data?.pageSize ?? 50,
        };
        if (data?.filter) queryBody.filter = data.filter;
        if (data?.filterProperties) queryBody.filter_properties = data.filterProperties;

        const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(queryBody),
        });
        const response: NotionQueryResponse = await queryRes.json();

        if (!queryRes.ok) {
          console.error("Notion query error:", response);
          return NextResponse.json(
            { error: response.message ?? "Notion 查詢失敗" },
            { status: queryRes.status }
          );
        }

        return NextResponse.json({
          pages: response.results.map(parsePage),
          hasMore: response.has_more,
          nextCursor: response.next_cursor,
        });
      }

      case "update": {
        const { pageId, properties } = data;
        await notion.pages.update({
          page_id: pageId,
          properties,
        });
        return NextResponse.json({ success: true });
      }

      case "schema": {
        const schemaRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
        });
        const db: NotionDatabaseResponse = await schemaRes.json();

        if (!schemaRes.ok) {
          return NextResponse.json(
            { error: db.message ?? "無法取得資料庫" },
            { status: schemaRes.status }
          );
        }

        return NextResponse.json({
          schema: parseSchema(db),
          title: db.title?.[0]?.plain_text ?? "",
        });
      }

      // ===== 合併 action：schema + query（支援 quickLoad 快速首批載入） =====
      case "schema_and_query": {
        const quickLoad = data?.quickLoad === true;
        const requestedFields: string[] | undefined = data?.fields;

        // 第一步：先拿 schema（需要 property ID 來做 filter_properties）
        const schemaRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
          headers: { "Authorization": `Bearer ${token}`, "Notion-Version": "2022-06-28" },
        });
        const dbData: NotionDatabaseResponse = await schemaRes.json();

        if (!schemaRes.ok) {
          return NextResponse.json(
            { error: dbData.message ?? "無法取得資料庫" },
            { status: schemaRes.status }
          );
        }

        const sqSchema = parseSchema(dbData);

        // 解析需要的欄位 ID（如果前端有指定的話）
        const propIds = requestedFields
          ? resolvePropertyIds(sqSchema, requestedFields)
          : undefined;

        const sqBody: NotionQueryBody = {
          sorts: data?.sorts ?? [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 100,
        };
        if (data?.filter) sqBody.filter = data.filter;
        if (propIds && propIds.length > 0) sqBody.filter_properties = propIds;

        // 第二步：查詢第一頁
        const firstQueryResult = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(sqBody),
        });
        const firstQueryData: NotionQueryResponse = await firstQueryResult.json();

        if (!firstQueryResult.ok) {
          return NextResponse.json(
            { error: firstQueryData.message ?? "Notion 查詢失敗" },
            { status: firstQueryResult.status }
          );
        }

        const firstPages = firstQueryData.results.map(parsePage);

        // quickLoad 模式：只回傳第一頁，附帶 cursor 讓前端背景續抓
        if (quickLoad) {
          return NextResponse.json({
            schema: sqSchema,
            title: dbData.title?.[0]?.plain_text ?? "",
            pages: firstPages,
            total: firstPages.length,
            hasMore: firstQueryData.has_more,
            nextCursor: firstQueryData.next_cursor,
            // 回傳解析好的 propIds，讓前端 continue_query 也能用
            _propIds: propIds,
          });
        }

        // 完整模式：分頁抓完所有資料
        const allPages = [...firstPages];
        let hasMore = firstQueryData.has_more;
        let nextCursor = firstQueryData.next_cursor;

        const MAX_PAGES = 20;
        let pageCount = 1;
        while (hasMore && nextCursor && pageCount < MAX_PAGES) {
          const nextBody: NotionQueryBody = { ...sqBody, start_cursor: nextCursor };
          const nextRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: "POST",
            headers: commonHeaders,
            body: JSON.stringify(nextBody),
          });
          const nextData: NotionQueryResponse = await nextRes.json();
          if (!nextRes.ok) break;
          allPages.push(...nextData.results.map(parsePage));
          pageCount++;
          hasMore = nextData.has_more;
          nextCursor = nextData.next_cursor;
        }

        return NextResponse.json({
          schema: sqSchema,
          title: dbData.title?.[0]?.plain_text ?? "",
          pages: allPages,
          total: allPages.length,
        });
      }

      // ===== 繼續分頁查詢（前端背景續抓用） =====
      case "continue_query": {
        const cursor = data?.cursor;
        if (!cursor) {
          return NextResponse.json({ error: "缺少 cursor" }, { status: 400 });
        }

        const cqBody: NotionQueryBody = {
          sorts: data?.sorts ?? [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 100,
          start_cursor: cursor,
        };
        if (data?.filter) cqBody.filter = data.filter;
        // 支援 filter_properties（前端傳入已解析的 propIds）
        if (data?.filterProperties && data.filterProperties.length > 0) {
          cqBody.filter_properties = data.filterProperties;
        }

        const allPages: ParsedPage[] = [];
        let hasMore = true;
        let nextCursor: string | null = cursor;

        const MAX_PAGES = 20;
        let pageCount = 0;
        while (hasMore && nextCursor && pageCount < MAX_PAGES) {
          const body = pageCount === 0
            ? cqBody
            : { ...cqBody, start_cursor: nextCursor };

          const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: "POST",
            headers: commonHeaders,
            body: JSON.stringify(body),
          });
          const result: NotionQueryResponse = await res.json();
          if (!res.ok) {
            console.error("Notion continue_query error:", result);
            break;
          }
          allPages.push(...result.results.map(parsePage));
          pageCount++;
          hasMore = result.has_more;
          nextCursor = result.next_cursor;
        }

        return NextResponse.json({
          pages: allPages,
          total: allPages.length,
          hasMore,
          nextCursor,
        });
      }

      default:
        return NextResponse.json({ error: `未知的 action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("Notion API error:", err);
    const notionErr = err as NotionApiError;
    const code = notionErr.code ?? "";
    const msg = notionErr.message ?? "Notion API 錯誤";

    let friendlyMsg = msg;
    if (code === "unauthorized" || msg.includes("token is invalid")) {
      friendlyMsg = "Token 無效，請重新複製 Internal Integration Secret";
    } else if (code === "object_not_found") {
      friendlyMsg = "找不到資料庫，請確認 Database ID 正確，且已在 Notion 資料庫中加入 Integration 連線";
    } else if (code === "validation_error") {
      friendlyMsg = "格式錯誤：" + msg;
    }

    return NextResponse.json(
      { error: friendlyMsg, code },
      { status: notionErr.status ?? 500 }
    );
  }
}
