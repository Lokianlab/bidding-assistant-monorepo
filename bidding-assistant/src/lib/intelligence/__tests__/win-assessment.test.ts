import { describe, it, expect } from "vitest";
import {
  initWinAssessment,
  assessConsecutiveWinner,
  assessCommitteeKnown,
  assessCompetitorTrack,
  updateManualCheck,
} from "@/lib/intelligence/win-assessment";
import type {
  AgencyHistoryData,
  CompetitorData,
  WinCheck,
} from "@/lib/intelligence/types";

// ====== 測試資料工廠 ======

function makeAgencyCase(overrides: Partial<{
  job_number: string;
  title: string;
  award_date: string;
  award_amount: number | null;
  winner_name: string;
  winner_id: string;
  bidder_count: number;
}> = {}) {
  return {
    job_number: "JOB-001",
    title: "一般採購案",
    award_date: "2025/01/15",
    award_amount: 1_000_000,
    winner_name: "甲廠商",
    winner_id: "A001",
    bidder_count: 3,
    ...overrides,
  };
}

function makeTopWinner(overrides: Partial<{
  name: string;
  id: string;
  win_count: number;
  total_amount: number;
  consecutive_years: number;
}> = {}) {
  return {
    name: "甲廠商",
    id: "A001",
    win_count: 1,
    total_amount: 1_000_000,
    consecutive_years: 1,
    ...overrides,
  };
}

function makeAgencyHistory(overrides: Partial<AgencyHistoryData> = {}): AgencyHistoryData {
  return {
    unit_id: "UNIT-001",
    unit_name: "測試機關",
    total_cases: 0,
    cases: [],
    top_winners: [],
    ...overrides,
  };
}

function makeCompetitor(overrides: Partial<{
  name: string;
  id: string;
  win_count: number;
  total_amount: number;
  consecutive_years: number;
  other_agencies: string[];
  specializations: string[];
}> = {}) {
  return {
    name: "甲廠商",
    id: "A001",
    win_count: 1,
    total_amount: 1_000_000,
    consecutive_years: 1,
    other_agencies: [],
    specializations: [],
    ...overrides,
  };
}

function makeCompetitorData(overrides: Partial<CompetitorData> = {}): CompetitorData {
  return {
    competitors: [],
    ...overrides,
  };
}

// ====== initWinAssessment ======

describe("initWinAssessment", () => {
  it("回傳結果包含 5 個 checks", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    expect(result.checks).toHaveLength(5);
  });

  it("checks ID 順序正確", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    expect(result.checks[0].id).toBe("consecutive_winner");
    expect(result.checks[1].id).toBe("committee_known");
    expect(result.checks[2].id).toBe("committee_structure");
    expect(result.checks[3].id).toBe("competitor_track");
    expect(result.checks[4].id).toBe("strategic_value");
  });

  it("strategic_value 固定為 unknown 且 source=manual", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    const sv = result.checks[4];
    expect(sv.id).toBe("strategic_value");
    expect(sv.status).toBe("unknown");
    expect(sv.source).toBe("manual");
    expect(sv.auto_filled).toBe(false);
  });

  it("回傳 overall 欄位為有效 TrafficLight", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    expect(["red", "yellow", "green", "unknown"]).toContain(result.overall);
  });

  it("回傳 recommendation 為非空字串", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("有紅燈競爭對手時 overall 為 red", () => {
    const history = makeAgencyHistory({
      total_cases: 3,
      cases: [makeAgencyCase({ bidder_count: 2 })],
      top_winners: [makeTopWinner({ consecutive_years: 0 })],
    });
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        consecutive_years: 3,
        other_agencies: ["機關A", "機關B", "機關C"],
      })],
    });
    const result = initWinAssessment(history, competitors);
    expect(result.overall).toBe("red");
    expect(result.recommendation).toContain("警告");
  });

  it("無任何資料時 overall 為 unknown", () => {
    const history = makeAgencyHistory();
    const competitors = makeCompetitorData();
    const result = initWinAssessment(history, competitors);
    // 無資料：consecutive_winner=green, committee_known=unknown,
    // committee_structure=unknown, competitor_track=unknown, strategic_value=unknown
    // 有 unknown 且無 red → yellow（因有綠有未知）
    expect(["yellow", "unknown"]).toContain(result.overall);
  });

  it("原始輸入不被 mutate", () => {
    const history = makeAgencyHistory({
      total_cases: 2,
      cases: [makeAgencyCase()],
      top_winners: [makeTopWinner({ consecutive_years: 2 })],
    });
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({ win_count: 2 })],
    });
    const originalCasesLength = history.cases.length;
    const originalCompetitorsLength = competitors.competitors.length;
    initWinAssessment(history, competitors);
    expect(history.cases).toHaveLength(originalCasesLength);
    expect(competitors.competitors).toHaveLength(originalCompetitorsLength);
  });
});

// ====== assessConsecutiveWinner ======

describe("assessConsecutiveWinner", () => {
  it("無 top_winners → 綠燈（無資料）", () => {
    const history = makeAgencyHistory({ total_cases: 0, top_winners: [] });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("green");
    expect(result.id).toBe("consecutive_winner");
    expect(result.source).toBe("pcc");
    expect(result.auto_filled).toBe(true);
  });

  it("total_cases=0 但有 top_winners → 綠燈（無資料）", () => {
    const history = makeAgencyHistory({
      total_cases: 0,
      top_winners: [makeTopWinner({ consecutive_years: 5 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("green");
  });

  it("consecutive_years=1 → 綠燈（分散得標）", () => {
    const history = makeAgencyHistory({
      total_cases: 3,
      top_winners: [makeTopWinner({ name: "乙廠商", consecutive_years: 1, win_count: 2 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("green");
    expect(result.evidence).toContain("乙廠商");
    expect(result.evidence).toContain("2");
  });

  it("consecutive_years=2 → 黃燈", () => {
    const history = makeAgencyHistory({
      total_cases: 5,
      top_winners: [makeTopWinner({ name: "丙廠商", consecutive_years: 2, win_count: 3 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("丙廠商");
    expect(result.evidence).toContain("2 年");
  });

  it("consecutive_years=3 → 紅燈", () => {
    const history = makeAgencyHistory({
      total_cases: 6,
      top_winners: [makeTopWinner({ name: "丁廠商", consecutive_years: 3, win_count: 4 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("red");
    expect(result.evidence).toContain("丁廠商");
    expect(result.evidence).toContain("3 年");
  });

  it("consecutive_years=5 → 紅燈（>=3 均為紅）", () => {
    const history = makeAgencyHistory({
      total_cases: 10,
      top_winners: [makeTopWinner({ name: "戊廠商", consecutive_years: 5, win_count: 6 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.status).toBe("red");
    expect(result.evidence).toContain("5 年");
  });

  it("evidence 包含 win_count 資訊（紅燈情境）", () => {
    const history = makeAgencyHistory({
      total_cases: 8,
      top_winners: [makeTopWinner({ name: "己廠商", consecutive_years: 4, win_count: 7 })],
    });
    const result = assessConsecutiveWinner(history);
    expect(result.evidence).toContain("7");
  });

  it("只使用 top_winners[0]，忽略後續廠商", () => {
    const history = makeAgencyHistory({
      total_cases: 5,
      top_winners: [
        makeTopWinner({ name: "主廠商", consecutive_years: 1, win_count: 3 }),
        makeTopWinner({ name: "次廠商", consecutive_years: 4, win_count: 5 }),
      ],
    });
    const result = assessConsecutiveWinner(history);
    // 根據 top_winners[0] 的 consecutive_years=1 → 綠燈
    expect(result.status).toBe("green");
    expect(result.evidence).toContain("主廠商");
  });
});

// ====== assessCommitteeKnown ======

describe("assessCommitteeKnown", () => {
  it("total_cases=0 → unknown", () => {
    const history = makeAgencyHistory({ total_cases: 0 });
    const result = assessCommitteeKnown(history);
    expect(result.status).toBe("unknown");
    expect(result.id).toBe("committee_known");
    expect(result.source).toBe("pcc");
    expect(result.auto_filled).toBe(true);
  });

  it("total_cases=1 → yellow（案件偏少）", () => {
    const history = makeAgencyHistory({ total_cases: 1 });
    const result = assessCommitteeKnown(history);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("1");
  });

  it("total_cases=4 → yellow（案件偏少，<5）", () => {
    const history = makeAgencyHistory({ total_cases: 4 });
    const result = assessCommitteeKnown(history);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("4");
  });

  it("total_cases=5 → yellow（有足夠歷史但需進一步查詢）", () => {
    const history = makeAgencyHistory({ total_cases: 5 });
    const result = assessCommitteeKnown(history);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("5");
  });

  it("total_cases=10 → yellow（同樣需進一步確認）", () => {
    const history = makeAgencyHistory({ total_cases: 10 });
    const result = assessCommitteeKnown(history);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("10");
  });

  it("evidence 包含案件數量", () => {
    const history = makeAgencyHistory({ total_cases: 7 });
    const result = assessCommitteeKnown(history);
    expect(result.evidence).toContain("7");
  });

  it("label 設定正確", () => {
    const history = makeAgencyHistory({ total_cases: 3 });
    const result = assessCommitteeKnown(history);
    expect(result.label).toBe("評委名單已知");
  });
});

// ====== assessCompetitorTrack ======

describe("assessCompetitorTrack", () => {
  it("無競爭對手 → unknown", () => {
    const competitors = makeCompetitorData({ competitors: [] });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("unknown");
    expect(result.id).toBe("competitor_track");
    expect(result.source).toBe("pcc");
    expect(result.auto_filled).toBe(true);
  });

  it("強勢競爭對手：consecutive_years>=3 且 other_agencies>=3 → 紅燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "強勢公司",
        consecutive_years: 3,
        other_agencies: ["機關A", "機關B", "機關C"],
        specializations: ["資訊系統", "雲端服務"],
        win_count: 5,
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("red");
    expect(result.evidence).toContain("強勢公司");
    expect(result.evidence).toContain("3 年");
    expect(result.evidence).toContain("3 個");
  });

  it("強勢競爭對手：consecutive_years=5 且 other_agencies=4 → 紅燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "超強公司",
        consecutive_years: 5,
        other_agencies: ["A", "B", "C", "D"],
        specializations: [],
        win_count: 8,
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("red");
  });

  it("紅燈 evidence 包含專長領域", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "專長公司",
        consecutive_years: 3,
        other_agencies: ["X", "Y", "Z"],
        specializations: ["展覽設計", "策展"],
        win_count: 4,
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("red");
    expect(result.evidence).toContain("展覽設計");
    expect(result.evidence).toContain("策展");
  });

  it("紅燈且無專長資料 → evidence 顯示待分析", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        consecutive_years: 3,
        other_agencies: ["A", "B", "C"],
        specializations: [],
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("red");
    expect(result.evidence).toContain("待分析");
  });

  it("中等競爭對手：win_count>=3 且 other_agencies<3 → 黃燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "中等公司",
        win_count: 3,
        consecutive_years: 1,
        other_agencies: ["機關A", "機關B"],
        specializations: [],
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("中等公司");
    expect(result.evidence).toContain("3 次");
  });

  it("中等競爭對手：win_count<3 且 other_agencies>=3 → 黃燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "廣布公司",
        win_count: 2,
        consecutive_years: 1,
        other_agencies: ["A", "B", "C"],
        specializations: [],
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("yellow");
    expect(result.evidence).toContain("廣布公司");
  });

  it("弱勢競爭對手：win_count=1 且 other_agencies<3 → 綠燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        name: "小廠商",
        win_count: 1,
        consecutive_years: 1,
        other_agencies: [],
        specializations: [],
      })],
    });
    const result = assessCompetitorTrack(competitors);
    expect(result.status).toBe("green");
    expect(result.evidence).toContain("小廠商");
    expect(result.evidence).toContain("1 次");
  });

  it("弱勢競爭對手：win_count=2 且 other_agencies=2 → 綠燈", () => {
    const competitors = makeCompetitorData({
      competitors: [makeCompetitor({
        win_count: 2,
        consecutive_years: 2,
        other_agencies: ["機關A", "機關B"],
        specializations: [],
      })],
    });
    const result = assessCompetitorTrack(competitors);
    // consecutive_years=2 不符合 red 條件（需要 >=3 AND other_agencies>=3）
    // win_count=2 不符合 yellow 條件（需要 >=3 OR other_agencies>=3）
    // other_agencies=2 不符合 yellow 條件
    expect(result.status).toBe("green");
  });

  it("只使用 competitors[0]，第一名決定燈號", () => {
    const competitors = makeCompetitorData({
      competitors: [
        makeCompetitor({ name: "第一名", win_count: 1, consecutive_years: 1, other_agencies: [] }),
        makeCompetitor({ name: "第二名", win_count: 10, consecutive_years: 5, other_agencies: ["A", "B", "C"] }),
      ],
    });
    const result = assessCompetitorTrack(competitors);
    // 第一名 win_count=1, consecutive_years=1, other_agencies=0 → 綠燈
    expect(result.status).toBe("green");
    expect(result.evidence).toContain("第一名");
  });

  it("id 和 label 設定正確", () => {
    const competitors = makeCompetitorData({ competitors: [] });
    const result = assessCompetitorTrack(competitors);
    expect(result.id).toBe("competitor_track");
    expect(result.label).toBe("競爭對手追蹤");
  });
});

// ====== updateManualCheck ======

describe("updateManualCheck", () => {
  function makeChecks(): WinCheck[] {
    return [
      {
        id: "consecutive_winner",
        label: "連續得標廠商",
        status: "green",
        evidence: "原始證據 A",
        source: "pcc",
        auto_filled: true,
      },
      {
        id: "strategic_value",
        label: "策略價值評估",
        status: "unknown",
        evidence: "原始證據 B",
        source: "manual",
        auto_filled: false,
      },
    ];
  }

  it("更新指定 checkId 的狀態與證據", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "strategic_value", "green", "手動評估為綠燈");
    const sv = updated.find((c) => c.id === "strategic_value");
    expect(sv?.status).toBe("green");
    expect(sv?.evidence).toBe("手動評估為綠燈");
  });

  it("更新後 source 變為 manual", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "consecutive_winner", "red", "手動覆蓋");
    const cw = updated.find((c) => c.id === "consecutive_winner");
    expect(cw?.source).toBe("manual");
  });

  it("更新後 auto_filled 變為 false", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "consecutive_winner", "yellow", "手動覆蓋");
    const cw = updated.find((c) => c.id === "consecutive_winner");
    expect(cw?.auto_filled).toBe(false);
  });

  it("不 mutate 原陣列", () => {
    const checks = makeChecks();
    updateManualCheck(checks, "strategic_value", "red", "手動覆蓋");
    // 原陣列應保持不變
    expect(checks[1].status).toBe("unknown");
    expect(checks[1].evidence).toBe("原始證據 B");
    expect(checks[1].source).toBe("manual");
  });

  it("不 mutate 原陣列中的其他 check 物件", () => {
    const checks = makeChecks();
    const originalFirst = checks[0];
    const updated = updateManualCheck(checks, "strategic_value", "red", "手動覆蓋");
    // 第一個 check 物件參考應相同（未被 mutate）
    expect(updated[0]).toBe(originalFirst);
  });

  it("未匹配的 check 保持原值不變", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "strategic_value", "red", "手動覆蓋");
    const cw = updated.find((c) => c.id === "consecutive_winner");
    expect(cw?.status).toBe("green");
    expect(cw?.evidence).toBe("原始證據 A");
    expect(cw?.source).toBe("pcc");
    expect(cw?.auto_filled).toBe(true);
  });

  it("回傳陣列長度與原陣列相同", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "strategic_value", "green", "測試");
    expect(updated).toHaveLength(checks.length);
  });

  it("可連續更新同一 check（每次基於新陣列）", () => {
    const checks = makeChecks();
    const first = updateManualCheck(checks, "strategic_value", "yellow", "第一次更新");
    const second = updateManualCheck(first, "strategic_value", "red", "第二次更新");
    const sv = second.find((c) => c.id === "strategic_value");
    expect(sv?.status).toBe("red");
    expect(sv?.evidence).toBe("第二次更新");
  });

  it("更新 TrafficLight 所有可能值", () => {
    const checks = makeChecks();
    for (const status of ["red", "yellow", "green", "unknown"] as const) {
      const updated = updateManualCheck(checks, "strategic_value", status, `設為 ${status}`);
      expect(updated.find((c) => c.id === "strategic_value")?.status).toBe(status);
    }
  });

  it("不存在的 checkId → 所有 check 保持不變", () => {
    const checks = makeChecks();
    // TypeScript 防止傳入無效 id，但測試實際行為仍有意義
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = updateManualCheck(checks, "nonexistent_id" as any, "red", "測試");
    expect(updated[0].status).toBe("green");
    expect(updated[1].status).toBe("unknown");
  });

  it("保留 check 的 id 和 label 欄位", () => {
    const checks = makeChecks();
    const updated = updateManualCheck(checks, "strategic_value", "green", "測試");
    const sv = updated.find((c) => c.id === "strategic_value");
    expect(sv?.id).toBe("strategic_value");
    expect(sv?.label).toBe("策略價值評估");
  });
});
