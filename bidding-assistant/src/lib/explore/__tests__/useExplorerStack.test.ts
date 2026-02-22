import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExplorerStack } from "../useExplorerStack";
import type { StackEntry, NavigateEvent } from "../types";

describe("useExplorerStack", () => {
  it("初始堆疊為空，current = null", () => {
    const { result } = renderHook(() => useExplorerStack());
    expect(result.current.stack).toEqual([]);
    expect(result.current.current).toBeNull();
  });

  it("push 新實體後 current 指向頂端", () => {
    const { result } = renderHook(() => useExplorerStack());
    const entry: StackEntry = { type: "search", id: "title:食農教育", label: "搜尋「食農教育」" };

    act(() => result.current.push(entry));

    expect(result.current.stack).toHaveLength(1);
    expect(result.current.current).toEqual(entry);
  });

  it("連續 push 多層後 stack 正確", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "title:食農", label: "搜尋「食農」" });
      result.current.push({ type: "tender", id: "U001/J001", label: "食農教育計畫" });
      result.current.push({ type: "company", id: "大員洛川", label: "大員洛川" });
    });

    expect(result.current.stack).toHaveLength(3);
    expect(result.current.current?.type).toBe("company");
    expect(result.current.current?.id).toBe("大員洛川");
  });

  it("pop 回上一層", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "title:食農", label: "搜尋" });
      result.current.push({ type: "tender", id: "U001/J001", label: "案件" });
    });

    act(() => result.current.pop());

    expect(result.current.stack).toHaveLength(1);
    expect(result.current.current?.type).toBe("search");
  });

  it("pop 不會清空最後一筆（保留根節點）", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "title:食農", label: "搜尋" });
    });

    act(() => result.current.pop());

    expect(result.current.stack).toHaveLength(1);
    expect(result.current.current?.type).toBe("search");
  });

  it("jump 跳到麵包屑指定層級", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "s1", label: "搜尋" });
      result.current.push({ type: "tender", id: "t1", label: "案件" });
      result.current.push({ type: "company", id: "c1", label: "廠商" });
      result.current.push({ type: "agency", id: "a1", label: "機關" });
    });

    // 跳回第 1 層（tender）
    act(() => result.current.jump(1));

    expect(result.current.stack).toHaveLength(2);
    expect(result.current.current?.type).toBe("tender");
    expect(result.current.current?.id).toBe("t1");
  });

  it("jump 到無效 index 不改變堆疊", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "s1", label: "搜尋" });
    });

    act(() => result.current.jump(-1));
    expect(result.current.stack).toHaveLength(1);

    act(() => result.current.jump(5));
    expect(result.current.stack).toHaveLength(1);
  });

  it("reset 清空堆疊", () => {
    const { result } = renderHook(() => useExplorerStack());

    act(() => {
      result.current.push({ type: "search", id: "s1", label: "搜尋" });
      result.current.push({ type: "tender", id: "t1", label: "案件" });
    });

    act(() => result.current.reset());

    expect(result.current.stack).toEqual([]);
    expect(result.current.current).toBeNull();
  });

  describe("navigate 從 NavigateEvent 建立 StackEntry", () => {
    it("navigate tender", () => {
      const { result } = renderHook(() => useExplorerStack());

      const event: NavigateEvent = {
        type: "tender",
        payload: { unitId: "U001", jobNumber: "J001", title: "食農教育推廣計畫", unitName: "農委會" },
      };

      act(() => result.current.navigate(event));

      expect(result.current.current).toEqual({
        type: "tender",
        id: "U001/J001",
        label: "食農教育推廣計畫",
      });
    });

    it("navigate tender 標題過長自動截斷", () => {
      const { result } = renderHook(() => useExplorerStack());

      act(() => {
        result.current.navigate({
          type: "tender",
          payload: { unitId: "U1", jobNumber: "J1", title: "這是一個超級長的標案名稱需要被截斷才不會太長", unitName: "X" },
        });
      });

      expect(result.current.current!.label.length).toBeLessThanOrEqual(21); // 20 + "…"
    });

    it("navigate company", () => {
      const { result } = renderHook(() => useExplorerStack());

      act(() => {
        result.current.navigate({ type: "company", payload: { name: "大員洛川" } });
      });

      expect(result.current.current).toEqual({
        type: "company",
        id: "大員洛川",
        label: "大員洛川",
      });
    });

    it("navigate agency", () => {
      const { result } = renderHook(() => useExplorerStack());

      act(() => {
        result.current.navigate({ type: "agency", payload: { unitId: "AGC001", unitName: "農委會" } });
      });

      expect(result.current.current).toEqual({
        type: "agency",
        id: "AGC001",
        label: "農委會",
      });
    });

    it("navigate search", () => {
      const { result } = renderHook(() => useExplorerStack());

      act(() => {
        result.current.navigate({ type: "search", payload: { query: "導覽", mode: "title" } });
      });

      expect(result.current.current).toEqual({
        type: "search",
        id: "title:導覽",
        label: "搜尋「導覽」",
      });
    });
  });

  it("完整循環：搜尋→案件→廠商→案件", () => {
    const { result } = renderHook(() => useExplorerStack());

    // 搜尋
    act(() => {
      result.current.navigate({ type: "search", payload: { query: "食農", mode: "title" } });
    });
    expect(result.current.stack).toHaveLength(1);

    // 點進案件
    act(() => {
      result.current.navigate({
        type: "tender",
        payload: { unitId: "U1", jobNumber: "J1", title: "食農教育計畫", unitName: "農委會" },
      });
    });
    expect(result.current.stack).toHaveLength(2);

    // 點進廠商
    act(() => {
      result.current.navigate({ type: "company", payload: { name: "大員洛川" } });
    });
    expect(result.current.stack).toHaveLength(3);

    // 從廠商的投標紀錄點進另一個案件
    act(() => {
      result.current.navigate({
        type: "tender",
        payload: { unitId: "U2", jobNumber: "J2", title: "走讀計畫", unitName: "文化部" },
      });
    });
    expect(result.current.stack).toHaveLength(4);
    expect(result.current.current?.type).toBe("tender");

    // 用麵包屑跳回搜尋
    act(() => result.current.jump(0));
    expect(result.current.stack).toHaveLength(1);
    expect(result.current.current?.type).toBe("search");
  });
});
