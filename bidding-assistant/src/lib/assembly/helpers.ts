import {
  PROMPT_FILES,
  FILE_MAP,
  type StageKBRule,
} from "@/data/config/prompt-assembly";
import { STAGES } from "@/data/config/stages";
import type { FileListItem } from "./types";

/** 估算文字的 token 數（中文字 ×2，其他 ÷4） */
export function estimateTokens(text: string): number {
  const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - cn;
  return Math.round(cn * 2 + other / 4);
}

/** 格式化位元組為 KB */
export function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1) + " KB";
}

/**
 * 產生檔名
 * @param selectedStage 階段 ID（如 "L1"）
 * @param bidCode 案件唯一碼數字部分（可空）
 * @param now 時間（可傳入以利測試）
 */
export function buildFilename(
  selectedStage: string,
  bidCode: string,
  ext: "md" | "txt",
  now: Date = new Date()
): string {
  const stage = STAGES.find((s) => s.id === selectedStage);
  const yy = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ts = `${yy}${MM}${dd}${hh}${mm}`;
  const prefix = bidCode.trim()
    ? `[BID-${bidCode.trim().padStart(5, "0")}] `
    : "";
  return `${prefix}${selectedStage}_${stage?.name ?? "prompt"}_${ts}.${ext}`;
}

/**
 * 根據階段規則計算需要載入的檔案清單
 */
export function computeFileList(rule: StageKBRule | undefined): FileListItem[] {
  if (!rule) return [];
  const result: FileListItem[] = [];

  // Tier 1：永遠載入
  for (const id of rule.alwaysLoad) {
    const f = FILE_MAP[id];
    if (f) result.push({ file: f, reason: "永遠載入", auto: true });
  }

  // 階段提示詞
  const stageFile = FILE_MAP[rule.stageFile];
  if (stageFile) result.push({ file: stageFile, reason: "當前階段", auto: true });

  // 額外規範
  for (const id of rule.extraSpecs) {
    const f = FILE_MAP[id];
    if (f) result.push({ file: f, reason: "本階段需要", auto: true });
  }

  // 知識庫
  for (const [kbId, ref] of Object.entries(rule.kb)) {
    const f = FILE_MAP[kbId];
    if (f) {
      result.push({
        file: f,
        reason: ref === "required" ? "● 必要引用" : "○ 選擇性引用",
        ref,
        auto: ref === "required",
      });
    }
  }

  return result;
}

/**
 * 從 fileList 和使用者勾選狀態，計算最終啟用的檔案清單
 */
export function computeActiveFiles(
  fileList: FileListItem[],
  optionalToggles: Record<string, boolean>,
  selectedStage: string
): FileListItem[] {
  // 矩陣內的檔案
  const fromMatrix = fileList.filter((item) => {
    if (item.auto) return true;
    if (item.ref === "optional") {
      const key = `${selectedStage}-${item.file.id}`;
      return optionalToggles[key] ?? false;
    }
    return false;
  });

  // 手動加入的（不在矩陣中但使用者勾選了）
  const matrixIds = new Set(fileList.map((item) => item.file.id));
  const manual = PROMPT_FILES
    .filter((f) => !matrixIds.has(f.id))
    .filter((f) => {
      const key = `${selectedStage}-${f.id}`;
      return optionalToggles[key] ?? false;
    })
    .map((f) => ({ file: f, reason: "手動加入", auto: false }));

  return [...fromMatrix, ...manual];
}

/** 組裝文字（將多個檔案內容合併成一段文字） */
export function assembleContent(
  files: FileListItem[],
  fileContents: Record<string, string>
): string {
  const parts: string[] = [];
  for (const item of files) {
    const content = fileContents[item.file.id];
    if (content) {
      parts.push(
        `${"=".repeat(60)}\n📄 ${item.file.label}\n${"=".repeat(60)}\n\n${content}`
      );
    }
  }
  return parts.join("\n\n");
}
