import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("@/lib/pcc/usePCCSearch", () => ({
  usePCCSearch: () => ({
    results: null,
    loading: false,
    error: null,
    search: vi.fn(),
    clearResults: vi.fn(),
  }),
  fetchTenderDetail: vi.fn(),
}));

vi.mock("@/lib/pcc/useAgencyIntel", () => ({
  useAgencyIntel: () => ({ data: null, loading: false, error: null }),
}));

vi.mock("@/lib/pcc/useCompetitorAnalysis", () => ({
  useCompetitorAnalysis: () => ({
    data: null,
    loading: false,
    progress: null,
    error: null,
    run: vi.fn(),
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

import { ExplorerPage } from "../ExplorerPage";

describe("ExplorerPage", () => {
  it("初始顯示搜尋介面", () => {
    render(<ExplorerPage />);
    expect(screen.getByText("按案名搜尋")).toBeTruthy();
    expect(screen.getByText("按廠商搜尋")).toBeTruthy();
    expect(screen.getByPlaceholderText("輸入標案關鍵字...")).toBeTruthy();
  });
});
