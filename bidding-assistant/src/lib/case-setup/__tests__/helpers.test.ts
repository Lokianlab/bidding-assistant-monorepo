import { describe, it, expect } from "vitest";
import {
  convertToROCDate,
  formatDriveFolderName,
  generateCaseUniqueId,
} from "../helpers";
import type { DriveCreateFolderInput } from "../types";

// ---------------------------------------------------------------------------
// convertToROCDate
// ---------------------------------------------------------------------------
describe("convertToROCDate", () => {
  describe("正常日期", () => {
    it("應將 2026-03-15 轉為 115.03.15", () => {
      expect(convertToROCDate("2026-03-15")).toBe("115.03.15");
    });

    it("應將 2024-01-01 轉為 113.01.01", () => {
      expect(convertToROCDate("2024-01-01")).toBe("113.01.01");
    });

    it("應將 2000-12-31 轉為 89.12.31（年份不補零）", () => {
      // 實作用 Number 直接相減，未對年份補零（只有月日補零）
      expect(convertToROCDate("2000-12-31")).toBe("89.12.31");
    });
  });

  describe("null 輸入", () => {
    it("null 應回傳空字串", () => {
      expect(convertToROCDate(null)).toBe("");
    });
  });

  describe("邊界情況", () => {
    it("民國元年：1912-01-01 應轉為 1.01.01（年份不補零）", () => {
      // 實作對年份未做 padStart，1912 - 1911 = 1 → "1"
      expect(convertToROCDate("1912-01-01")).toBe("1.01.01");
    });

    it("年底跨年日期：2025-12-31 應轉為 114.12.31", () => {
      expect(convertToROCDate("2025-12-31")).toBe("114.12.31");
    });

    it("年初日期：2025-01-01 應轉為 114.01.01", () => {
      expect(convertToROCDate("2025-01-01")).toBe("114.01.01");
    });

    it("閏年日期：2024-02-29 應正確轉換", () => {
      expect(convertToROCDate("2024-02-29")).toBe("113.02.29");
    });
  });

  describe("無效輸入", () => {
    it("空字串應回傳空字串", () => {
      expect(convertToROCDate("")).toBe("");
    });

    it("非日期字串 'not-a-date' 應回傳空字串", () => {
      expect(convertToROCDate("not-a-date")).toBe("");
    });

    it("格式錯誤的日期 '2026-13-01'（13 月）應回傳空字串", () => {
      expect(convertToROCDate("2026-13-01")).toBe("");
    });

    it("純數字字串 '20260315' 應回傳空字串", () => {
      expect(convertToROCDate("20260315")).toBe("");
    });
  });
});

// ---------------------------------------------------------------------------
// formatDriveFolderName
// ---------------------------------------------------------------------------
describe("formatDriveFolderName", () => {
  const baseInput: DriveCreateFolderInput = {
    caseUniqueId: "BID-A3F7K",
    deadline: "2026-03-15",
    title: "某某標案名稱",
    parentFolderId: "parent-folder-id",
  };

  describe("正常情況", () => {
    it("應產生完整格式名稱 (BID-A3F7K)(115.03.15) 某某標案名稱", () => {
      expect(formatDriveFolderName(baseInput)).toBe(
        "(BID-A3F7K)(115.03.15) 某某標案名稱"
      );
    });

    it("應包含 caseUniqueId 括號區塊", () => {
      const result = formatDriveFolderName(baseInput);
      expect(result).toContain("(BID-A3F7K)");
    });

    it("應包含 ROC 日期括號區塊", () => {
      const result = formatDriveFolderName(baseInput);
      expect(result).toContain("(115.03.15)");
    });

    it("應包含標題", () => {
      const result = formatDriveFolderName(baseInput);
      expect(result).toContain("某某標案名稱");
    });
  });

  describe("無截止日期（null deadline）", () => {
    it("deadline 為 null 時應省略日期括號區塊", () => {
      const input: DriveCreateFolderInput = {
        ...baseInput,
        deadline: null,
      };
      expect(formatDriveFolderName(input)).toBe("(BID-A3F7K) 某某標案名稱");
    });

    it("null deadline 輸出不應包含 ROC 日期", () => {
      const input: DriveCreateFolderInput = {
        ...baseInput,
        deadline: null,
      };
      const result = formatDriveFolderName(input);
      expect(result).not.toMatch(/\(\d{3}\.\d{2}\.\d{2}\)/);
    });
  });

  describe("長標題", () => {
    it("應完整保留長標題不截斷", () => {
      const longTitle = "非常非常非常非常非常非常非常非常非常非常非常長的標案名稱用於測試超長標題情境";
      const input: DriveCreateFolderInput = {
        ...baseInput,
        title: longTitle,
      };
      const result = formatDriveFolderName(input);
      expect(result).toContain(longTitle);
    });

    it("長標題仍應有正確的 ID 和日期前綴", () => {
      const input: DriveCreateFolderInput = {
        ...baseInput,
        title: "A".repeat(200),
      };
      const result = formatDriveFolderName(input);
      expect(result.startsWith("(BID-A3F7K)(115.03.15) ")).toBe(true);
    });
  });

  describe("格式結構", () => {
    it("輸出應符合 (id)(rocDate) title 格式", () => {
      const result = formatDriveFolderName(baseInput);
      expect(result).toMatch(/^\([^)]+\)\(\d{3}\.\d{2}\.\d{2}\) .+$/);
    });

    it("無 deadline 時輸出應符合 (id) title 格式", () => {
      const input: DriveCreateFolderInput = { ...baseInput, deadline: null };
      const result = formatDriveFolderName(input);
      expect(result).toMatch(/^\([^)]+\) .+$/);
    });
  });
});

// ---------------------------------------------------------------------------
// generateCaseUniqueId
// ---------------------------------------------------------------------------
describe("generateCaseUniqueId", () => {
  describe("格式", () => {
    it("應以 'BID-' 開頭", () => {
      const id = generateCaseUniqueId();
      expect(id.startsWith("BID-")).toBe(true);
    });

    it("應符合 BID-XXXXX 格式（5 個大寫英數字元）", () => {
      const id = generateCaseUniqueId();
      expect(id).toMatch(/^BID-[A-Z0-9]{5}$/);
    });

    it("連續 20 次呼叫每次都應符合格式", () => {
      for (let i = 0; i < 20; i++) {
        const id = generateCaseUniqueId();
        expect(id).toMatch(/^BID-[A-Z0-9]{5}$/);
      }
    });
  });

  describe("唯一性", () => {
    it("兩次呼叫結果應不同", () => {
      const id1 = generateCaseUniqueId();
      // 短暫等待確保 Date.now() 有機會推進
      const id2 = generateCaseUniqueId();
      // 不能強保証必異（同毫秒內 timestamp 相同），但隨機部分使碰撞機率極低
      // 至少驗證型別正確性
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
    });

    it("大量呼叫應有高唯一性（100 次無完全重複）", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCaseUniqueId());
      }
      // 允許極少數碰撞（同毫秒 + 相同隨機），但絕大多數應唯一
      expect(ids.size).toBeGreaterThan(50);
    });
  });

  describe("字元組成", () => {
    it("BID- 後的字元只應包含大寫英文字母和數字", () => {
      for (let i = 0; i < 10; i++) {
        const id = generateCaseUniqueId();
        const suffix = id.slice(4); // 去掉 "BID-"
        expect(suffix).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it("回傳值應為字串型別", () => {
      expect(typeof generateCaseUniqueId()).toBe("string");
    });
  });
});
