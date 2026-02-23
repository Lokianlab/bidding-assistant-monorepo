import { NextRequest, NextResponse } from "next/server";

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
  status?: NotionSelectOption | null;
  checkbox?: boolean;
  people?: NotionPerson[];
}

/** Shape of a Notion page returned by the query endpoint */
interface NotionQueryPage {
  properties?: Record<string, NotionPropertyValue>;
}

/** Shape of the Notion query response */
interface NotionQueryResponse {
  results?: NotionQueryPage[];
}

/** Shape of the Notion database response (title only) */
interface NotionDatabaseResponse {
  title?: NotionRichTextItem[];
  properties?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || process.env.NOTION_TOKEN;
    const databaseId = body.databaseId || process.env.NOTION_DATABASE_ID;

    // 用 REST API 查 schema
    const schemaRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (!schemaRes.ok) {
      return NextResponse.json(
        { error: `Notion API 回應 ${schemaRes.status}：無法讀取資料庫 schema` },
        { status: schemaRes.status }
      );
    }
    const db: NotionDatabaseResponse = await schemaRes.json();

    // 用 REST API query 第一筆
    const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 1 }),
    });
    if (!queryRes.ok) {
      return NextResponse.json(
        { error: `Notion API 回應 ${queryRes.status}：無法查詢資料` },
        { status: queryRes.status }
      );
    }
    const queryData: NotionQueryResponse = await queryRes.json();

    const firstPage = queryData.results?.[0];
    const fieldInfo: Record<string, { type: string; sampleValue: string | number | boolean | string[] | null }> = {};

    if (firstPage?.properties) {
      for (const [key, val] of Object.entries(firstPage.properties)) {
        let sample: string | number | boolean | string[] | null = null;
        switch (val.type) {
          case "title":
            sample = val.title?.map((t) => t.plain_text).join("") ?? null;
            break;
          case "rich_text":
            sample = val.rich_text?.map((t) => t.plain_text).join("") ?? null;
            break;
          case "number":
            sample = val.number ?? null;
            break;
          case "select":
            sample = val.select?.name ?? null;
            break;
          case "multi_select":
            sample = val.multi_select?.map((s) => s.name) ?? null;
            break;
          case "date":
            sample = val.date?.start ?? null;
            break;
          case "status":
            sample = val.status?.name ?? null;
            break;
          case "checkbox":
            sample = val.checkbox ?? null;
            break;
          case "people":
            sample = val.people?.map((p) => p.name ?? p.id) ?? null;
            break;
          default:
            sample = `(${val.type})`;
        }
        fieldInfo[key] = { type: val.type, sampleValue: sample };
      }
    }

    return NextResponse.json({
      dbTitle: db.title?.[0]?.plain_text ?? "(no title)",
      totalResults: queryData.results?.length ?? 0,
      schemaFields: db.properties ? Object.keys(db.properties) : [],
      firstPageFields: fieldInfo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // 避免在錯誤訊息中洩漏 token 或敏感資訊
    const safeMessage = message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
