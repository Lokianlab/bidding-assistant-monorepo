import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import { SearchBar, useDebouncedValue } from "../SearchBar";

// ── SearchBar 元件 ─────────────────────────────────────────

describe("SearchBar — 基本顯示", () => {
  it("顯示 placeholder 文字", () => {
    render(createElement(SearchBar, { value: "", onChange: vi.fn() }));
    expect(screen.getByPlaceholderText("搜尋標案名稱、機關、案號...")).toBeTruthy();
  });

  it("input 顯示傳入的 value", () => {
    render(createElement(SearchBar, { value: "台北市工程", onChange: vi.fn() }));
    const input = screen.getByPlaceholderText("搜尋標案名稱、機關、案號...") as HTMLInputElement;
    expect(input.value).toBe("台北市工程");
  });

  it("value 有值時顯示清除按鈕（✕）", () => {
    render(createElement(SearchBar, { value: "某搜尋詞", onChange: vi.fn() }));
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("value 為空時不顯示清除按鈕", () => {
    render(createElement(SearchBar, { value: "", onChange: vi.fn() }));
    expect(screen.queryByText("✕")).toBeNull();
  });
});

describe("SearchBar — 互動", () => {
  it("輸入文字觸發 onChange 並帶新值", () => {
    const onChange = vi.fn();
    render(createElement(SearchBar, { value: "", onChange }));
    const input = screen.getByPlaceholderText("搜尋標案名稱、機關、案號...");
    fireEvent.change(input, { target: { value: "新標案" } });
    expect(onChange).toHaveBeenCalledWith("新標案");
  });

  it("點清除按鈕觸發 onChange 帶空字串", () => {
    const onChange = vi.fn();
    render(createElement(SearchBar, { value: "舊搜尋詞", onChange }));
    fireEvent.click(screen.getByText("✕"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

// ── useDebouncedValue hook ─────────────────────────────────

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初始值立即返回", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 200));
    expect(result.current).toBe("initial");
  });

  it("延遲 200ms 後更新值", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 200),
      { initialProps: { value: "initial" } }
    );
    rerender({ value: "updated" });
    // 還沒到 200ms，仍是舊值
    expect(result.current).toBe("initial");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 過了 200ms 後更新
    expect(result.current).toBe("updated");
  });

  it("連續更新在延遲結束前只觸發最後一次", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 200),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    rerender({ value: "c" });
    rerender({ value: "d" });
    // 100ms 後仍是舊值
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("a");
    // 再過 100ms（共 200ms）後才更新到最後一個值
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("d");
  });
});
