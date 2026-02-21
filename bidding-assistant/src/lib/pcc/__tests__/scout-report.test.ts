import { describe, it, expect } from "vitest";
import { generateScoutPrompt, buildScoutInput } from "../scout-report";
import type { TenderSummary, EvaluationCommitteeMember } from "../types";

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

  it("should cap competitors at 5 in known info", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "G-007",
      summary: null,
      agencyIntel: null,
      competitorNames: ["公司A", "公司B", "公司C", "公司D", "公司E", "公司F", "公司G"],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("公司A");
    expect(prompt).toContain("公司E");
    expect(prompt).not.toContain("公司F");
    expect(prompt).not.toContain("公司G");
  });

  it("should cap competitors at 3 in query section", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "H-008",
      summary: null,
      agencyIntel: null,
      competitorNames: ["公司A", "公司B", "公司C", "公司D", "公司E"],
    });
    const prompt = generateScoutPrompt(input);

    // Query section uses slice(0, 3)
    expect(prompt).toContain("公司A、公司B、公司C");
    // Should not include 4th/5th in the query text
    expect(prompt).not.toContain("公司D、公司E這幾家");
  });

  it("should cap incumbents at 3", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "I-009",
      summary: null,
      agencyIntel: {
        totalCases: 100,
        incumbents: [
          { name: "在位者A", wins: 10 },
          { name: "在位者B", wins: 8 },
          { name: "在位者C", wins: 5 },
          { name: "在位者D", wins: 3 },
        ],
        myHistory: [],
      },
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("在位者A");
    expect(prompt).toContain("在位者C");
    expect(prompt).not.toContain("在位者D");
  });

  it("should handle partial summary (some fields null)", () => {
    const partialSummary: TenderSummary = {
      title: "部分摘要案",
      agency: "某機關",
      budget: 5_000_000,
      floorPrice: null,
      awardAmount: null,
      bidderCount: null,
      awardDate: null,
      deadline: null,
      procurementType: "勞務類",
      awardMethod: null,
    };
    const input = buildScoutInput({
      title: "部分摘要案",
      agency: "某機關",
      jobNumber: "J-010",
      summary: partialSummary,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("500.0 萬");
    expect(prompt).toContain("勞務類");
    // Should not contain award or bidder info
    expect(prompt).not.toContain("決標金額");
    expect(prompt).not.toContain("投標家數");
    expect(prompt).not.toContain("底價/預算比");
  });

  it("should skip floor/budget ratio when floorPrice is null", () => {
    const summary: TenderSummary = {
      title: "測試",
      agency: "測試",
      budget: 1_000_000,
      floorPrice: null,
      awardAmount: null,
      bidderCount: null,
      awardDate: null,
      deadline: null,
      procurementType: null,
      awardMethod: null,
    };
    const input = buildScoutInput({
      title: "測試",
      agency: "測試",
      jobNumber: "K-011",
      summary,
      agencyIntel: null,
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);
    expect(prompt).not.toContain("底價/預算比");
  });

  it("should handle agencyIntel with empty incumbents and myHistory", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "教育部",
      jobNumber: "L-012",
      summary: null,
      agencyIntel: {
        totalCases: 10,
        incumbents: [],
        myHistory: [],
      },
      competitorNames: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("10 筆");
    expect(prompt).not.toContain("在位者");
    expect(prompt).not.toContain("我方在此機關紀錄");
  });

  it("should include committee info in known data", () => {
    const committee: EvaluationCommitteeMember[] = [
      { name: "王教授", status: "外聘委員", sequence: "1", attendance: "是", experience: "都市計畫學會理事" },
      { name: "陳博士", status: "外聘委員", sequence: "2", attendance: "是", experience: "景觀建築碩士" },
      { name: "李主任", status: "機關委員", sequence: "3", attendance: "是", experience: "" },
    ];
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "M-013",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
      committee,
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("外聘 2 / 機關 1");
    expect(prompt).toContain("王教授（都市計畫學會理事）");
    expect(prompt).toContain("陳博士（景觀建築碩士）");
    expect(prompt).not.toContain("李主任"); // 機關委員不列名
  });

  it("should add evaluator query when committee has external members", () => {
    const committee: EvaluationCommitteeMember[] = [
      { name: "張委員", status: "外聘委員", sequence: "1", attendance: "是", experience: "文化事業管理" },
    ];
    const input = buildScoutInput({
      title: "測試案",
      agency: "教育部",
      jobNumber: "N-014",
      summary: null,
      agencyIntel: null,
      competitorNames: ["公司A"],
      committee,
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("評委背景");
    expect(prompt).toContain("張委員");
    expect(prompt).toContain("學經歷、研究領域");
  });

  it("should skip evaluator query when no external committee members", () => {
    const committee: EvaluationCommitteeMember[] = [
      { name: "李主任", status: "機關委員", sequence: "1", attendance: "是", experience: "" },
    ];
    const input = buildScoutInput({
      title: "測試案",
      agency: "教育部",
      jobNumber: "O-015",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
      committee,
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).not.toContain("評委背景");
  });

  it("should handle empty committee array", () => {
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "P-016",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
      committee: [],
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).not.toContain("評選委員");
    expect(prompt).not.toContain("評委背景");
  });

  it("should cap external committee names at 5 in query", () => {
    const committee: EvaluationCommitteeMember[] = Array.from({ length: 7 }, (_, i) => ({
      name: `委員${i + 1}`,
      status: "外聘委員",
      sequence: String(i + 1),
      attendance: "是",
      experience: "",
    }));
    const input = buildScoutInput({
      title: "測試案",
      agency: "文化部",
      jobNumber: "Q-017",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
      committee,
    });
    const prompt = generateScoutPrompt(input);

    expect(prompt).toContain("委員5");
    expect(prompt).not.toContain("委員6");
  });
});

describe("buildScoutInput", () => {
  it("should map all params to ScoutReportInput correctly", () => {
    const summary: TenderSummary = {
      title: "案件名稱",
      agency: "招標機關",
      budget: 1_000_000,
      floorPrice: 900_000,
      awardAmount: null,
      bidderCount: null,
      awardDate: null,
      deadline: null,
      procurementType: null,
      awardMethod: null,
    };
    const input = buildScoutInput({
      title: "輸入標題",
      agency: "輸入機關",
      jobNumber: "Z-999",
      summary,
      agencyIntel: null,
      competitorNames: ["公司X"],
    });

    expect(input.title).toBe("輸入標題");
    expect(input.agency).toBe("輸入機關");
    expect(input.jobNumber).toBe("Z-999");
    expect(input.summary).toBe(summary);
    expect(input.agencyIntel).toBeNull();
    expect(input.competitors).toEqual(["公司X"]);
    expect(input.committee).toBeUndefined();
  });

  it("should pass committee when provided", () => {
    const committee: EvaluationCommitteeMember[] = [
      { name: "王教授", status: "外聘委員", sequence: "1", attendance: "是", experience: "教育學" },
    ];
    const input = buildScoutInput({
      title: "測試",
      agency: "測試",
      jobNumber: "Z-998",
      summary: null,
      agencyIntel: null,
      competitorNames: [],
      committee,
    });
    expect(input.committee).toHaveLength(1);
    expect(input.committee![0].name).toBe("王教授");
  });
});
