import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────

const mockSearch = vi.fn();
vi.mock("@/lib/pcc/usePCCSearch", () => ({
  usePCCSearch: () => ({
    results: null,
    loading: false,
    error: null,
    search: mockSearch,
    clearResults: vi.fn(),
  }),
}));

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { company: { brand: "大員洛川" } },
    hydrated: true,
    updateSettings: vi.fn(),
    updateSection: vi.fn(),
  }),
}));

import { SearchView } from "../SearchView";

describe("SearchView", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("渲染搜尋框和按鈕", () => {
    render(<SearchView onNavigate={onNavigate} />);
    expect(screen.getByPlaceholderText("輸入標案關鍵字...")).toBeTruthy();
    expect(screen.getByText("搜尋")).toBeTruthy();
  });

  it("輸入搜尋詞後點搜尋觸發 search", () => {
    render(<SearchView onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText("輸入標案關鍵字...");
    fireEvent.change(input, { target: { value: "食農教育" } });
    fireEvent.click(screen.getByText("搜尋"));

    expect(mockSearch).toHaveBeenCalledWith("食農教育", "title");
  });

  it("按 Enter 觸發搜尋", () => {
    render(<SearchView onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText("輸入標案關鍵字...");
    fireEvent.change(input, { target: { value: "走讀" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSearch).toHaveBeenCalledWith("走讀", "title");
  });

  it("有 initialQuery 時自動搜尋", () => {
    render(<SearchView onNavigate={onNavigate} initialQuery="導覽" initialMode="title" />);
    expect(mockSearch).toHaveBeenCalledWith("導覽", "title");
  });
});
