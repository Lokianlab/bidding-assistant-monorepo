import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  formatKB,
  buildFilename,
  computeFileList,
  computeActiveFiles,
  assembleContent,
} from "../helpers";
import type { FileListItem } from "../types";
import type { StageKBRule } from "@/data/config/prompt-assembly";

describe("assembly/helpers", () => {
  describe("estimateTokens", () => {
    it("應該正確計算純中文文字", () => {
      expect(estimateTokens("你好世界")).toBe(8);
    });

    it("應該正確計算純英文文字", () => {
      expect(estimateTokens("hello")).toBe(1); // 5/4 ≈ 1
      expect(estimateTokens("helloworld")).toBe(3); // 10/4 ≈ 2.5 → 3
    });

    it("應該處理空字串", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("應該處理混合文字", () => {
      const result = estimateTokens("你好abc");
      expect(result).toBeGreaterThanOrEqual(4);
    });
  });

  describe("formatKB", () => {
    it("應該將位元組轉換為 KB", () => {
      expect(formatKB(1024)).toBe("1.0 KB");
      expect(formatKB(2048)).toBe("2.0 KB");
    });

    it("應該正確處理小數", () => {
      expect(formatKB(1536)).toBe("1.5 KB");
      expect(formatKB(512)).toBe("0.5 KB");
    });

    it("應該處理零和大數值", () => {
      expect(formatKB(0)).toBe("0.0 KB");
      expect(formatKB(1024 * 1024)).toBe("1024.0 KB");
    });
  });

  describe("buildFilename", () => {
    const testDate = new Date("2026-02-26T14:30:45Z");

    it("應該產生正確格式的檔名（有 BID 碼）", () => {
      const filename = buildFilename("L1", "12345", "md", testDate);
      expect(filename).toMatch(/^\[BID-12345\] L1_.*_2602262230.md$/);
    });

    it("應該產生正確格式的檔名（無 BID 碼）", () => {
      const filename = buildFilename("L3", "", "txt", testDate);
      expect(filename).toMatch(/^L3_.*_2602262230.txt$/);
    });

    it("應該對短 BID 碼進行 zero-padding", () => {
      const filename = buildFilename("L1", "5", "md", testDate);
      expect(filename).toContain("[BID-00005]");
    });

    it("應該使用當前時間作為預設", () => {
      const filename = buildFilename("L1", "", "md");
      expect(filename).toMatch(/L1_.*_\d{10}\.(md|txt)$/);
    });
  });

  describe("computeFileList", () => {
    it("應該在規則未定義時回傳空陣列", () => {
      expect(computeFileList(undefined)).toEqual([]);
    });

    it("應該回傳 FileListItem 陣列", () => {
      const mockRule: StageKBRule = {
        stageId: "L1",
        alwaysLoad: [],
        stageFile: "stage-file",
        extraSpecs: [],
        kb: {},
      };

      const result = computeFileList(mockRule);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => {
        expect(item).toHaveProperty("file");
        expect(item).toHaveProperty("reason");
        expect(item).toHaveProperty("auto");
      });
    });
  });

  describe("computeActiveFiles", () => {
    const mockFileList: FileListItem[] = [
      {
        file: { id: "f1", label: "File 1", filename: "/f1", category: "system", categoryLabel: "系統" },
        reason: "自動",
        auto: true,
      },
      {
        file: { id: "f2", label: "File 2", filename: "/f2", category: "system", categoryLabel: "系統" },
        reason: "選擇性",
        ref: "optional",
        auto: false,
      },
    ];

    it("應該總是包含自動載入的檔案", () => {
      const result = computeActiveFiles(mockFileList, {}, "L1");
      const autoFile = result.find((item) => item.file.id === "f1");
      expect(autoFile).toBeDefined();
      expect(autoFile?.auto).toBe(true);
    });

    it("應該根據勾選包含選擇性檔案", () => {
      const toggles = { "L1-f2": true };
      const result = computeActiveFiles(mockFileList, toggles, "L1");
      const optionalFile = result.find((item) => item.file.id === "f2");
      expect(optionalFile).toBeDefined();
    });

    it("應該排除未勾選的選擇性檔案", () => {
      const toggles = { "L1-f2": false };
      const result = computeActiveFiles(mockFileList, toggles, "L1");
      const optionalFile = result.find((item) => item.file.id === "f2");
      expect(optionalFile).toBeUndefined();
    });
  });

  describe("assembleContent", () => {
    it("應該合併多個檔案的內容", () => {
      const files: FileListItem[] = [
        {
          file: { id: "f1", label: "File 1", filename: "/f1", category: "system", categoryLabel: "系統" },
          reason: "test",
          auto: true,
        },
      ];

      const contents = { f1: "Content 1" };
      const result = assembleContent(files, contents);

      expect(result).toContain("Content 1");
      expect(result).toContain("File 1");
      expect(result).toContain("=".repeat(60));
    });

    it("應該忽略缺少內容的檔案", () => {
      const files: FileListItem[] = [
        {
          file: { id: "f1", label: "File 1", filename: "/f1", category: "system", categoryLabel: "系統" },
          reason: "test",
          auto: true,
        },
        {
          file: { id: "f2", label: "File 2", filename: "/f2", category: "system", categoryLabel: "系統" },
          reason: "test",
          auto: true,
        },
      ];

      const contents = { f1: "Content 1" };
      const result = assembleContent(files, contents);
      
      expect(result).toContain("Content 1");
      expect(result).not.toContain("File 2");
    });

    it("應該在空檔案清單時回傳空字串", () => {
      expect(assembleContent([], { f1: "Content" })).toBe("");
    });
  });
});
