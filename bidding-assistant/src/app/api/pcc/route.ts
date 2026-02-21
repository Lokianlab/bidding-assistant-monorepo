import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://pcc-api.openfun.app/api";

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 300; // PCC API rate limit

async function pccFetch(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<unknown> {
  // Enforce rate limiting
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("PCC API 請求過於頻繁，請稍後再試");
    }
    throw new Error(`PCC API 錯誤: ${response.status}`);
  }

  // Check for HTML response (PCC API returns HTML instead of 404)
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("PCC API 端點回傳非預期格式");
  }

  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const { action, data } = await req.json();

    switch (action) {
      case "searchByTitle": {
        const { query, page = 1 } = data;
        if (!query) {
          return NextResponse.json({ error: "缺少搜尋關鍵字" }, { status: 400 });
        }
        const result = await pccFetch("/searchbytitle", {
          query,
          page: String(page),
        });
        return NextResponse.json(result);
      }

      case "searchByCompany": {
        const { query, page = 1 } = data;
        if (!query) {
          return NextResponse.json({ error: "缺少廠商名稱" }, { status: 400 });
        }
        const result = await pccFetch("/searchbycompanyname", {
          query,
          page: String(page),
        });
        return NextResponse.json(result);
      }

      case "getTenderDetail": {
        const { unitId, jobNumber } = data;
        if (!unitId || !jobNumber) {
          return NextResponse.json(
            { error: "缺少 unitId 或 jobNumber" },
            { status: 400 },
          );
        }
        const result = await pccFetch("/tender", {
          unit_id: unitId,
          job_number: jobNumber,
        });
        return NextResponse.json(result);
      }

      case "listByUnit": {
        const { unitId } = data;
        if (!unitId) {
          return NextResponse.json({ error: "缺少 unitId" }, { status: 400 });
        }
        const result = await pccFetch("/listbyunit", { unit_id: unitId });
        return NextResponse.json(result);
      }

      case "getInfo": {
        const result = await pccFetch("/getinfo");
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `未知的 action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PCC API 錯誤";
    console.error("PCC API proxy error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
