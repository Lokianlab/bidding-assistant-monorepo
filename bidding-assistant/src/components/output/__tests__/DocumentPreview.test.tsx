import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { DocumentPreview } from "../DocumentPreview";

// ── Radix Dialog 需要 scrollIntoView ──────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── open=false ─────────────────────────────────────────────

describe("DocumentPreview — open=false", () => {
  it("open=false 時不顯示對話框", () => {
    render(
      createElement(DocumentPreview, {
        html: "<p>test</p>",
        projectName: "測試案件",
        open: false,
        onClose: vi.fn(),
      })
    );
    expect(screen.queryByText(/列印預覽/)).toBeNull();
  });
});

// ── open=true ──────────────────────────────────────────────

describe("DocumentPreview — open=true", () => {
  it("顯示對話框標題（含 projectName）", () => {
    render(
      createElement(DocumentPreview, {
        html: "<p>test</p>",
        projectName: "食農教育推廣計畫",
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText(/食農教育推廣計畫/)).toBeTruthy();
    expect(screen.getByText(/列印預覽/)).toBeTruthy();
  });

  it("顯示「列印 / 儲存為 PDF」按鈕", () => {
    render(
      createElement(DocumentPreview, {
        html: "<p>test</p>",
        projectName: "測試案件",
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText(/列印 \/ 儲存為 PDF/)).toBeTruthy();
  });

  it("顯示 iframe 列印預覽框", () => {
    render(
      createElement(DocumentPreview, {
        html: "<p>hello</p>",
        projectName: "測試案件",
        open: true,
        onClose: vi.fn(),
      })
    );
    // Radix Dialog 渲染在 portal，用 document.querySelector
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeTruthy();
  });

  it("點擊關閉按鈕呼叫 onClose", () => {
    const onClose = vi.fn();
    render(
      createElement(DocumentPreview, {
        html: "<p>test</p>",
        projectName: "測試案件",
        open: true,
        onClose,
      })
    );
    // 關閉按鈕有 sr-only text "關閉"
    const closeBtn = screen.getByText("關閉").closest("button");
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
