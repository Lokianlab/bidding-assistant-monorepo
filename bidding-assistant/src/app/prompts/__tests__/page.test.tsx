import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PromptsPage from "../page";

// ── Mock Radix UI Tabs（避免 lazy render 問題）────────────
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Mock sonner ────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Tests ─────────────────────────────────────────────────

describe("PromptsPage — 渲染", () => {
  it("顯示頁面標題「提示詞編輯器」", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("heading", { name: "提示詞編輯器" })).toBeTruthy();
  });

  it("顯示「儲存所有提示詞」按鈕", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: "儲存所有提示詞" })).toBeTruthy();
  });

  it("顯示「還原預設」按鈕", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: "還原預設" })).toBeTruthy();
  });

  it("顯示「新增階段」按鈕（全形加號前綴）", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: /新增階段/ })).toBeTruthy();
  });

  it("顯示 L1 階段 ID（sidebar + card header badge）", () => {
    render(<PromptsPage />);
    // L1 在 sidebar badge 和 card header badge 各出現一次
    expect(screen.getAllByText("L1").length).toBeGreaterThan(0);
  });

  it("顯示內容 Tab（System Prompt、User Prompt 範本、預覽）", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("tab", { name: "System Prompt" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "User Prompt 範本" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "預覽" })).toBeTruthy();
  });

  it("顯示搜尋框", () => {
    render(<PromptsPage />);
    expect(screen.getByPlaceholderText("搜尋階段...")).toBeTruthy();
  });
});
