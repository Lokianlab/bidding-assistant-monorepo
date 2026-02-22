import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConnectionsPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks（在 vi.mock 工廠提升前初始化）─────────────
const { mockUpdateSection, mockToastSuccess } = vi.hoisted(() => ({
  mockUpdateSection: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  })),
}));

// ── Mock sonner ───────────────────────────────────────────
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

// ── fetch mock ───────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function settingsWithNotion(token: string, databaseId: string) {
  return {
    ...DEFAULT_SETTINGS,
    connections: {
      ...DEFAULT_SETTINGS.connections,
      notion: { token, databaseId },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("ConnectionsPage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<ConnectionsPage />);
    expect(screen.getByRole("heading", { name: "外部連線" })).toBeTruthy();
  });

  it("顯示 Notion 區塊", () => {
    render(<ConnectionsPage />);
    expect(screen.getByText("Notion")).toBeTruthy();
  });

  it("顯示 Google Drive 區塊", () => {
    render(<ConnectionsPage />);
    expect(screen.getByText("Google Drive")).toBeTruthy();
  });

  it("顯示 SmugMug 區塊", () => {
    render(<ConnectionsPage />);
    expect(screen.getByText("SmugMug（實績照片）")).toBeTruthy();
  });
});

describe("ConnectionsPage — 連線狀態 badge", () => {
  it("無 Notion 設定時顯示「未連線」", () => {
    render(<ConnectionsPage />);
    // 第一個 badge 是 Notion 的（預設無設定）
    const badges = screen.getAllByText("未連線");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("有 Notion 設定時 badge 顯示「已設定」", () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: settingsWithNotion("ntn_test", "db-123"),
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    render(<ConnectionsPage />);
    expect(screen.getByText("已設定")).toBeTruthy();
  });
});

describe("ConnectionsPage — Notion 表單互動", () => {
  it("可填入 Notion Token", () => {
    render(<ConnectionsPage />);
    const tokenInput = screen.getByLabelText("Integration Token（密鑰）") as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: "ntn_test_token" } });
    expect(tokenInput.value).toBe("ntn_test_token");
  });

  it("可填入 Database ID", () => {
    render(<ConnectionsPage />);
    const dbInput = screen.getByLabelText("Database ID（資料庫 ID）") as HTMLInputElement;
    fireEvent.change(dbInput, { target: { value: "db-abc-123" } });
    expect(dbInput.value).toBe("db-abc-123");
  });

  it("無 token 時「測試連線」按鈕 disabled", () => {
    render(<ConnectionsPage />);
    // 找第一個測試連線按鈕（Notion）
    const testBtns = screen.getAllByText("測試連線");
    expect((testBtns[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("有 token 和 databaseId 時「測試連線」按鈕 enabled", () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: settingsWithNotion("ntn_token", "db-123"),
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    render(<ConnectionsPage />);
    const testBtns = screen.getAllByText("測試連線");
    expect((testBtns[0] as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("ConnectionsPage — Notion 測試連線", () => {
  it("測試成功顯示 OK 訊息", async () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: settingsWithNotion("ntn_token", "db-123"),
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ schema: { 標案名稱: { type: "title" } }, title: "標案追蹤" }),
    });

    render(<ConnectionsPage />);
    const testBtns = screen.getAllByText("測試連線");
    fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/連線成功！資料庫「標案追蹤」/)).toBeTruthy();
    });
  });

  it("測試失敗（token 無效）顯示錯誤訊息", async () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: settingsWithNotion("bad_token", "db-123"),
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "token is invalid" }),
    });

    render(<ConnectionsPage />);
    const testBtns = screen.getAllByText("測試連線");
    fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Token 無效！/)).toBeTruthy();
    });
  });

  it("網路錯誤顯示「網路錯誤」訊息", async () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: settingsWithNotion("ntn_token", "db-123"),
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    mockFetch.mockRejectedValueOnce(new Error("network error"));

    render(<ConnectionsPage />);
    const testBtns = screen.getAllByText("測試連線");

    fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/網路錯誤，請確認伺服器正在運行/)).toBeTruthy();
    });
  });
});

describe("ConnectionsPage — SmugMug 測試連線", () => {
  it("缺少欄位時顯示驗證錯誤（不呼叫 fetch）", () => {
    render(<ConnectionsPage />);
    // SmugMug 的測試按鈕（第二個）
    const smugmugTestBtn = screen.getAllByText("測試連線")[1];
    // 欄位都空時按鈕應 disabled
    expect((smugmugTestBtn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("ConnectionsPage — 儲存與取消", () => {
  it("點儲存呼叫 updateSection('connections', ...)", () => {
    render(<ConnectionsPage />);
    fireEvent.click(screen.getByText("儲存連線設定"));
    expect(mockUpdateSection).toHaveBeenCalledTimes(1);
    expect(mockUpdateSection).toHaveBeenCalledWith(
      "connections",
      expect.objectContaining({
        notion: expect.any(Object),
        googleDrive: expect.any(Object),
        smugmug: expect.any(Object),
      })
    );
  });

  it("點儲存顯示成功 toast", () => {
    render(<ConnectionsPage />);
    fireEvent.click(screen.getByText("儲存連線設定"));
    expect(mockToastSuccess).toHaveBeenCalledWith("連線設定已儲存");
  });

  it("修改 token 後點儲存傳送更新後的 notion 設定", () => {
    render(<ConnectionsPage />);
    const tokenInput = screen.getByLabelText("Integration Token（密鑰）");
    fireEvent.change(tokenInput, { target: { value: "ntn_new_token" } });
    fireEvent.click(screen.getByText("儲存連線設定"));

    expect(mockUpdateSection).toHaveBeenCalledWith(
      "connections",
      expect.objectContaining({
        notion: expect.objectContaining({ token: "ntn_new_token" }),
      })
    );
  });

  it("點取消還原輸入框到設定值", () => {
    render(<ConnectionsPage />);
    const tokenInput = screen.getByLabelText("Integration Token（密鑰）") as HTMLInputElement;
    fireEvent.change(tokenInput, { target: { value: "臨時 token" } });
    expect(tokenInput.value).toBe("臨時 token");

    fireEvent.click(screen.getByText("取消"));
    expect(tokenInput.value).toBe(""); // DEFAULT_SETTINGS 的 token 是空字串
  });

  it("點取消不呼叫 updateSection", () => {
    render(<ConnectionsPage />);
    fireEvent.click(screen.getByText("取消"));
    expect(mockUpdateSection).not.toHaveBeenCalled();
  });
});
