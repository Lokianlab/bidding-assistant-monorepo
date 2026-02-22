import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QuickStart } from "../QuickStart";
import type { KnowledgeBaseData } from "@/lib/knowledge-base/types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

// Mock useKnowledgeBase
const mockKBData = vi.fn<() => { data: KnowledgeBaseData; hydrated: boolean }>();
vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: () => mockKBData(),
}));

const emptyKB: KnowledgeBaseData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: "",
  version: 1,
};

function makeEntry(status: string) {
  return { entryStatus: status } as never;
}

beforeEach(() => {
  mockKBData.mockReset();
});

describe("QuickStart", () => {
  it("hydrated=false 時不渲染任何東西", () => {
    mockKBData.mockReturnValue({ data: emptyKB, hydrated: false });
    const { container } = render(createElement(QuickStart));
    expect(container.innerHTML).toBe("");
  });

  it("知識庫為空時顯示快速開始卡片", () => {
    mockKBData.mockReturnValue({ data: emptyKB, hydrated: true });
    render(createElement(QuickStart));
    expect(screen.getByText("快速開始")).toBeTruthy();
  });

  it("顯示四個步驟", () => {
    mockKBData.mockReturnValue({ data: emptyKB, hydrated: true });
    render(createElement(QuickStart));
    expect(screen.getByText("新增團隊成員")).toBeTruthy();
    expect(screen.getByText("新增公司實績")).toBeTruthy();
    expect(screen.getByText("搜尋標案")).toBeTruthy();
    expect(screen.getByText("分析適配度")).toBeTruthy();
  });

  it("未完成的步驟顯示「前往」按鈕", () => {
    mockKBData.mockReturnValue({ data: emptyKB, hydrated: true });
    render(createElement(QuickStart));
    const buttons = screen.getAllByText("前往");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("00A 夠 3 筆 active 時第一步顯示 ✓", () => {
    const kb: KnowledgeBaseData = {
      ...emptyKB,
      "00A": [makeEntry("active"), makeEntry("active"), makeEntry("active")],
    };
    mockKBData.mockReturnValue({ data: kb, hydrated: true });
    render(createElement(QuickStart));
    // 第一步有 ✓（draft 不算）
    expect(screen.getByText("快速開始")).toBeTruthy();
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBeGreaterThanOrEqual(1);
  });

  it("00A draft 不算 active", () => {
    const kb: KnowledgeBaseData = {
      ...emptyKB,
      "00A": [makeEntry("draft"), makeEntry("draft"), makeEntry("draft")],
    };
    mockKBData.mockReturnValue({ data: kb, hydrated: true });
    render(createElement(QuickStart));
    // 全是 draft，步驟一不會打勾
    expect(screen.getByText(/00A：目前 0 筆/)).toBeTruthy();
  });

  it("00A ≥3 且 00B ≥2 時整個元件不渲染", () => {
    const kb: KnowledgeBaseData = {
      ...emptyKB,
      "00A": [makeEntry("active"), makeEntry("active"), makeEntry("active")],
      "00B": [makeEntry("active"), makeEntry("active")],
    };
    mockKBData.mockReturnValue({ data: kb, hydrated: true });
    const { container } = render(createElement(QuickStart));
    expect(container.innerHTML).toBe("");
  });

  it("00A 夠但 00B 不夠時仍顯示", () => {
    const kb: KnowledgeBaseData = {
      ...emptyKB,
      "00A": [makeEntry("active"), makeEntry("active"), makeEntry("active")],
      "00B": [makeEntry("active")],
    };
    mockKBData.mockReturnValue({ data: kb, hydrated: true });
    render(createElement(QuickStart));
    expect(screen.getByText("快速開始")).toBeTruthy();
  });

  it("步驟描述顯示正確的筆數", () => {
    const kb: KnowledgeBaseData = {
      ...emptyKB,
      "00A": [makeEntry("active"), makeEntry("active")],
      "00B": [makeEntry("active")],
    };
    mockKBData.mockReturnValue({ data: kb, hydrated: true });
    render(createElement(QuickStart));
    expect(screen.getByText(/目前 2 筆/)).toBeTruthy();
    expect(screen.getByText(/目前 1 筆/)).toBeTruthy();
  });

  it("連結指向正確頁面", () => {
    mockKBData.mockReturnValue({ data: emptyKB, hydrated: true });
    render(createElement(QuickStart));
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/knowledge-base");
    expect(hrefs).toContain("/intelligence");
    expect(hrefs).toContain("/strategy");
  });
});
