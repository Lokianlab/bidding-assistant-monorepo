import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ExportPanel } from "../ExportPanel";

// ── Tests ────────────────────────────────────────────────

describe("ExportPanel", () => {
  it("顯示三種匯出格式選項", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    expect(screen.getByText("Word (.docx)")).toBeTruthy();
    expect(screen.getByText("Markdown (.md)")).toBeTruthy();
    expect(screen.getByText(/列印/)).toBeTruthy();
  });

  it("預設選擇 docx 格式", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    const docxRadio = screen.getByLabelText("Word (.docx)") as HTMLInputElement;
    expect(docxRadio.checked).toBe(true);
  });

  it("docx 格式時顯示封面頁和目錄開關", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    expect(screen.getByText("封面頁")).toBeTruthy();
    expect(screen.getByText("自動目錄")).toBeTruthy();
  });

  it("切換到 markdown 格式時隱藏封面頁和目錄", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    fireEvent.click(screen.getByLabelText("Markdown (.md)"));
    expect(screen.queryByText("封面頁")).toBeNull();
    expect(screen.queryByText("自動目錄")).toBeNull();
  });

  it("匯出按鈕存在且顯示「匯出」", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    expect(screen.getByRole("button", { name: /匯出/ })).toBeTruthy();
  });

  it("匯出中時按鈕顯示「匯出中」且禁用", () => {
    render(createElement(ExportPanel, { isExporting: true, onExport: vi.fn() }));
    const btn = screen.getByRole("button", { name: /匯出中/ });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("點擊匯出按鈕呼叫 onExport（docx 預設值）", () => {
    const onExport = vi.fn();
    render(createElement(ExportPanel, { isExporting: false, onExport }));
    fireEvent.click(screen.getByRole("button", { name: /匯出/ }));
    expect(onExport).toHaveBeenCalledWith({
      format: "docx",
      coverPage: true,
      tableOfContents: true,
    });
  });

  it("選擇 markdown 後點擊匯出傳遞 markdown 格式", () => {
    const onExport = vi.fn();
    render(createElement(ExportPanel, { isExporting: false, onExport }));
    fireEvent.click(screen.getByLabelText("Markdown (.md)"));
    fireEvent.click(screen.getByRole("button", { name: /匯出/ }));
    expect(onExport).toHaveBeenCalledWith({
      format: "markdown",
      coverPage: true,
      tableOfContents: true,
    });
  });

  it("有錯誤訊息時顯示錯誤", () => {
    render(createElement(ExportPanel, {
      isExporting: false,
      errorMessage: "匯出失敗：檔案太大",
      onExport: vi.fn(),
    }));
    expect(screen.getByText("匯出失敗：檔案太大")).toBeTruthy();
  });

  it("無錯誤訊息時不顯示錯誤區塊", () => {
    render(createElement(ExportPanel, { isExporting: false, onExport: vi.fn() }));
    expect(screen.queryByText(/匯出失敗/)).toBeNull();
  });
});
