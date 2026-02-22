import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { KBMatrixTable } from "../KBMatrixTable";
import { STAGES } from "@/data/config/stages";
import { KB_LABELS } from "@/data/config/kb-matrix";

// ── Tests ────────────────────────────────────────────────

describe("KBMatrixTable", () => {
  it("顯示表頭「階段」欄", () => {
    render(createElement(KBMatrixTable));
    expect(screen.getByText("階段")).toBeTruthy();
  });

  it("顯示所有知識庫欄位 ID", () => {
    render(createElement(KBMatrixTable));
    for (const id of Object.keys(KB_LABELS)) {
      expect(screen.getByText(id)).toBeTruthy();
    }
  });

  it("顯示所有知識庫欄位標籤", () => {
    render(createElement(KBMatrixTable));
    for (const label of Object.values(KB_LABELS)) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("顯示所有階段 ID", () => {
    render(createElement(KBMatrixTable));
    for (const stage of STAGES) {
      expect(screen.getByText(stage.id)).toBeTruthy();
    }
  });

  it("顯示撰寫規範欄", () => {
    render(createElement(KBMatrixTable));
    expect(screen.getByText("撰寫規範")).toBeTruthy();
    expect(screen.getByText("00-2")).toBeTruthy();
  });

  it("顯示圖例", () => {
    render(createElement(KBMatrixTable));
    expect(screen.getByText("必要引用")).toBeTruthy();
    expect(screen.getByText("選擇性引用")).toBeTruthy();
    expect(screen.getByText("不需引用")).toBeTruthy();
  });

  it("表格行數等於階段數", () => {
    const { container } = render(createElement(KBMatrixTable));
    const tbody = container.querySelector("[data-slot='table-body']");
    const rows = tbody?.querySelectorAll("[data-slot='table-row']");
    expect(rows?.length).toBe(STAGES.length);
  });
});
