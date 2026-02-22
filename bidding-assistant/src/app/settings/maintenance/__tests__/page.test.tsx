import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MaintenancePage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks（在 vi.mock 工廠提升前初始化）─────────────
const { mockResetSettings, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockResetSettings: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    resetSettings: mockResetSettings,
  })),
}));

// ── Mock sonner ───────────────────────────────────────────
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

// ── Mock sub-components（避免 ChangelogPanel/DebugLogPanel 複雜依賴）──
vi.mock("@/components/settings/ChangelogPanel", () => ({
  ChangelogPanel: () => <div data-testid="changelog-panel">更新日誌</div>,
}));
vi.mock("@/components/settings/DebugLogPanel", () => ({
  DebugLogPanel: () => <div data-testid="debug-log-panel">除錯日誌</div>,
}));

// ── URL API mocks ─────────────────────────────────────────
const mockCreateObjectURL = vi.fn(() => "blob:test-url");
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    resetSettings: mockResetSettings,
  } as unknown as ReturnType<typeof useSettings>);

  URL.createObjectURL = mockCreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL;

  localStorage.clear();
});

// ── Tests ─────────────────────────────────────────────────

describe("MaintenancePage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<MaintenancePage />);
    expect(screen.getByRole("heading", { name: "系統維護" })).toBeTruthy();
  });

  it("顯示系統維護、更新日誌、除錯日誌三個 tab", () => {
    render(<MaintenancePage />);
    expect(screen.getByRole("tab", { name: "系統維護" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "更新日誌" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "除錯日誌" })).toBeTruthy();
  });

  it("預設顯示系統維護 tab 內容（設定備份）", () => {
    render(<MaintenancePage />);
    expect(screen.getByText("設定備份")).toBeTruthy();
  });
});

describe("MaintenancePage — 匯出設定", () => {
  it("點匯出設定觸發 blob URL 創建", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("匯出設定（JSON）"));
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  });

  it("匯出後撤銷 blob URL（防記憶體洩漏）", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("匯出設定（JSON）"));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("點匯出顯示成功 toast", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("匯出設定（JSON）"));
    expect(mockToastSuccess).toHaveBeenCalledWith("設定已匯出");
  });
});

describe("MaintenancePage — 還原預設設定（二步確認）", () => {
  it("初始按鈕文字為「還原預設設定」", () => {
    render(<MaintenancePage />);
    expect(screen.getByText("還原預設設定")).toBeTruthy();
  });

  it("第一次點擊：按鈕文字改為「確認還原？再按一次」，不呼叫 resetSettings", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("還原預設設定"));
    expect(screen.getByText("確認還原？再按一次")).toBeTruthy();
    expect(mockResetSettings).not.toHaveBeenCalled();
  });

  it("第二次點擊：呼叫 resetSettings 並顯示成功 toast", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("還原預設設定"));
    fireEvent.click(screen.getByText("確認還原？再按一次"));
    expect(mockResetSettings).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith("已還原為預設值");
  });

  it("第二次點擊後按鈕文字回到「還原預設設定」", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("還原預設設定"));
    fireEvent.click(screen.getByText("確認還原？再按一次"));
    expect(screen.getByText("還原預設設定")).toBeTruthy();
  });
});

describe("MaintenancePage — 清除快取", () => {
  it("清除所有 bidding-assistant 開頭的 localStorage 項目", () => {
    localStorage.setItem("bidding-assistant-settings", JSON.stringify({ test: 1 }));
    localStorage.setItem("bidding-assistant-cache", "some-data");
    localStorage.setItem("other-key", "should-stay");

    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("清除快取"));

    expect(localStorage.getItem("bidding-assistant-settings")).toBeNull();
    expect(localStorage.getItem("bidding-assistant-cache")).toBeNull();
    expect(localStorage.getItem("other-key")).toBe("should-stay");
  });

  it("清除快取後顯示清除數量的 toast", () => {
    localStorage.setItem("bidding-assistant-settings", "{}");
    localStorage.setItem("bidding-assistant-other", "data");

    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("清除快取"));

    expect(mockToastSuccess).toHaveBeenCalledWith("已清除 2 個快取項目");
  });

  it("無快取項目時清除 0 個", () => {
    render(<MaintenancePage />);
    fireEvent.click(screen.getByText("清除快取"));
    expect(mockToastSuccess).toHaveBeenCalledWith("已清除 0 個快取項目");
  });
});
