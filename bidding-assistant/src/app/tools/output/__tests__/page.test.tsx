import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OutputPage from "../page";

// ── Mock 重度依賴元件 ──────────────────────────────────────
vi.mock("@/components/output/DocumentWorkbench", () => ({
  DocumentWorkbench: () => (
    <div data-testid="document-workbench">文件工作台元件</div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────

describe("OutputPage", () => {
  it("顯示頁面標題「文件工作台」", () => {
    render(<OutputPage />);
    expect(screen.getByRole("heading", { name: "文件工作台" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<OutputPage />);
    expect(screen.getByText(/選擇範本、填入各章內容/)).toBeTruthy();
  });

  it("顯示「切換至簡易模式」連結", () => {
    render(<OutputPage />);
    expect(screen.getByRole("link", { name: "切換至簡易模式" })).toBeTruthy();
  });

  it("渲染 DocumentWorkbench 元件", () => {
    render(<OutputPage />);
    expect(screen.getByTestId("document-workbench")).toBeTruthy();
  });
});
