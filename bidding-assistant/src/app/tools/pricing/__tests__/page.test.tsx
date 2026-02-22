import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("PricingPage — 渲染", () => {
  it("顯示頁面標題「報價驗算」", () => {
    render(<PricingPage />);
    expect(screen.getByRole("heading", { name: "報價驗算" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<PricingPage />);
    expect(screen.getByText(/經費預算表編輯與即時驗算/)).toBeTruthy();
  });

  it("顯示「經費明細」卡片標題", () => {
    render(<PricingPage />);
    expect(screen.getByText("經費明細")).toBeTruthy();
  });

  it("顯示「預算上限」卡片", () => {
    render(<PricingPage />);
    expect(screen.getByText("預算上限")).toBeTruthy();
  });

  it("顯示「費用摘要」卡片", () => {
    render(<PricingPage />);
    expect(screen.getByText("費用摘要")).toBeTruthy();
  });

  it("顯示「新增項目」按鈕", () => {
    render(<PricingPage />);
    expect(screen.getByRole("button", { name: "新增項目" })).toBeTruthy();
  });

  it("顯示表格欄位標題", () => {
    render(<PricingPage />);
    expect(screen.getByText("類別")).toBeTruthy();
    expect(screen.getByText("項目名稱")).toBeTruthy();
    expect(screen.getByText("單價")).toBeTruthy();
    expect(screen.getByText("小計")).toBeTruthy();
  });

  it("顯示「合計」行", () => {
    render(<PricingPage />);
    expect(screen.getByText("合計")).toBeTruthy();
  });

  it("顯示稅率資訊（5%）", () => {
    render(<PricingPage />);
    expect(screen.getByText(/營業稅.*5%/)).toBeTruthy();
  });
});

describe("PricingPage — 互動", () => {
  it("點「新增項目」後表格多一行", () => {
    render(<PricingPage />);
    const initialRows = screen.getAllByRole("row");
    fireEvent.click(screen.getByRole("button", { name: "新增項目" }));
    const newRows = screen.getAllByRole("row");
    expect(newRows.length).toBeGreaterThan(initialRows.length);
  });
});
