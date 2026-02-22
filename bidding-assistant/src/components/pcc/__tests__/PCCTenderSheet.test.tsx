import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ── Radix Sheet 需要 scrollIntoView ───────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── mock next/navigation ───────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ── mock useSettings ───────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { company: { brand: "大員洛川" } },
    updateSettings: vi.fn(),
  }),
}));

// ── mock fetchTenderDetail ────────────────────────────────

vi.mock("@/lib/pcc/usePCCSearch", () => ({
  fetchTenderDetail: vi.fn().mockReturnValue(new Promise(() => {})),
  usePCCSearch: () => ({ results: null, loading: false, error: null, search: vi.fn() }),
}));

// ── mock useAgencyIntel ───────────────────────────────────

vi.mock("@/lib/pcc/useAgencyIntel", () => ({
  useAgencyIntel: () => ({ data: null, loading: false, error: null }),
}));

// ── mock helpers ──────────────────────────────────────────

vi.mock("@/lib/pcc/helpers", () => ({
  parseCompanyRoles: () => [],
  formatPCCDate: (d: string) => d,
  parseTenderSummary: () => null,
  formatAmount: (n: number) => `$${n.toLocaleString()}`,
  calcWinRate: () => ({ rate: 0, wins: 0, total: 0 }),
}));

// ── mock scout-report ─────────────────────────────────────

vi.mock("@/lib/pcc/scout-report", () => ({
  generateScoutPrompt: () => "scout prompt",
  buildScoutInput: () => ({}),
}));

// ── Helper：製作 PCCRecord ──────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    unit_id: "A10001",
    unit_name: "臺北市教育局",
    job_number: "1100101",
    date: "1140301",
    url: "https://example.com",
    brief: {
      title: "食農教育推廣計畫案",
      type: "決標公告",
      companies: [],
    },
    ...overrides,
  };
}

async function getPCCTenderSheet() {
  const mod = await import("../PCCTenderSheet");
  return mod.PCCTenderSheet;
}

// ── record=null ────────────────────────────────────────────

describe("PCCTenderSheet — record=null", () => {
  it("record=null 時不渲染任何內容", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    const { container } = render(
      createElement(PCCTenderSheet, {
        record: null,
        open: false,
        onOpenChange: vi.fn(),
      })
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── open=false ─────────────────────────────────────────────

describe("PCCTenderSheet — open=false", () => {
  it("open=false 時 Sheet 不顯示內容", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: false,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.queryByText("食農教育推廣計畫案")).toBeNull();
  });
});

// ── open=true ──────────────────────────────────────────────

describe("PCCTenderSheet — open=true", () => {
  it("顯示標案標題", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText("食農教育推廣計畫案")).toBeTruthy();
  });

  it("顯示機關名稱", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText("臺北市教育局")).toBeTruthy();
  });

  it("顯示案號", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText("1100101")).toBeTruthy();
  });

  it("顯示「載入標案詳情中...」（fetchTenderDetail pending）", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText("載入標案詳情中...")).toBeTruthy();
  });

  it("顯示「分析適配度」按鈕", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText(/分析適配度/)).toBeTruthy();
  });

  it("顯示「複製 P 偵察 Prompt」按鈕", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord() as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText(/複製 P 偵察 Prompt/)).toBeTruthy();
  });

  it("顯示「在政府電子採購網查看」連結", async () => {
    const PCCTenderSheet = await getPCCTenderSheet();
    render(
      createElement(PCCTenderSheet, {
        record: makeRecord({ url: "https://example.com" }) as never,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(screen.getByText("在政府電子採購網查看")).toBeTruthy();
  });
});
