import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PromptLibraryPage from "../page";

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

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/prompt-library/StageCard", () => ({
  StageCard: ({ stage }: { stage: { id: string; name: string } }) => (
    <div data-testid={`stage-card-${stage.id}`}>{stage.name}</div>
  ),
  ToolCard: ({ file }: { file: { id: string; name: string } }) => (
    <div data-testid={`tool-card-${file.id}`}>{file.name}</div>
  ),
}));

vi.mock("@/components/prompt-library/StageFileList", () => ({
  StageFileList: () => <div data-testid="stage-file-list">階段檔案清單</div>,
}));

vi.mock("@/components/prompt-library/ToolFileDialog", () => ({
  ToolFileDialog: () => <div data-testid="tool-file-dialog">工具檔案對話框</div>,
}));

vi.mock("@/components/prompt-library/KBMatrixTable", () => ({
  KBMatrixTable: () => <div data-testid="kb-matrix-table">知識庫矩陣</div>,
}));

vi.mock("@/components/prompt-library/EmergencyCopyPanel", () => ({
  EmergencyCopyPanel: () => (
    <div data-testid="emergency-copy-panel">緊急協作面板</div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────

describe("PromptLibraryPage — 渲染", () => {
  it("顯示頁面標題「模板庫」", () => {
    render(<PromptLibraryPage />);
    expect(screen.getByRole("heading", { name: "模板庫" })).toBeTruthy();
  });

  it("顯示三個 Tab（階段總覽、知識庫矩陣、緊急協作）", () => {
    render(<PromptLibraryPage />);
    expect(screen.getByRole("tab", { name: "階段總覽" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "知識庫矩陣" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "緊急協作" })).toBeTruthy();
  });

  it("渲染 KBMatrixTable", () => {
    render(<PromptLibraryPage />);
    expect(screen.getByTestId("kb-matrix-table")).toBeTruthy();
  });

  it("渲染 EmergencyCopyPanel", () => {
    render(<PromptLibraryPage />);
    expect(screen.getByTestId("emergency-copy-panel")).toBeTruthy();
  });

  it("渲染 MobileMenuButton", () => {
    render(<PromptLibraryPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("渲染 STAGES 對應的 StageCard（至少一個）", () => {
    render(<PromptLibraryPage />);
    const stageCards = screen.getAllByTestId(/^stage-card-/);
    expect(stageCards.length).toBeGreaterThan(0);
  });
});
