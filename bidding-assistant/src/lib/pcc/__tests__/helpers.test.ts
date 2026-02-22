import { describe, it, expect } from "vitest";
import {
  parseCompanyRoles,
  isWinner,
  parseAmount,
  formatAmount,
  formatPCCDate,
  calcWinRate,
  parseTenderSummary,
} from "../helpers";
import type { PCCRecord, PCCTenderDetail } from "../types";

// ---- Test fixtures ----

function makeRecord(overrides: Partial<PCCRecord> = {}): PCCRecord {
  return {
    date: 20260211,
    filename: "test",
    brief: {
      type: "決標公告",
      title: "測試標案",
      companies: {
        ids: ["45135067", "89170941"],
        names: ["杳桓有限公司", "大員洛川股份有限公司"],
        id_key: {
          "45135067": ["投標廠商:投標廠商1:廠商代碼"],
          "89170941": ["投標廠商:投標廠商2:廠商代碼"],
        },
        name_key: {
          "杳桓有限公司": [
            "投標廠商:投標廠商1:廠商名稱",
            "決標品項:第1品項:得標廠商1:得標廠商",
          ],
          "大員洛川股份有限公司": [
            "投標廠商:投標廠商2:廠商名稱",
            "決標品項:第1品項:未得標廠商1:未得標廠商",
          ],
        },
      },
    },
    job_number: "11503",
    unit_id: "3.76.62",
    unit_name: "測試機關",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
    ...overrides,
  };
}

// ---- parseCompanyRoles ----

describe("parseCompanyRoles", () => {
  it("parses winner and loser roles", () => {
    const record = makeRecord();
    const roles = parseCompanyRoles(record);
    expect(roles).toHaveLength(2);

    const winner = roles.find((c) => c.name === "杳桓有限公司");
    expect(winner?.roles).toContain("得標");

    const loser = roles.find((c) => c.name === "大員洛川股份有限公司");
    expect(loser?.roles).toContain("未得標");
  });

  it("returns empty array when no companies", () => {
    const record = makeRecord({
      brief: { type: "招標公告", title: "測試" },
    });
    expect(parseCompanyRoles(record)).toHaveLength(0);
  });
});

// ---- isWinner ----

describe("isWinner", () => {
  it("returns true for the winning company", () => {
    expect(isWinner(makeRecord(), "杳桓有限公司")).toBe(true);
  });

  it("returns false for the losing company", () => {
    expect(isWinner(makeRecord(), "大員洛川股份有限公司")).toBe(false);
  });

  it("returns false for unknown company", () => {
    expect(isWinner(makeRecord(), "不存在公司")).toBe(false);
  });
});

// ---- parseAmount ----

describe("parseAmount", () => {
  it("parses standard amount string", () => {
    expect(parseAmount("318,600元")).toBe(318600);
  });

  it("parses amount without unit", () => {
    expect(parseAmount("1,000,000")).toBe(1000000);
  });

  it("returns null for empty input", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseAmount("不適用")).toBeNull();
  });

  it("parses negative number string", () => {
    expect(parseAmount("-100元")).toBe(-100);
  });

  it("parses full-width comma separated amount", () => {
    expect(parseAmount("100，000元")).toBe(100000);
  });

  it("parses zero", () => {
    expect(parseAmount("0元")).toBe(0);
  });

  it("只有單位符號時回傳 null（不是 0）", () => {
    expect(parseAmount("元")).toBeNull();
  });

  it("只有空白和單位時回傳 null", () => {
    expect(parseAmount("   元")).toBeNull();
  });

  it("全形逗號加空白時正確解析", () => {
    expect(parseAmount(" 1，500，000 元 ")).toBe(1500000);
  });
});

// ---- formatAmount ----

describe("formatAmount", () => {
  it("formats large amounts in 億", () => {
    expect(formatAmount(150_000_000)).toBe("1.50 億");
  });

  it("formats medium amounts in 萬", () => {
    expect(formatAmount(318_600)).toBe("31.9 萬");
  });

  it("formats small amounts in 元", () => {
    expect(formatAmount(5000)).toContain("5,000");
  });

  it("returns dash for null", () => {
    expect(formatAmount(null)).toBe("—");
  });

  it("formats exactly 100,000,000 in 億", () => {
    expect(formatAmount(100_000_000)).toBe("1.00 億");
  });

  it("formats exactly 10,000 in 萬", () => {
    expect(formatAmount(10_000)).toBe("1.0 萬");
  });

  it("formats zero", () => {
    expect(formatAmount(0)).toBe("0 元");
  });

  it("formats 9,999 in 元 (just below 萬 threshold)", () => {
    expect(formatAmount(9_999)).toContain("9,999");
    expect(formatAmount(9_999)).toContain("元");
  });
});

// ---- formatPCCDate ----

describe("formatPCCDate", () => {
  it("formats YYYYMMDD to YYYY/MM/DD", () => {
    expect(formatPCCDate(20260211)).toBe("2026/02/11");
  });

  it("handles short numbers gracefully", () => {
    expect(formatPCCDate(123)).toBe("123");
  });
});

// ---- calcWinRate ----

describe("calcWinRate", () => {
  it("calculates win rate across multiple records", () => {
    const records: PCCRecord[] = [
      makeRecord(), // 杳桓 得標, 大員洛川 未得標
      makeRecord({
        brief: {
          type: "決標公告",
          title: "另一案",
          companies: {
            ids: ["89170941"],
            names: ["大員洛川股份有限公司"],
            id_key: { "89170941": ["投標廠商:投標廠商1:廠商代碼"] },
            name_key: {
              "大員洛川股份有限公司": [
                "投標廠商:投標廠商1:廠商名稱",
                "決標品項:第1品項:得標廠商1:得標廠商",
              ],
            },
          },
        },
      }),
    ];

    const result = calcWinRate(records, "大員洛川");
    expect(result.total).toBe(2);
    expect(result.wins).toBe(1);
    expect(result.rate).toBeCloseTo(0.5);
  });

  it("ignores non-award records", () => {
    const records: PCCRecord[] = [
      makeRecord({ brief: { type: "招標公告", title: "招標中" } }),
    ];
    const result = calcWinRate(records, "大員洛川");
    expect(result.total).toBe(0);
  });
});

// ---- parseTenderSummary ----

describe("parseTenderSummary", () => {
  it("extracts key fields from tender detail", () => {
    const tender: PCCTenderDetail = {
      detail: {
        "採購資料:標案名稱": "測試標案",
        "機關資料:機關名稱": "測試機關",
        "採購資料:預算金額": "318,600元",
        "決標資料:底價金額": "308,100元",
        "決標資料:總決標金額": "308,100元",
        "投標廠商:投標廠商家數": "4",
        "決標資料:決標方式": "最有利標",
      },
    };
    const summary = parseTenderSummary(tender);

    expect(summary.title).toBe("測試標案");
    expect(summary.agency).toBe("測試機關");
    expect(summary.budget).toBe(318600);
    expect(summary.floorPrice).toBe(308100);
    expect(summary.awardAmount).toBe(308100);
    expect(summary.bidderCount).toBe(4);
    expect(summary.awardMethod).toBe("最有利標");
  });

  it("handles missing fields gracefully", () => {
    const tender: PCCTenderDetail = { detail: {} };
    const summary = parseTenderSummary(tender);
    expect(summary.title).toBe("");
    expect(summary.budget).toBeNull();
    expect(summary.bidderCount).toBeNull();
  });
});
