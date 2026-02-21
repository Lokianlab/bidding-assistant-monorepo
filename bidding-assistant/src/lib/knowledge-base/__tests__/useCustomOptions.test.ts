import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomOptions, DEFAULT_OPTIONS } from "../useCustomOptions";

const STORAGE_KEY = "bidding-assistant-custom-options";

describe("useCustomOptions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ------ 初始化 ------

  describe("初始化", () => {
    it("localStorage 為空時 getOptions 回傳預設值", () => {
      const { result } = renderHook(() => useCustomOptions());
      expect(result.current.getOptions("00A_roles")).toEqual(
        DEFAULT_OPTIONS["00A_roles"]
      );
    });

    it("從 localStorage 載入自訂選項", () => {
      const custom = { "00A_roles": ["自訂角色A", "自訂角色B"] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

      const { result } = renderHook(() => useCustomOptions());
      expect(result.current.getOptions("00A_roles")).toEqual([
        "自訂角色A",
        "自訂角色B",
      ]);
    });

    it("JSON 損毀時回傳預設值", () => {
      localStorage.setItem(STORAGE_KEY, "broken{json");
      const { result } = renderHook(() => useCustomOptions());
      expect(result.current.getOptions("00A_roles")).toEqual(
        DEFAULT_OPTIONS["00A_roles"]
      );
    });
  });

  // ------ addOption ------

  describe("addOption", () => {
    it("新增選項到指定欄位", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.addOption("00A_roles", "新角色");
      });

      const opts = result.current.getOptions("00A_roles");
      expect(opts).toContain("新角色");
      // 也保留原本的預設值
      expect(opts).toContain("計畫主持人");
    });

    it("去除前後空白", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.addOption("00E_result", "  新結果  ");
      });

      expect(result.current.getOptions("00E_result")).toContain("新結果");
    });

    it("空字串不新增", () => {
      const { result } = renderHook(() => useCustomOptions());
      const before = result.current.getOptions("00A_roles").length;

      act(() => {
        result.current.addOption("00A_roles", "   ");
      });

      expect(result.current.getOptions("00A_roles").length).toBe(before);
    });

    it("重複值不新增", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.addOption("00A_roles", "計畫主持人"); // 已在預設中
      });

      const roles = result.current.getOptions("00A_roles");
      const count = roles.filter((r) => r === "計畫主持人").length;
      expect(count).toBe(1);
    });
  });

  // ------ removeOption ------

  describe("removeOption", () => {
    it("移除指定選項", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.removeOption("00A_roles", "計畫主持人");
      });

      expect(result.current.getOptions("00A_roles")).not.toContain("計畫主持人");
    });

    it("移除不存在的值不報錯", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.removeOption("00A_roles", "不存在的角色");
      });

      // 原始數量不變
      expect(result.current.getOptions("00A_roles")).toEqual(
        DEFAULT_OPTIONS["00A_roles"]
      );
    });
  });

  // ------ resetOptions ------

  describe("resetOptions", () => {
    it("重設後回到預設值", () => {
      const { result } = renderHook(() => useCustomOptions());

      // 先自訂
      act(() => {
        result.current.addOption("00A_roles", "自訂角色");
      });
      expect(result.current.getOptions("00A_roles")).toContain("自訂角色");

      // 重設
      act(() => {
        result.current.resetOptions("00A_roles");
      });

      expect(result.current.getOptions("00A_roles")).toEqual(
        DEFAULT_OPTIONS["00A_roles"]
      );
    });

    it("重設一個欄位不影響其他欄位", () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.addOption("00A_roles", "自訂角色");
        result.current.addOption("00B_entity", "自訂公司");
      });
      act(() => {
        result.current.resetOptions("00A_roles");
      });

      expect(result.current.getOptions("00B_entity")).toContain("自訂公司");
    });
  });

  // ------ 持久化 ------

  describe("持久化", () => {
    it("操作後自動寫入 localStorage", async () => {
      const { result } = renderHook(() => useCustomOptions());

      act(() => {
        result.current.addOption("00C_type", "新類型");
      });

      await vi.waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed["00C_type"]).toContain("新類型");
      });
    });
  });
});
