#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- Configuration ---

const API_BASE = "https://pcc-api.openfun.app/api";

// --- API Helper ---

interface PccTender {
  unit_id?: string;
  unit_name?: string;
  job_number?: string;
  name?: string;
  budget?: string;
  publish_date?: string;
  deadline?: string;
  award_date?: string;
  award_budget?: string;
  award_info?: string;
  url?: string;
  [key: string]: unknown;
}

interface PccSearchResponse {
  total?: number;
  total_pages?: number;
  page?: number;
  records?: PccTender[];
}

async function pccFetch(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`PCC API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// --- MCP Server ---

const server = new McpServer({
  name: "pcc-api",
  version: "1.0.0",
});

// Tool 1: 按標案名稱搜尋
server.tool(
  "search_by_title",
  "依標案名稱關鍵字搜尋政府標案（g0v pcc-api）",
  {
    query: z.string().describe("搜尋關鍵字（如：走讀、課程、導覽）"),
    page: z.number().optional().default(1).describe("頁碼（預設 1）"),
  },
  async ({ query, page }) => {
    const data = (await pccFetch("/searchbytitle", {
      query,
      page: String(page),
    })) as PccSearchResponse;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 2: 按機關名稱搜尋
server.tool(
  "search_by_unit",
  "依招標機關名稱搜尋政府標案",
  {
    query: z.string().describe("機關名稱關鍵字（如：台北市政府、文化局）"),
    page: z.number().optional().default(1).describe("頁碼（預設 1）"),
  },
  async ({ query, page }) => {
    const data = (await pccFetch("/searchbyunit", {
      query,
      page: String(page),
    })) as PccSearchResponse;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 3: 查詢特定標案詳細資料
server.tool(
  "get_tender",
  "查詢特定標案的完整詳細資料（需要單位 ID 和標案編號）",
  {
    unit_id: z.string().describe("招標單位 ID"),
    job_number: z.string().describe("標案編號"),
  },
  async ({ unit_id, job_number }) => {
    const data = await pccFetch(`/tender/${unit_id}/${job_number}`);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 4: 查詢決標資料
server.tool(
  "get_award",
  "查詢特定標案的決標結果（得標廠商、金額等）",
  {
    unit_id: z.string().describe("招標單位 ID"),
    job_number: z.string().describe("標案編號"),
  },
  async ({ unit_id, job_number }) => {
    const data = await pccFetch(`/award/${unit_id}/${job_number}`);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 5: 按廠商名稱搜尋（含得標與未得標）
server.tool(
  "search_by_company",
  "依廠商名稱搜尋所有投標記錄（含得標與未得標，查完整投標歷史）",
  {
    query: z.string().describe("廠商名稱關鍵字"),
    page: z.number().optional().default(1).describe("頁碼（預設 1）"),
  },
  async ({ query, page }) => {
    const data = (await pccFetch("/searchbycompanyname", {
      query,
      page: String(page),
    })) as PccSearchResponse;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 6: 按得標廠商搜尋
server.tool(
  "search_by_winner",
  "依得標廠商名稱搜尋標案（查競爭對手得標記錄）",
  {
    query: z.string().describe("廠商名稱關鍵字"),
    page: z.number().optional().default(1).describe("頁碼（預設 1）"),
  },
  async ({ query, page }) => {
    const data = (await pccFetch("/searchbyaward", {
      query,
      page: String(page),
    })) as PccSearchResponse;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// --- Start Server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("PCC API MCP Server error:", error);
  process.exit(1);
});
