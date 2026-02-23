/**
 * 知識庫導入：檔案去重模組
 *
 * 職責：檢測並移除 Word/Excel 檔案的版本複製
 * 用途：Phase 2 + Phase 4 的批次預處理
 *
 * 背景：H: 資料夾中 Word 檔案 18,710 個，估計 30-50% 是 "- 複製" 版本
 * 目標：保留唯一檔案，根據修改時間選擇最新版本
 *
 * @example
 * const dedup = new FileDeduplicator();
 * const result = await dedup.analyzeFolder("./phase4/B");
 * console.log(`削減率: ${result.reductionRate}%`);
 * await dedup.createSymlinks(result.unique, "./deduplicated");
 */

import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { logger } from "@/lib/logger";

interface FileInfo {
  name: string;
  fullPath: string;
  mtime: number; // 修改時間戳
  size: number; // 檔案大小
  isVersion: boolean; // 是否為版本複製（含 "-複製"）
}

interface DeduplicationResult {
  total: number;
  unique: Map<string, FileInfo>; // hash -> 選定的版本
  removed: FileInfo[]; // 被移除的重複版本
  reductionRate: number; // 削減百分比
  details: {
    exactDuplicates: number; // 完全相同（hash 相同）
    nameVariants: number; // 名稱變體（如 "file - 複製.docx"）
  };
}

export class FileDeduplicator {
  private hashMap: Map<string, FileInfo[]> = new Map();

  /**
   * 計算檔案 MD5 hash
   * 用於檢測完全相同的內容
   */
  private async getFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("md5");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  /**
   * 偵測檔案是否為版本複製
   * Pattern: "filename - 複製.ext" 或 "filename-複製.ext"
   */
  private isVersionCopy(filename: string): boolean {
    return /[\s-]複製/.test(filename) || /[\s-]copy$/i.test(filename);
  }

  /**
   * 提取檔案的「規範名稱」（去除版本尾碼）
   * 用於識別同一檔案的不同版本
   */
  private getNormalizedName(filename: string): string {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);

    // 移除 " - 複製", "-複製", " (1)", " copy" 等尾碼
    const normalized = baseName
      .replace(/[\s-]?複製[\d]*\s*$/i, "")
      .replace(/[\s-]?copy[\d]*\s*$/i, "")
      .replace(/\s*\(\d+\)\s*$/i, "")
      .trim();

    return normalized + ext;
  }

  /**
   * 分析資料夾中的所有檔案，識別重複版本
   */
  async analyzeFolder(folderPath: string): Promise<DeduplicationResult> {
    logger.debug("system", `開始掃描資料夾: ${folderPath}`);

    const files = (await fs.readdir(folderPath, { recursive: true })) as string[];
    const allFiles: FileInfo[] = [];

    // 1. 蒐集檔案資訊
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const stats = await fs.stat(fullPath);

      // 只處理 Word、Excel、PDF
      if (!/\.(docx?|xlsx?|pdf)$/.test(file)) continue;

      if (stats.isFile()) {
        allFiles.push({
          name: file,
          fullPath,
          mtime: stats.mtime.getTime(),
          size: stats.size,
          isVersion: this.isVersionCopy(file),
        });
      }
    }

    logger.debug("system", `掃描完成，共 ${allFiles.length} 個檔案`);

    // 2. 計算 hash，建立映射
    const hashMap = new Map<string, FileInfo[]>();
    for (const file of allFiles) {
      try {
        const hash = await this.getFileHash(file.fullPath);
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(file);
      } catch (err) {
        logger.error("system", `無法讀取 ${file.name}: ${err}`);
      }
    }

    // 3. 去重決策：每個 hash 保留最新版本
    const unique = new Map<string, FileInfo>();
    const removed: FileInfo[] = [];
    let exactDuplicates = 0;

    for (const [hash, versions] of hashMap.entries()) {
      if (versions.length > 1) {
        // 有重複：按修改時間排序，保留最新
        versions.sort((a, b) => b.mtime - a.mtime);
        unique.set(hash, versions[0]);

        removed.push(...versions.slice(1));
        exactDuplicates += versions.length - 1;

        logger.debug(
          "system",
          `重複檔案 (${versions.length} 個同內容): 保留 ${versions[0].name}, 移除 ${versions.slice(1).map((v) => v.name).join(", ")}`
        );
      } else {
        // 無重複：直接加入
        unique.set(hash, versions[0]);
      }
    }

    // 4. 識別名稱變體（不同 hash 但名稱相似的版本複製）
    const nameVariants = this.detectNameVariants(
      Array.from(unique.values()),
      allFiles
    );
    const variantRemoved = nameVariants.removed;
    let nameVariantCount = nameVariants.count;

    // 合併結果
    const totalRemoved = removed.length + variantRemoved.length;
    const reductionRate = ((totalRemoved / allFiles.length) * 100).toFixed(1);

    const result: DeduplicationResult = {
      total: allFiles.length,
      unique,
      removed: [...removed, ...variantRemoved],
      reductionRate: parseFloat(reductionRate),
      details: {
        exactDuplicates,
        nameVariants: nameVariantCount,
      },
    };

    logger.info(
      "system",
      `分析完成: ${allFiles.length} 檔 → ${unique.size} 個唯一檔 (削減 ${reductionRate}%)`
    );
    logger.debug(
      "system",
      `詳情: 完全相同 ${exactDuplicates}，名稱變體 ${nameVariantCount}`
    );

    return result;
  }

  /**
   * 偵測名稱變體（不同 hash 但名稱相似）
   * 用於移除明確標記為 "- 複製" 的檔案
   */
  private detectNameVariants(
    keepFiles: FileInfo[],
    allFiles: FileInfo[]
  ): { removed: FileInfo[]; count: number } {
    const kept = new Set(keepFiles.map((f) => f.fullPath));
    const variants: FileInfo[] = [];
    const normMap = new Map<string, FileInfo>();

    // 建立規範名稱映射（保留的檔案）
    for (const file of keepFiles) {
      const normalized = this.getNormalizedName(file.name);
      normMap.set(normalized, file);
    }

    // 掃描所有檔案，移除標記為 "- 複製" 的版本
    for (const file of allFiles) {
      if (kept.has(file.fullPath)) continue; // 已保留，跳過

      const normalized = this.getNormalizedName(file.name);
      if (
        normMap.has(normalized) &&
        file.isVersion &&
        file !== normMap.get(normalized)
      ) {
        variants.push(file);
      }
    }

    return { removed: variants, count: variants.length };
  }

  /**
   * 建立去重結果的符號連結或複製
   * 用於準備導入的檔案集合
   */
  async createSymlinks(
    unique: Map<string, FileInfo>,
    outputFolder: string,
    method: "symlink" | "copy" = "symlink"
  ): Promise<void> {
    await fs.ensureDir(outputFolder);

    for (const file of unique.values()) {
      const outputPath = path.join(outputFolder, file.name);

      if (method === "symlink") {
        await fs.ensureSymlink(file.fullPath, outputPath);
      } else {
        await fs.copy(file.fullPath, outputPath);
      }
    }

    logger.info(
      "system",
      `已建立 ${method === "symlink" ? "符號連結" : "複製"}: ${outputFolder}`
    );
  }

  /**
   * 產生去重報告
   */
  generateReport(result: DeduplicationResult): string {
    const report = `
=== 檔案去重報告 ===

總檔案數：${result.total}
唯一檔案：${result.unique.size}
移除檔案：${result.removed.length}
削減率：${result.reductionRate}%

詳細分析
--------
- 完全相同內容：${result.details.exactDuplicates} 個
- 名稱變體 ("- 複製")：${result.details.nameVariants} 個

被移除的檔案清單
--------------
${result.removed
  .slice(0, 10)
  .map((f) => `  - ${f.name}`)
  .join("\n")}
${result.removed.length > 10 ? `  ... 及其他 ${result.removed.length - 10} 個\n` : ""}
    `.trim();

    return report;
  }
}

// 使用範例
export async function runDeduplicationPhase4() {
  const dedup = new FileDeduplicator();

  // 掃描 Phase 4 資料夾
  const result = await dedup.analyzeFolder(
    "H:/共用雲端硬碟/專案執行中心/B. 備標集中區"
  );

  // 產生報告
  const report = dedup.generateReport(result);
  console.log(report);

  // 建立去重資料集（供後續導入用）
  await dedup.createSymlinks(
    result.unique,
    "./data/phase4-deduplicated",
    "symlink"
  );

  logger.info(
    "system",
    `Phase 4 去重完成: 可用 ${result.unique.size} 個檔案進行批次導入`
  );

  return result;
}
