import { describe, it, expect } from "vitest";
import { generatePrompts } from "@/lib/intelligence/perplexity-prompts";
import type {
  AgencyHistoryData,
  CompetitorData,
} from "@/lib/intelligence/types";

// ──────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────

function makeHistory(overrides: Partial<AgencyHistoryData> = {}): AgencyHistoryData {
  return {
    unit_id: "U001",
    unit_name: "測試機關",
    total_cases: 10,
    cases: [
      {
        job_number: "JOB-001",
        title: "歷史案件一",
        award_date: "2024/01/15",
        award_amount: 850_000,
        winner_name: "甲公司",
        winner_id: "A001",
        bidder_count: 3,
      },
      {
        job_number: "JOB-002",
        title: "歷史案件二",
        award_date: "2023/06/20",
        award_amount: 920_000,
        winner_name: "乙公司",
        winner_id: "B001",
        bidder_count: 2,
      },
    ],
    top_winners: [
      { name: "甲公司", id: "A001", win_count: 5, total_amount: 4_500_000, consecutive_years: 3 },
    ],
    ...overrides,
  };
}

function makeCompetitors(overrides: Partial<CompetitorData> = {}): CompetitorData {
  return {
    competitors: [
      {
        name: "強勁競爭者",
        id: "C001",
        win_count: 8,
        total_amount: 7_200_000,
        consecutive_years: 2,
        other_agencies: ["機關A", "機關B"],
        specializations: ["教育訓練", "課程設計"],
      },
    ],
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────
// generatePrompts
// ──────────────────────────────────────────────────────────────

describe("generatePrompts", () => {
  it("produces exactly 4 rounds", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      1_000_000,
      makeHistory(),
      makeCompetitors(),
    );
    expect(prompts).toHaveLength(4);
  });

  it("rounds are numbered 1 through 4 in order", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      1_000_000,
      makeHistory(),
      makeCompetitors(),
    );
    expect(prompts.map((p) => p.round)).toEqual([1, 2, 3, 4]);
  });

  it("each prompt has non-empty title, prompt, and purpose", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      1_000_000,
      makeHistory(),
      makeCompetitors(),
    );
    for (const p of prompts) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.prompt.length).toBeGreaterThan(0);
      expect(p.purpose.length).toBeGreaterThan(0);
    }
  });

  it("works when budget is null", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      null,
      makeHistory(),
      makeCompetitors(),
    );
    expect(prompts).toHaveLength(4);
    for (const p of prompts) {
      expect(p.prompt).toBeTruthy();
    }
  });

  it("works with empty competitors list", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      1_000_000,
      makeHistory(),
      makeCompetitors({ competitors: [] }),
    );
    expect(prompts).toHaveLength(4);
  });

  it("works with empty cases list", () => {
    const prompts = generatePrompts(
      "測試標案",
      "測試機關",
      1_000_000,
      makeHistory({ cases: [], top_winners: [] }),
      makeCompetitors(),
    );
    expect(prompts).toHaveLength(4);
  });
});

// ──────────────────────────────────────────────────────────────
// Round 1
// ──────────────────────────────────────────────────────────────

describe("Round 1 — 競爭對手與機關關係", () => {
  function getR1(overrides?: { history?: Partial<AgencyHistoryData>; competitors?: Partial<CompetitorData> }) {
    return generatePrompts(
      "教育訓練標案",
      "文化部",
      1_000_000,
      makeHistory(overrides?.history),
      makeCompetitors(overrides?.competitors),
    )[0];
  }

  it("title contains round marker", () => {
    expect(getR1().title).toContain("第一輪");
  });

  it("prompt contains case title and agency", () => {
    const p = getR1();
    expect(p.prompt).toContain("教育訓練標案");
    expect(p.prompt).toContain("文化部");
  });

  it("prompt includes competitor names", () => {
    const p = getR1();
    expect(p.prompt).toContain("強勁競爭者");
  });

  it("prompt includes top winner info", () => {
    const p = getR1();
    expect(p.prompt).toContain("甲公司");
  });

  it("prompt includes hypothesis section", () => {
    expect(getR1().prompt).toContain("假設");
  });

  it("handles no competitors gracefully", () => {
    const p = getR1({ competitors: { competitors: [] } });
    expect(p.prompt).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────
// Round 2
// ──────────────────────────────────────────────────────────────

describe("Round 2 — 評委背景與市場脈絡", () => {
  function getR2() {
    return generatePrompts(
      "課程開發案",
      "教育部",
      2_000_000,
      makeHistory(),
      makeCompetitors(),
    )[1];
  }

  it("title contains round marker", () => {
    expect(getR2().title).toContain("第二輪");
  });

  it("prompt contains budget info", () => {
    // formatBudget renders as 萬元 format
    expect(getR2().prompt).toContain("萬元");
  });

  it("prompt contains agency name", () => {
    expect(getR2().prompt).toContain("教育部");
  });

  it("prompt lists recent cases", () => {
    expect(getR2().prompt).toContain("歷史案件一");
  });
});

// ──────────────────────────────────────────────────────────────
// Round 3
// ──────────────────────────────────────────────────────────────

describe("Round 3 — 策略意涵", () => {
  function getR3() {
    return generatePrompts(
      "展覽企劃案",
      "國立博物館",
      3_000_000,
      makeHistory(),
      makeCompetitors(),
    )[2];
  }

  it("title contains round marker", () => {
    expect(getR3().title).toContain("第三輪");
  });

  it("prompt contains case title", () => {
    expect(getR3().prompt).toContain("展覽企劃案");
  });

  it("prompt contains hypothesis section", () => {
    expect(getR3().prompt).toContain("假設");
  });
});

// ──────────────────────────────────────────────────────────────
// Round 4 — 底價推估與報價策略
// ──────────────────────────────────────────────────────────────

describe("Round 4 — 底價推估與報價策略", () => {
  function getR4(overrides?: {
    budget?: number | null;
    history?: Partial<AgencyHistoryData>;
    competitors?: Partial<CompetitorData>;
  }) {
    return generatePrompts(
      "系統建置案",
      "數位部",
      overrides?.budget ?? 1_000_000,
      makeHistory(overrides?.history),
      makeCompetitors(overrides?.competitors),
    )[3];
  }

  it("round number is 4", () => {
    expect(getR4().round).toBe(4);
  });

  it("title contains 底價 or 報價", () => {
    const title = getR4().title;
    expect(title.includes("底價") || title.includes("報價")).toBe(true);
  });

  it("prompt contains budget info", () => {
    // formatBudget renders as 萬元 format
    expect(getR4().prompt).toContain("萬元");
  });

  it("prompt contains agency and case title", () => {
    const p = getR4();
    expect(p.prompt).toContain("系統建置案");
    expect(p.prompt).toContain("數位部");
  });

  it("prompt includes discount rate hint when budget and awards are available", () => {
    // cases have award_amount=850k and 920k; budget=1M → avg ~88.5%
    const p = getR4({ budget: 1_000_000 });
    expect(p.prompt).toContain("%");
  });

  it("prompt includes competitor pricing info", () => {
    const p = getR4();
    expect(p.prompt).toContain("強勁競爭者");
  });

  it("prompt contains output format section", () => {
    expect(getR4().prompt).toContain("輸出格式");
  });

  it("prompt contains hypothesis section", () => {
    expect(getR4().prompt).toContain("假設");
  });

  it("handles null budget gracefully", () => {
    // bypass helper to pass null directly
    const p = generatePrompts("系統建置案", "數位部", null, makeHistory(), makeCompetitors())[3];
    expect(p.prompt).toContain("未公開");
  });

  it("handles no award_amount in cases", () => {
    const p = getR4({
      history: {
        cases: [
          { job_number: "J1", title: "無金額案", award_date: "2024/01/01", award_amount: null, winner_name: "甲", winner_id: "A", bidder_count: 2 },
        ],
      },
    });
    expect(p.prompt).toBeTruthy();
  });

  it("handles empty competitors gracefully", () => {
    const p = getR4({ competitors: { competitors: [] } });
    expect(p.prompt).toContain("尚無競爭對手報價資料");
  });

  it("purpose is non-empty and mentions pricing", () => {
    const p = getR4();
    expect(p.purpose.length).toBeGreaterThan(0);
    expect(p.purpose.includes("報價") || p.purpose.includes("底價")).toBe(true);
  });
});
