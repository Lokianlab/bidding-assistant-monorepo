import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GuidePage from "../page";
import React from "react";

// Accordion 在 jsdom 內部有 async effect，mock 避免不確定性
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("GuidePage — 渲染", () => {
  it("顯示頁面標題「系統操作指南」", () => {
    render(<GuidePage />);
    expect(screen.getByRole("heading", { name: "系統操作指南" })).toBeTruthy();
  });

  it("顯示「系統簡介」卡片", () => {
    render(<GuidePage />);
    expect(screen.getByText("系統簡介")).toBeTruthy();
  });

  it("顯示「備標指揮部（首頁）」section", () => {
    render(<GuidePage />);
    expect(screen.getByText("備標指揮部（首頁）")).toBeTruthy();
  });

  it("顯示「提示詞組裝」section", () => {
    render(<GuidePage />);
    expect(screen.getByText("提示詞組裝")).toBeTruthy();
  });

  it("顯示「戰略分析」section", () => {
    render(<GuidePage />);
    expect(screen.getByText("戰略分析")).toBeTruthy();
  });

  it("顯示「巡標自動化」section", () => {
    render(<GuidePage />);
    expect(screen.getByText("巡標自動化")).toBeTruthy();
  });

  it("顯示「品質閘門」section", () => {
    render(<GuidePage />);
    expect(screen.getByText("品質閘門")).toBeTruthy();
  });

  it("顯示「設定」section（Accordion trigger button）", () => {
    render(<GuidePage />);
    // AccordionTrigger 渲染為 button，內含 emoji + "設定"
    expect(screen.getByRole("button", { name: /⚙️.*設定/ })).toBeTruthy();
  });

  it("顯示所有 Accordion section（9 個以上）", () => {
    render(<GuidePage />);
    // AccordionTrigger 渲染為 button
    const triggers = screen.getAllByRole("button");
    // 至少 9 個 section
    expect(triggers.length).toBeGreaterThanOrEqual(9);
  });
});
