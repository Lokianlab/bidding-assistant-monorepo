import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { KBInsertDialog } from "../KBInsertDialog";

// ── Mock useKnowledgeBase ─────────────────────────────────

const mockKbData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: "2026-01-01T00:00:00Z",
  version: 1,
};

const mockHydrated = true;

vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: () => ({
    data: mockKbData,
    hydrated: mockHydrated,
  }),
}));

// ── Helpers ───────────────────────────────────────────────

function openDialog(): void {
  // 點觸發按鈕開啟 Dialog
  fireEvent.click(screen.getByText("插入知識庫"));
}

// ── 觸發按鈕 ──────────────────────────────────────────────

describe("KBInsertDialog — 觸發按鈕", () => {
  it("顯示「插入知識庫」觸發按鈕", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    expect(screen.getByText("插入知識庫")).toBeTruthy();
  });
});

// ── Dialog 開啟 ────────────────────────────────────────────

describe("KBInsertDialog — Dialog 開啟", () => {
  it("點觸發按鈕後顯示 Dialog 標題「插入知識庫內容」", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("插入知識庫內容")).toBeTruthy();
  });

  it("開啟後顯示「品牌 / 日期」類別按鈕", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("品牌 / 日期")).toBeTruthy();
  });

  it("開啟後顯示各知識庫類別按鈕（00A ~ 00E）", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText(/00A/)).toBeTruthy();
    expect(screen.getByText(/00B/)).toBeTruthy();
    expect(screen.getByText(/00C/)).toBeTruthy();
    expect(screen.getByText(/00D/)).toBeTruthy();
    expect(screen.getByText(/00E/)).toBeTruthy();
  });
});

// ── 品牌 / 日期 選項 ───────────────────────────────────────

describe("KBInsertDialog — 品牌/日期預設選項", () => {
  it("預設顯示「公司名稱」選項", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("公司名稱")).toBeTruthy();
  });

  it("預設顯示「統一編號」選項", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("統一編號")).toBeTruthy();
  });

  it("預設顯示「案件名稱」選項", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("案件名稱")).toBeTruthy();
  });

  it("顯示品牌佔位符 badge（{{company:name}}）", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    expect(screen.getByText("{{company:name}}")).toBeTruthy();
  });
});

// ── 點擊插入選項 ────────────────────────────────────────────

describe("KBInsertDialog — 點擊插入", () => {
  it("點「公司名稱」呼叫 onInsert 帶正確佔位符", () => {
    const onInsert = vi.fn();
    render(createElement(KBInsertDialog, { onInsert }));
    openDialog();
    fireEvent.click(screen.getByText("公司名稱"));
    expect(onInsert).toHaveBeenCalledWith("{{company:name}}");
  });

  it("點「今日日期（民國）」呼叫 onInsert 帶正確佔位符", () => {
    const onInsert = vi.fn();
    render(createElement(KBInsertDialog, { onInsert }));
    openDialog();
    fireEvent.click(screen.getByText("今日日期（民國）"));
    expect(onInsert).toHaveBeenCalledWith("{{date:roc}}");
  });
});

// ── 知識庫類別切換 ─────────────────────────────────────────

describe("KBInsertDialog — 類別切換", () => {
  it("切換到 00B 後顯示「最近 3 筆實績」固定選項", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    fireEvent.click(screen.getByText(/00B/));
    expect(screen.getByText("最近 3 筆實績")).toBeTruthy();
    expect(screen.getByText("最近 5 筆實績")).toBeTruthy();
  });

  it("切換到 00A（空資料）時顯示「此類別目前沒有啟用的條目」", () => {
    render(createElement(KBInsertDialog, { onInsert: vi.fn() }));
    openDialog();
    // 00A = [] 且 hydrated=true → 空清單訊息
    fireEvent.click(screen.getByText(/00A/));
    expect(screen.getByText("此類別目前沒有啟用的條目")).toBeTruthy();
  });
});
