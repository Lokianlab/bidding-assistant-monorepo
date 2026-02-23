import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCaseClosing } from "../useCaseClosing";
import type { CaseSummary, CaseAssessment, CaseLearning } from "../types";

// ── Mock Helpers ────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ── Initial State ───────────────────────────────────────────

describe("useCaseClosing — initial state", () => {
  it("初始狀態為空，無載入", () => {
    const { result } = renderHook(() => useCaseClosing());

    expect(result.current.summary).toBeNull();
    expect(result.current.assessment).toBeNull();
    expect(result.current.aggregateScore).toBeNull();
    expect(result.current.savedKBItemId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("提供所有操作函式", () => {
    const { result } = renderHook(() => useCaseClosing());

    expect(typeof result.current.generateSummary).toBe("function");
    expect(typeof result.current.updateAssessment).toBe("function");
    expect(typeof result.current.saveToKB).toBe("function");
    expect(typeof result.current.complete).toBe("function");
    expect(typeof result.current.calculateTotal).toBe("function");
  });
});

// ── generateSummary ────────────────────────────────────────

describe("useCaseClosing — generateSummary", () => {
  it("成功生成摘要", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        what_we_did: "完成前端開發",
        what_we_learned: "需要更好的需求規劃",
        next_time_notes: "提前定義架構",
        suggested_tags: ["技術風險"],
      }),
    });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    expect(result.current.summary).not.toBeNull();
    expect(result.current.summary?.caseId).toBe("case-001");
    expect(result.current.summary?.caseName).toBe("標案 #2601");
    expect(result.current.summary?.sections.whatWeDid).toBe("完成前端開發");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("生成失敗時設定錯誤", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "API 錯誤" }),
    });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe("API 錯誤");
    expect(result.current.isGenerating).toBe(false);
  });

  it("未完成摘要無法儲存", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        what_we_did: "",  // 空白，無效
        what_we_learned: "內容",
        next_time_notes: "內容",
        suggested_tags: [],
      }),
    });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    expect(result.current.summary).toBeNull();
    expect(result.current.error).toContain("摘要內容不完整");
  });
});

// ── updateAssessment ───────────────────────────────────────

describe("useCaseClosing — updateAssessment", () => {
  it("更新評分和標籤", () => {
    const { result } = renderHook(() => useCaseClosing());

    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: ["技術風險"],
      });
    });

    expect(result.current.assessment?.strategyScore).toBe(8);
    expect(result.current.assessment?.executionScore).toBe(7);
    expect(result.current.assessment?.satisfactionScore).toBe(9);
    expect(result.current.assessment?.tags).toEqual(["技術風險"]);
  });

  it("更新後自動計算聚合評分", () => {
    const { result } = renderHook(() => useCaseClosing());

    act(() => {
      result.current.updateAssessment({
        strategyScore: 9,
        executionScore: 9,
        satisfactionScore: 9,
        tags: [],
      });
    });

    expect(result.current.aggregateScore?.total).toBe(9);
  });

  it("評分超出範圍時不更新", () => {
    const { result } = renderHook(() => useCaseClosing());

    // 先設定有效的評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: [],
      });
    });

    const prevScore = result.current.assessment?.strategyScore;

    // 嘗試設定無效的評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 11,  // 超出範圍
        tags: [],
      });
    });

    // 不應該更新
    expect(result.current.assessment?.strategyScore).toBe(prevScore);
  });

  it("部分更新保留既有評分", () => {
    const { result } = renderHook(() => useCaseClosing());

    // 先設定所有評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: ["技術風險"],
      });
    });

    // 只更新一個評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 9,
      });
    });

    expect(result.current.assessment?.strategyScore).toBe(9);
    expect(result.current.assessment?.executionScore).toBe(7); // 保留
    expect(result.current.assessment?.satisfactionScore).toBe(9); // 保留
    expect(result.current.assessment?.tags).toEqual(["技術風險"]); // 保留
  });
});

// ── calculateTotal ────────────────────────────────────────

describe("useCaseClosing — calculateTotal", () => {
  it("無評分時返回 0", () => {
    const { result } = renderHook(() => useCaseClosing());

    expect(result.current.calculateTotal()).toBe(0);
  });

  it("返回聚合分數", () => {
    const { result } = renderHook(() => useCaseClosing());

    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 8,
        satisfactionScore: 9,
        tags: [],
      });
    });

    expect(result.current.calculateTotal()).toBe(8.3); // (8 + 8 + 9) / 3 = 8.333... ≈ 8.3
  });
});

// ── localStorage Persistence ───────────────────────────────

describe("useCaseClosing — localStorage persistence", () => {
  it("儲存狀態到 localStorage", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        what_we_did: "完成開發",
        what_we_learned: "學到很多",
        next_time_notes: "下次注意",
        suggested_tags: [],
      }),
    });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    await waitFor(() => {
      const saved = localStorage.getItem("case-closing-data");
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.summary).not.toBeNull();
      expect(parsed.summary.caseId).toBe("case-001");
    });
  });

  it("從 localStorage 復原狀態", async () => {
    // 先儲存一個狀態
    const stored = {
      summary: {
        caseId: "case-001",
        caseName: "標案 #2601",
        sections: {
          whatWeDid: "已完成",
          whatWeLearned: "已學習",
          nextTimeNotes: "下次注意",
        },
        suggestedTags: [],
      },
      assessment: null,
      aggregateScore: null,
      savedKBItemId: null,
      isLoading: false,
      isGenerating: false,
      isSaving: false,
      error: null,
    };

    localStorage.setItem("case-closing-data", JSON.stringify(stored));

    // 新的 hook 應該復原狀態
    const { result } = renderHook(() => useCaseClosing());

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull();
      expect(result.current.summary?.caseId).toBe("case-001");
    });
  });
});

// ── saveToKB ───────────────────────────────────────────────

describe("useCaseClosing — saveToKB", () => {
  it("摘要或評分未完成時拋出錯誤", async () => {
    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      try {
        await result.current.saveToKB();
        expect.fail("應該拋出錯誤");
      } catch (err) {
        expect(String(err)).toContain("摘要或評分未完成");
      }
    });
  });

  it("成功寫入 KB", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          what_we_did: "完成開發",
          what_we_learned: "學到很多",
          next_time_notes: "下次注意",
          suggested_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kb_item_id: "kb-001",
        }),
      });

    const { result } = renderHook(() => useCaseClosing());

    // 先生成摘要
    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    // 再設定評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: ["技術風險"],
      });
    });

    // 寫入 KB
    let kbItemId: string | null = null;
    await act(async () => {
      kbItemId = await result.current.saveToKB();
    });

    expect(kbItemId).toBe("kb-001");
    expect(result.current.savedKBItemId).toBe("kb-001");
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("KB 寫入失敗設定錯誤", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          what_we_did: "完成開發",
          what_we_learned: "學到很多",
          next_time_notes: "下次注意",
          suggested_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "KB 寫入失敗" }),
      });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: [],
      });
    });

    await act(async () => {
      try {
        await result.current.saveToKB();
        expect.fail("應該拋出錯誤");
      } catch (err) {
        expect(String(err)).toContain("KB 寫入失敗");
      }
    });

    expect(result.current.savedKBItemId).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });
});

// ── complete ───────────────────────────────────────────────

describe("useCaseClosing — complete", () => {
  it("摘要未生成時拋出錯誤", async () => {
    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      try {
        await result.current.complete();
        expect.fail("應該拋出錯誤");
      } catch (err) {
        expect(String(err)).toContain("尚未生成摘要");
      }
    });
  });

  it("成功完成結案", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          what_we_did: "完成開發",
          what_we_learned: "學到很多",
          next_time_notes: "下次注意",
          suggested_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kb_item_id: "kb-001",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => useCaseClosing());

    // 先生成摘要
    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    // 再設定評分
    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: [],
      });
    });

    // 完成結案
    await act(async () => {
      await result.current.complete();
    });

    // 狀態應該被重設
    expect(result.current.summary).toBeNull();
    expect(result.current.assessment).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // localStorage 應該被清空
    expect(localStorage.getItem("case-closing-data")).toBeNull();
  });

  it("結案失敗設定錯誤", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          what_we_did: "完成開發",
          what_we_learned: "學到很多",
          next_time_notes: "下次注意",
          suggested_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "結案失敗" }),
      });

    const { result } = renderHook(() => useCaseClosing());

    await act(async () => {
      await result.current.generateSummary("case-001", "標案 #2601");
    });

    act(() => {
      result.current.updateAssessment({
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
        tags: [],
      });
    });

    await act(async () => {
      try {
        await result.current.complete();
        expect.fail("應該拋出錯誤");
      } catch (err) {
        expect(String(err)).toContain("結案失敗");
      }
    });

    expect(result.current.error).toContain("結案失敗");
    expect(result.current.isLoading).toBe(false);
  });
});
