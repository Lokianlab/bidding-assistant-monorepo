import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { SmugMugPhotoPicker } from "../SmugMugPhotoPicker";

// ── Radix Dialog 需要 scrollIntoView ──────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── mock useSettings ───────────────────────────────────────

const mockSmugmug = {
  apiKey: "",
  apiSecret: "",
  accessToken: "",
  tokenSecret: "",
  nickname: "",
};

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { connections: { smugmug: mockSmugmug } },
    updateSettings: vi.fn(),
  }),
}));

// ── 基本 props ────────────────────────────────────────────

const baseProps = {
  selected: [],
  onChange: vi.fn(),
};

// ── 未配置狀態 ─────────────────────────────────────────────

describe("SmugMugPhotoPicker — 未配置", () => {
  beforeEach(() => {
    mockSmugmug.apiKey = "";
    mockSmugmug.accessToken = "";
  });

  it("顯示「尚未設定 SmugMug 連線」提示", () => {
    render(createElement(SmugMugPhotoPicker, baseProps));
    expect(screen.getByText(/尚未設定 SmugMug 連線/)).toBeTruthy();
  });

  it("顯示設定連結（href=/settings/connections）", () => {
    render(createElement(SmugMugPhotoPicker, baseProps));
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/settings/connections");
  });
});

// ── 已配置狀態 ─────────────────────────────────────────────

describe("SmugMugPhotoPicker — 已配置", () => {
  beforeEach(() => {
    mockSmugmug.apiKey = "test-api-key";
    mockSmugmug.accessToken = "test-access-token";
    // fetch 會被呼叫但測試不驗證 API 結果
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, albums: [] }),
    });
  });

  it("顯示「從 SmugMug 選取照片」按鈕", () => {
    render(createElement(SmugMugPhotoPicker, baseProps));
    expect(screen.getByText(/從 SmugMug 選取照片/)).toBeTruthy();
  });

  it("無選取照片時按鈕不顯示數量", () => {
    render(createElement(SmugMugPhotoPicker, { ...baseProps, selected: [] }));
    const btn = screen.getByText(/從 SmugMug 選取照片/);
    expect(btn.textContent).not.toContain("(");
  });

  it("有選取照片時按鈕顯示數量", () => {
    const selected = [
      { imageKey: "k1", title: "照片1", caption: "", thumbnailUrl: "", webUrl: "", largeUrl: "" },
      { imageKey: "k2", title: "照片2", caption: "", thumbnailUrl: "", webUrl: "", largeUrl: "" },
    ];
    render(createElement(SmugMugPhotoPicker, { ...baseProps, selected }));
    expect(screen.getByText(/從 SmugMug 選取照片 \(2\)/)).toBeTruthy();
  });

  it("點擊按鈕開啟對話框（顯示「從 SmugMug 選取實績照片」）", () => {
    render(createElement(SmugMugPhotoPicker, baseProps));
    fireEvent.click(screen.getByText(/從 SmugMug 選取照片/));
    // Radix Dialog 渲染在 portal
    expect(document.querySelector("[role='dialog']")).toBeTruthy();
    expect(document.body.textContent).toContain("從 SmugMug 選取實績照片");
  });

  it("有選取照片時顯示預覽（無 thumbnailUrl 顯示 📷 emoji）", () => {
    const selected = [
      { imageKey: "k1", title: "照片1", caption: "", thumbnailUrl: "", webUrl: "", largeUrl: "" },
    ];
    render(createElement(SmugMugPhotoPicker, { ...baseProps, selected }));
    // 沒有 thumbnailUrl 時顯示 📷
    expect(screen.getAllByText("📷").length).toBeGreaterThan(0);
  });
});
