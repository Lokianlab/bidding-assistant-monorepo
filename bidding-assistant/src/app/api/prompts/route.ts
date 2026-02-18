import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/prompts?file=00-1_系統核心_v2.0.md
 * 讀取 public/prompts/ 目錄下的指定 .md 檔案
 */
export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("file");
  if (!filename) {
    return NextResponse.json({ error: "缺少 file 參數" }, { status: 400 });
  }

  // 安全檢查：只允許讀取 .md 檔，且不允許路徑穿越
  if (!filename.endsWith(".md") || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "無效的檔案名稱" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "prompts", filename);

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: `找不到檔案：${filename}` }, { status: 404 });
  }
}
