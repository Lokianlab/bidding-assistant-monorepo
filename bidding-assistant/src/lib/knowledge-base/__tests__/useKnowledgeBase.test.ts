import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKnowledgeBase } from "../useKnowledgeBase";
import { KB_STORAGE_KEY, KB_DATA_VERSION } from "../constants";
import type {
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "../types";

// ====== 測試用假資料 ======

function makeEntry00A(overrides?: Partial<KBEntry00A>): KBEntry00A {
  return {
    id: "M-001",
    name: "測試人員",
    title: "工程師",
    status: "在職",
    authorizedRoles: ["計畫主持人"],
    education: [],
    certifications: [],
    experiences: [],
    projects: [],
    additionalCapabilities: "",
    entryStatus: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry00B(overrides?: Partial<KBEntry00B>): KBEntry00B {
  return {
    id: "P-2026-001",
    projectName: "測試專案",
    client: "測試機關",
    contractAmount: "100萬",
    period: "民國 115 年",
    entity: "測試公司",
    role: "得標廠商（與機關簽約）",
    completionStatus: "已驗收結案",
    teamMembers: "計畫主持人：測試（M-001）",
    workItems: [],
    outcomes: "測試成果",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry00C(overrides?: Partial<KBEntry00C>): KBEntry00C {
  return {
    id: "T-TEST",
    templateName: "測試範本",
    applicableType: "展覽策展",
    budgetRange: "100-500萬",
    durationRange: "3-6個月",
    phases: [],
    warnings: "",
    entryStatus: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry00D(overrides?: Partial<KBEntry00D>): KBEntry00D {
  return {
    id: "R-TEST",
    riskName: "測試風險",
    riskLevel: "中",
    prevention: "預防措施",
    responseSteps: [],
    notes: "",
    entryStatus: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry00E(overrides?: Partial<KBEntry00E>): KBEntry00E {
  return {
    id: "REV-001",
    projectName: "測試檢討案",
    result: "得標",
    year: "2026",
    bidPhaseReview: "分析內容",
    executionReview: "執行檢討",
    kbUpdateSuggestions: "建議",
    aiToolFeedback: "回饋",
    oneSentenceSummary: "一句話總結",
    entryStatus: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ====== 測試 ======

describe("useKnowledgeBase", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ------ 初始化 ------

  describe("初始化", () => {
    it("localStorage 為空時回傳空資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());
      expect(result.current.data["00A"]).toEqual([]);
      expect(result.current.data["00B"]).toEqual([]);
      expect(result.current.data["00C"]).toEqual([]);
      expect(result.current.data["00D"]).toEqual([]);
      expect(result.current.data["00E"]).toEqual([]);
      expect(result.current.data.version).toBe(KB_DATA_VERSION);
    });

    it("從 localStorage 載入既有資料", () => {
      const entry = makeEntry00A();
      const stored: KnowledgeBaseData = {
        "00A": [entry],
        "00B": [],
        "00C": [],
        "00D": [],
        "00E": [],
        lastUpdated: "2026-01-01T00:00:00.000Z",
        version: KB_DATA_VERSION,
      };
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(stored));

      const { result } = renderHook(() => useKnowledgeBase());
      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00A"][0].name).toBe("測試人員");
    });

    it("JSON 損毀時回傳空資料", () => {
      localStorage.setItem(KB_STORAGE_KEY, "not-valid-json{{{");
      const { result } = renderHook(() => useKnowledgeBase());
      expect(result.current.data["00A"]).toEqual([]);
      expect(result.current.data.version).toBe(KB_DATA_VERSION);
    });

    it("缺少某個 key 時自動補齊", () => {
      // 只有 00A，缺 00B-00E
      const partial = {
        "00A": [makeEntry00A()],
        lastUpdated: "2026-01-01T00:00:00.000Z",
        version: KB_DATA_VERSION,
      };
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(partial));

      const { result } = renderHook(() => useKnowledgeBase());
      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00B"]).toEqual([]);
      expect(result.current.data["00C"]).toEqual([]);
    });

    it("舊版本資料會升級 version", () => {
      const oldData = {
        "00A": [],
        "00B": [],
        "00C": [],
        "00D": [],
        "00E": [],
        lastUpdated: "2026-01-01T00:00:00.000Z",
        version: 0, // 舊版本
      };
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(oldData));

      const { result } = renderHook(() => useKnowledgeBase());
      expect(result.current.data.version).toBe(KB_DATA_VERSION);
    });
  });

  // ------ CRUD: 新增 ------

  describe("新增條目", () => {
    it("addEntry00A 新增團隊成員", () => {
      const { result } = renderHook(() => useKnowledgeBase());
      const entry = makeEntry00A();

      act(() => {
        result.current.addEntry00A(entry);
      });

      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00A"][0].id).toBe("M-001");
    });

    it("addEntry00B 新增實績", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00B(makeEntry00B());
      });

      expect(result.current.data["00B"]).toHaveLength(1);
      expect(result.current.data["00B"][0].projectName).toBe("測試專案");
    });

    it("addEntry00C 新增時程範本", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00C(makeEntry00C());
      });

      expect(result.current.data["00C"]).toHaveLength(1);
    });

    it("addEntry00D 新增應變 SOP", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00D(makeEntry00D());
      });

      expect(result.current.data["00D"]).toHaveLength(1);
    });

    it("addEntry00E 新增案後檢討", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00E(makeEntry00E());
      });

      expect(result.current.data["00E"]).toHaveLength(1);
    });

    it("連續新增不會覆蓋", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
      });
      act(() => {
        result.current.addEntry00A(makeEntry00A({ id: "M-002", name: "第二人" }));
      });

      expect(result.current.data["00A"]).toHaveLength(2);
      expect(result.current.data["00A"][1].name).toBe("第二人");
    });
  });

  // ------ CRUD: 更新 ------

  describe("更新條目", () => {
    it("updateEntry00A 更新指定欄位", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });
      act(() => {
        result.current.updateEntry00A("M-001", { name: "新名字" });
      });

      expect(result.current.data["00A"][0].name).toBe("新名字");
      // updatedAt 應該被更新
      expect(result.current.data["00A"][0].updatedAt).not.toBe(
        "2026-01-01T00:00:00.000Z"
      );
    });

    it("updateEntry00B 更新實績", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00B(makeEntry00B());
      });
      act(() => {
        result.current.updateEntry00B("P-2026-001", {
          projectName: "更新專案名",
        });
      });

      expect(result.current.data["00B"][0].projectName).toBe("更新專案名");
    });

    it("updateEntry00C 更新範本", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00C(makeEntry00C());
      });
      act(() => {
        result.current.updateEntry00C("T-TEST", { templateName: "新範本" });
      });

      expect(result.current.data["00C"][0].templateName).toBe("新範本");
    });

    it("updateEntry00D 更新 SOP", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00D(makeEntry00D());
      });
      act(() => {
        result.current.updateEntry00D("R-TEST", { riskLevel: "高" });
      });

      expect(result.current.data["00D"][0].riskLevel).toBe("高");
    });

    it("updateEntry00E 更新檢討", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00E(makeEntry00E());
      });
      act(() => {
        result.current.updateEntry00E("REV-001", { result: "未得標" });
      });

      expect(result.current.data["00E"][0].result).toBe("未得標");
    });

    it("更新不存在的 ID 不影響資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });
      act(() => {
        result.current.updateEntry00A("NONEXISTENT", { name: "不存在" });
      });

      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00A"][0].name).toBe("測試人員");
    });
  });

  // ------ 通用操作 ------

  describe("通用操作", () => {
    it("deleteEntry 刪除指定條目", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
        result.current.addEntry00A(makeEntry00A({ id: "M-002" }));
      });
      act(() => {
        result.current.deleteEntry("00A", "M-001");
      });

      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00A"][0].id).toBe("M-002");
    });

    it("deleteEntry 刪除不存在的 ID 不影響資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });
      act(() => {
        result.current.deleteEntry("00A", "NONEXISTENT");
      });

      expect(result.current.data["00A"]).toHaveLength(1);
    });

    it("updateEntryStatus 更新狀態", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A({ entryStatus: "draft" }));
      });
      act(() => {
        result.current.updateEntryStatus("00A", "M-001", "archived");
      });

      expect(result.current.data["00A"][0].entryStatus).toBe("archived");
    });
  });

  // ------ 匯入/匯出/清空 ------

  describe("匯入匯出", () => {
    it("importData 匯入部分資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });

      // 只匯入 00B，00A 應保留
      act(() => {
        result.current.importData({ "00B": [makeEntry00B()] });
      });

      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00B"]).toHaveLength(1);
    });

    it("importData 覆蓋指定知識庫", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
      });

      // 匯入新的 00A 陣列（取代舊的）
      act(() => {
        result.current.importData({
          "00A": [makeEntry00A({ id: "M-999", name: "匯入人員" })],
        });
      });

      expect(result.current.data["00A"]).toHaveLength(1);
      expect(result.current.data["00A"][0].id).toBe("M-999");
    });

    it("exportData 回傳完整資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
        result.current.addEntry00B(makeEntry00B());
      });

      let exported: KnowledgeBaseData;
      act(() => {
        exported = result.current.exportData();
      });

      expect(exported!["00A"]).toHaveLength(1);
      expect(exported!["00B"]).toHaveLength(1);
      expect(exported!.version).toBe(KB_DATA_VERSION);
      expect(exported!.lastUpdated).toBeDefined();
    });

    it("clearAll 清空所有資料", () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
        result.current.addEntry00B(makeEntry00B());
        result.current.addEntry00C(makeEntry00C());
      });
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.data["00A"]).toEqual([]);
      expect(result.current.data["00B"]).toEqual([]);
      expect(result.current.data["00C"]).toEqual([]);
    });
  });

  // ------ localStorage 持久化 ------

  describe("持久化", () => {
    it("新增條目後自動寫入 localStorage", async () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });

      // useEffect 是非同步的，等 re-render 完成
      await vi.waitFor(() => {
        const stored = localStorage.getItem(KB_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed["00A"]).toHaveLength(1);
      });
    });

    it("clearAll 後 localStorage 也被清空", async () => {
      const { result } = renderHook(() => useKnowledgeBase());

      act(() => {
        result.current.addEntry00A(makeEntry00A());
      });
      act(() => {
        result.current.clearAll();
      });

      await vi.waitFor(() => {
        const stored = localStorage.getItem(KB_STORAGE_KEY);
        const parsed = JSON.parse(stored!);
        expect(parsed["00A"]).toEqual([]);
      });
    });
  });
});
