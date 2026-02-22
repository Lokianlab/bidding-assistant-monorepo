import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── mock useLogger ─────────────────────────────────────────

const mockClear = vi.fn();
const mockExportJson = vi.fn(() => '[]');
let mockEntries: Array<{
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  details?: string;
  source?: string;
}> = [];

vi.mock("@/lib/logger/useLogger", () => ({
  useLogger: () => ({
    entries: mockEntries,
    log: vi.fn(),
    clear: mockClear,
    exportJson: mockExportJson,
  }),
  default: () => ({
    entries: mockEntries,
    log: vi.fn(),
    clear: mockClear,
    exportJson: mockExportJson,
  }),
}));

// ── Radix Select 需要 scrollIntoView ─────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  mockEntries = [];
  mockClear.mockClear();
  mockExportJson.mockClear();
});

async function getDebugLogPanel() {
  const mod = await import("../DebugLogPanel");
  return mod.DebugLogPanel;
}

// ── 空狀態 ─────────────────────────────────────────────────

describe("DebugLogPanel — 空狀態", () => {
  it("顯示「除錯日誌」標題", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("除錯日誌")).toBeTruthy();
  });

  it("無日誌時顯示「目前沒有日誌紀錄」", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("目前沒有日誌紀錄")).toBeTruthy();
  });

  it("badge 顯示「0 筆」", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("0 筆")).toBeTruthy();
  });
});

// ── 有日誌 ─────────────────────────────────────────────────

describe("DebugLogPanel — 有日誌", () => {
  it("顯示日誌訊息", async () => {
    mockEntries = [
      {
        id: "1",
        timestamp: "2026-02-22T10:00:00.000Z",
        level: "info",
        category: "api",
        message: "API 呼叫成功",
      },
    ];
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("API 呼叫成功")).toBeTruthy();
  });

  it("badge 顯示正確筆數", async () => {
    mockEntries = [
      { id: "1", timestamp: "2026-02-22T10:00:00.000Z", level: "info", category: "api", message: "訊息1" },
      { id: "2", timestamp: "2026-02-22T10:01:00.000Z", level: "warn", category: "cache", message: "訊息2" },
    ];
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("2 筆")).toBeTruthy();
  });

  it("顯示 level badge", async () => {
    mockEntries = [
      { id: "1", timestamp: "2026-02-22T10:00:00.000Z", level: "error", category: "api", message: "錯誤訊息" },
    ];
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("error")).toBeTruthy();
  });

  it("顯示 category badge", async () => {
    mockEntries = [
      { id: "1", timestamp: "2026-02-22T10:00:00.000Z", level: "info", category: "settings", message: "設定更新" },
    ];
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("settings")).toBeTruthy();
  });
});

// ── 動作 ───────────────────────────────────────────────────

describe("DebugLogPanel — 動作", () => {
  it("點擊「清除日誌」→ 再次點擊「確認清除？」呼叫 clear()", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    const clearBtn = screen.getByText("清除日誌");
    // 第一次點擊：切換為「確認清除？」
    fireEvent.click(clearBtn);
    expect(screen.getByText("確認清除？")).toBeTruthy();
    // 第二次點擊：呼叫 clear
    fireEvent.click(screen.getByText("確認清除？"));
    expect(mockClear).toHaveBeenCalled();
  });

  it("顯示「匯出 JSON」按鈕", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    render(createElement(DebugLogPanel, {}));
    expect(screen.getByText("匯出 JSON")).toBeTruthy();
  });

  it("顯示搜尋輸入框", async () => {
    const DebugLogPanel = await getDebugLogPanel();
    const { container } = render(createElement(DebugLogPanel, {}));
    const input = container.querySelector("input[placeholder='搜尋關鍵字...']");
    expect(input).toBeTruthy();
  });
});
