import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { ProjectDetailSheet } from "../ProjectDetailSheet";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// Radix UI Sheet 需要 scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── Helper ──────────────────────────────────────────────────

function makePage(overrides?: Record<string, unknown>): NotionPage {
  return {
    id: "page-1",
    url: "https://notion.so/page-1",
    properties: {
      [F.名稱]: "測試標案名稱",
      [F.進程]: "得標",
      [F.投遞序位]: "1",
      [F.決策]: "備標",
      [F.截標]: "2026-03-01",
      [F.預算]: 2000000,
      [F.招標機關]: "台北市政府",
      [F.企劃主筆]: ["王小明"],
      ...overrides,
    },
  };
}

// ── page=null ──────────────────────────────────────────────

describe("ProjectDetailSheet — page=null", () => {
  it("page=null 時不渲染任何內容", () => {
    const { container } = render(
      createElement(ProjectDetailSheet, {
        page: null,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── 有 page 但 closed ──────────────────────────────────────

describe("ProjectDetailSheet — open=false", () => {
  it("open=false 時 Sheet 不顯示內容", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage(),
        open: false,
        onClose: vi.fn(),
      })
    );
    // Sheet 關閉時內容不在 DOM 中（或不可見）
    expect(screen.queryByText("測試標案名稱")).toBeNull();
  });
});

// ── 有 page 且 open ────────────────────────────────────────

describe("ProjectDetailSheet — open=true", () => {
  it("open=true 時顯示標案名稱", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage(),
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("測試標案名稱")).toBeTruthy();
  });

  it("名稱為空時顯示「未命名標案」", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage({ [F.名稱]: "" }),
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("未命名標案")).toBeTruthy();
  });

  it("顯示狀態 Badge（F.進程）", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage({ [F.進程]: "得標" }),
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("得標")).toBeTruthy();
  });

  it("顯示招標機關", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage({ [F.招標機關]: "新竹縣政府" }),
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("新竹縣政府")).toBeTruthy();
  });

  it("顯示預算（含 $ 格式）", () => {
    render(
      createElement(ProjectDetailSheet, {
        page: makePage({ [F.預算]: 3000000 }),
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText(/\$3,000,000/)).toBeTruthy();
  });
});
