import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/docs         → 回傳文件樹（路徑 + 大小，不含內容）
 * GET /api/docs?file=xx → 回傳單一檔案的 markdown 內容
 *
 * 掃描範圍：monorepo 根目錄的 docs/ + bidding-assistant/docs/
 * 即時讀取檔案系統，新增檔案立刻反映。
 */

// monorepo root = bidding-assistant 的上一層
const MONOREPO_ROOT = path.resolve(process.cwd(), "..");

interface DocSource {
  label: string;
  basePath: string; // 絕對路徑
  prefix: string;   // 顯示用前綴
}

const DOC_SOURCES: DocSource[] = [
  { label: "專案文件", basePath: path.join(MONOREPO_ROOT, "docs"), prefix: "docs" },
  { label: "開發計畫", basePath: path.join(MONOREPO_ROOT, "bidding-assistant", "docs"), prefix: "app-docs" },
];

interface FileEntry {
  path: string;     // 相對路徑（含 prefix）
  name: string;     // 檔名（不含 .md）
  size: number;     // bytes
  mtime: string;    // ISO 日期
  category: string; // 來源分類
}

function walkDir(dir: string, base: string): FileEntry[] {
  const results: FileEntry[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // 跳過 node_modules 和隱藏目錄
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      results.push(...walkDir(fullPath, relPath));
    } else if (entry.name.endsWith(".md")) {
      const stat = fs.statSync(fullPath);
      results.push({
        path: relPath,
        name: entry.name.replace(/\.md$/, ""),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        category: "",  // 填入時再設
      });
    }
  }
  return results;
}

function categorize(filePath: string): string {
  // dev-plan 子分類
  if (filePath.includes("dev-plan/_staging")) return "暫存區";
  if (filePath.includes("dev-plan/")) {
    const name = path.basename(filePath);
    if (name.startsWith("M0") || name.startsWith("M1")) return "功能模組";
    if (name.startsWith("W0")) return "工作流程";
    if (name.startsWith("A0")) return "附錄";
    return "全域文件";
  }
  if (filePath.includes("records/analysis")) return "分析報告";
  if (filePath.includes("records/forum")) return "論壇紀錄";
  if (filePath.includes("records/reference")) return "參考資料";
  if (filePath.includes("records/")) return "操作記錄";
  if (filePath.includes("summaries/")) return "工作摘要";
  if (filePath.includes("methodology/")) return "方法論";
  if (filePath.includes("plans/")) return "執行計畫";
  if (filePath.includes("sop/")) return "SOP";
  if (filePath.includes("各種輸出文件")) return "輸出文件";
  return "專案文件";
}

export async function GET(req: NextRequest) {
  const fileParam = req.nextUrl.searchParams.get("file");

  // === 讀取單一檔案 ===
  if (fileParam) {
    // 安全檢查：不允許路徑穿越
    const normalized = path.normalize(fileParam).replace(/\\/g, "/");
    if (normalized.includes("..") || path.isAbsolute(normalized)) {
      return NextResponse.json({ error: "不允許的路徑" }, { status: 400 });
    }

    // 從 prefix 判斷來源
    for (const source of DOC_SOURCES) {
      if (normalized.startsWith(source.prefix + "/")) {
        const relativePath = normalized.slice(source.prefix.length + 1);
        const fullPath = path.join(source.basePath, relativePath);

        if (!fs.existsSync(fullPath)) {
          return NextResponse.json({ error: "檔案不存在" }, { status: 404 });
        }

        // 確保在 basePath 內（防止穿越）
        const resolved = path.resolve(fullPath);
        if (!resolved.startsWith(path.resolve(source.basePath))) {
          return NextResponse.json({ error: "不允許的路徑" }, { status: 403 });
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        const stat = fs.statSync(fullPath);
        return NextResponse.json({
          path: normalized,
          content,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        });
      }
    }
    return NextResponse.json({ error: "無效的檔案路徑" }, { status: 400 });
  }

  // === 列出所有檔案 ===
  const allFiles: FileEntry[] = [];
  for (const source of DOC_SOURCES) {
    const files = walkDir(source.basePath, source.prefix);
    files.forEach(f => {
      f.category = categorize(f.path);
    });
    allFiles.push(...files);
  }

  // 按分類分組
  const grouped: Record<string, FileEntry[]> = {};
  for (const file of allFiles) {
    if (!grouped[file.category]) grouped[file.category] = [];
    grouped[file.category].push(file);
  }

  // 每組內按路徑排序
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.path.localeCompare(b.path));
  }

  return NextResponse.json({
    total: allFiles.length,
    sources: DOC_SOURCES.map(s => s.label),
    categories: grouped,
  });
}
