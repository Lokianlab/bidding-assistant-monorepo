import { describe, it, expect } from "vitest";
import { analyzeCommittees } from "../committee-analysis";
import type { TenderWithCommittee } from "../committee-analysis";
import type { EvaluationCommitteeMember } from "../types";

function makeMember(overrides: Partial<EvaluationCommitteeMember> = {}): EvaluationCommitteeMember {
  return {
    name: "王大明",
    status: "外聘委員",
    sequence: "1",
    attendance: "是",
    experience: "都市計畫學會理事",
    ...overrides,
  };
}

function makeTender(overrides: Partial<TenderWithCommittee> = {}): TenderWithCommittee {
  return {
    title: "測試標案",
    agency: "測試機關",
    unitId: "1.1.1",
    date: 20260101,
    committee: [makeMember()],
    ...overrides,
  };
}

describe("analyzeCommittees", () => {
  it("空資料不崩潰", () => {
    const result = analyzeCommittees([]);
    expect(result.totalMembers).toBe(0);
    expect(result.totalTenders).toBe(0);
    expect(result.frequentMembers).toEqual([]);
  });

  it("只出現一次的評委不列入常見名單（預設門檻 2）", () => {
    const result = analyzeCommittees([makeTender()]);
    expect(result.totalMembers).toBe(1);
    expect(result.frequentMembers).toHaveLength(0);
  });

  it("出現 >= 2 次的評委列入常見名單", () => {
    const tenders = [
      makeTender({ date: 20260101 }),
      makeTender({ date: 20260201 }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.frequentMembers).toHaveLength(1);
    expect(result.frequentMembers[0].name).toBe("王大明");
    expect(result.frequentMembers[0].appearances).toBe(2);
  });

  it("可自訂最低出現次數門檻", () => {
    const tenders = [
      makeTender({ date: 20260101 }),
      makeTender({ date: 20260201 }),
    ];
    const result = analyzeCommittees(tenders, 3);
    expect(result.frequentMembers).toHaveLength(0);
  });

  it("正確追蹤不同機關", () => {
    const tenders = [
      makeTender({ agency: "機關A", unitId: "A", date: 20260101 }),
      makeTender({ agency: "機關B", unitId: "B", date: 20260201 }),
      makeTender({ agency: "機關A", unitId: "A", date: 20260301 }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.frequentMembers[0].agencies).toHaveLength(2);
    expect(result.frequentMembers[0].agencies).toContain("機關A");
    expect(result.frequentMembers[0].agencies).toContain("機關B");
  });

  it("計算出席率", () => {
    const tenders = [
      makeTender({
        date: 20260101,
        committee: [makeMember({ attendance: "是" })],
      }),
      makeTender({
        date: 20260201,
        committee: [makeMember({ attendance: "否" })],
      }),
      makeTender({
        date: 20260301,
        committee: [makeMember({ attendance: "是" })],
      }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.frequentMembers[0].attendanceRate).toBeCloseTo(2 / 3);
  });

  it("按出現次數排序（多的在前）", () => {
    const tenders = [
      makeTender({
        date: 20260101,
        committee: [
          makeMember({ name: "李四" }),
          makeMember({ name: "張三" }),
        ],
      }),
      makeTender({
        date: 20260201,
        committee: [
          makeMember({ name: "張三" }),
        ],
      }),
      makeTender({
        date: 20260301,
        committee: [
          makeMember({ name: "李四" }),
          makeMember({ name: "張三" }),
        ],
      }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.frequentMembers[0].name).toBe("張三");
    expect(result.frequentMembers[0].appearances).toBe(3);
    expect(result.frequentMembers[1].name).toBe("李四");
    expect(result.frequentMembers[1].appearances).toBe(2);
  });

  it("用最新一筆的 experience", () => {
    const tenders = [
      makeTender({
        date: 20260101,
        committee: [makeMember({ experience: "舊經歷" })],
      }),
      makeTender({
        date: 20260301,
        committee: [makeMember({ experience: "新經歷" })],
      }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.frequentMembers[0].experience).toBe("新經歷");
  });

  it("忽略空白名字的評委", () => {
    const tenders = [
      makeTender({
        committee: [
          makeMember({ name: "" }),
          makeMember({ name: "  " }),
          makeMember({ name: "王大明" }),
        ],
      }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.totalMembers).toBe(1);
  });

  it("案件按日期倒序排列", () => {
    const tenders = [
      makeTender({ date: 20260101, title: "早期案" }),
      makeTender({ date: 20260301, title: "最新案" }),
      makeTender({ date: 20260201, title: "中間案" }),
    ];
    const result = analyzeCommittees(tenders);
    const profile = result.frequentMembers[0];
    expect(profile.tenders[0].tenderTitle).toBe("最新案");
    expect(profile.tenders[1].tenderTitle).toBe("中間案");
    expect(profile.tenders[2].tenderTitle).toBe("早期案");
  });

  it("totalTenders 統計正確", () => {
    const tenders = [
      makeTender({ date: 20260101 }),
      makeTender({ date: 20260201 }),
      makeTender({ date: 20260301, committee: [] }),
    ];
    const result = analyzeCommittees(tenders);
    expect(result.totalTenders).toBe(3);
  });
});
