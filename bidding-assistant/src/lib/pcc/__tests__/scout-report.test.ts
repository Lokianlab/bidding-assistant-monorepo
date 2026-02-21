import { describe, it, expect } from "vitest";
import { generateScoutPrompt, buildScoutInput } from "../scout-report";
import type { TenderSummary } from "../types";

describe("generateScoutPrompt", () => {
  const baseSummary: TenderSummary = {
    title: "112年文化走讀導覽規劃案",
    agency: "新竹縣政府文化局",
    budget: 3_000_000,
    floorPrice: 2_700_000,
    awardAmount: 2_500_000,
    bidderCount: 4,
    awardDate: "20231115",
    deadline: "20231001",
    procurementType: "勞務類",
    awardMethod: "最有利標",
  };

  it("should include all known data in the prompt", () => {
    const input = buildScoutInput({
      title: "走讀規劃案",
      agency: "新竹縣政府",
      jobNumber: "A-001",
      summary: baseSummary,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("走讀規劃案");
    expect(prompt).toContain("新竹縣政府");
    expect(prompt).toContain("A-001");
    expect(prompt).toContain("300.0 萬");
    expect(prompt).toContain("250.0 萬");
    expect(prompt).toContain("4 家");
    expect(prompt).toContain("最有利標");
    expect(prompt).toContain("90.0%"); // floor/budget ratio
  });

  it("should include agency intel when provided", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "B-002",
      summary: null,
      agencyIntel: {
        totalCases: 50,
        incumbents: [
          { name: "前鎮公司", wins: 5 },
          { name: "左營工程", wins: 3 },
        ],
        myHistory: [
          { title: "案件A", date: 20230101, won: true },
          { title: "案件B", date: 20230601, won: false },
        ],
      },
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("50 筆");
    expect(prompt).toContain("前鎮公司");
    expect(prompt).toContain("5 次得標");
    expect(prompt).toContain("1/2 得標");
  });

  it("should include competitor names and adjust queries", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "C-003",
      summary: null,
      agencyIntel: null,
      competitorNames: ["大山公司", "小河企業"],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("大山公司、小河企業");
    expect(prompt).toContain("競爭對手情報");
  });

  it("should show generic competitor query when no competitors known", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "D-004",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("潛在對手");
    expect(prompt).not.toContain("競爭對手情報");
  });

  it("should have proper structure with sections", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "E-005",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("## 已知資訊");
    expect(prompt).toContain("## 請幫我查以下項目");
    expect(prompt).toContain("## 輸出要求");
    expect(prompt).toContain("投標建議");
  });

  it("should handle null summary gracefully", () => {
    const input = buildScoutInput({
      title: "簡單案",
      agency: "教育部",
      jobNumber: "F-006",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("簡單案");
    expect(prompt).toContain("教育部");
    // Should not contain budget/amount related text
    expect(prompt).not.toContain("預算金額");
  });
});
