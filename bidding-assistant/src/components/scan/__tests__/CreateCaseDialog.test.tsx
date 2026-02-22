import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateCaseDialog } from "../CreateCaseDialog";
import type { ScanResult } from "@/lib/scan/types";

// mock settings context
const mockUseSettings = vi.fn();
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => mockUseSettings(),
}));

// mock usePatrolOrchestrator
const mockAccept = vi.fn();
const mockReset = vi.fn();
const mockUseOrchestrator = vi.fn();
vi.mock("@/lib/patrol", () => ({
  usePatrolOrchestrator: () => mockUseOrchestrator(),
}));

function makeSettings(withCredentials = true) {
  return {
    settings: {
      connections: {
        notion: withCredentials
          ? { token: "ntn_test", databaseId: "db-123", lastSync: "" }
          : { token: "", databaseId: "", lastSync: "" },
        googleDrive: { refreshToken: "", sharedDriveFolderId: "" },
        smugmug: { apiKey: "", apiSecret: "", accessToken: "", tokenSecret: "" },
      },
    },
    hydrated: true,
  };
}

function makeOrchestrator(overrides: Record<string, unknown> = {}) {
  return {
    accepting: false,
    error: null as string | null,
    accept: mockAccept,
    reset: mockReset,
    ...overrides,
  };
}

const MOCK_RESULT: ScanResult = {
  tender: {
    title: "食農教育推廣計畫",
    unit: "新北市教育局",
    jobNumber: "TEST-001",
    budget: 0,
    deadline: "",
    publishDate: "20260226",
    url: "https://pcc.gov.tw/test",
    category: "勞務",
  },
  classification: {
    category: "must",
    matchedKeywords: ["食農", "教育"],
    matchedLabel: "食農教育",
  },
};

describe("CreateCaseDialog", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettings.mockReturnValue(makeSettings(true));
    mockUseOrchestrator.mockReturnValue(makeOrchestrator());
  });

  it("result=null 時不渲染", () => {
    render(
      <CreateCaseDialog result={null} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.queryByText("建立追蹤案件")).toBeNull();
  });

  it("open=false 時不顯示對話框", () => {
    render(
      <CreateCaseDialog result={MOCK_RESULT} open={false} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.queryByText("建立追蹤案件")).toBeNull();
  });

  it("顯示標案名稱、機關、案號", () => {
    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.getByText("食農教育推廣計畫")).toBeTruthy();
    expect(screen.getByText("新北市教育局")).toBeTruthy();
    expect(screen.getByText("TEST-001")).toBeTruthy();
  });

  it("must 分類顯示 ⭐ 推薦", () => {
    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.getByText("⭐ 推薦")).toBeTruthy();
  });

  it("review 分類顯示 🔍 需要看", () => {
    const reviewResult: ScanResult = {
      ...MOCK_RESULT,
      classification: { ...MOCK_RESULT.classification, category: "review" },
    };
    render(
      <CreateCaseDialog result={reviewResult} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.getByText("🔍 需要看")).toBeTruthy();
  });

  it("點取消呼叫 onClose", () => {
    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("有憑證時「建案到 Notion」按鈕為 enabled", () => {
    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    const btn = screen.getByRole("button", { name: /建案到 Notion/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("建案成功 → 呼叫 onSuccess 帶 notion url（去掉連字號）", async () => {
    mockAccept.mockResolvedValueOnce({
      notion: { success: true, notionPageId: "abc-123-def-456", caseUniqueId: "PCC-001" },
      drive: { success: false, error: "Drive 未設定" },
      summary: "",
      intelligence: "",
    });

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("https://www.notion.so/abc123def456");
    });
    expect(mockAccept).toHaveBeenCalledWith(MOCK_RESULT);
  });

  it("建案失敗（notion.success=false）→ 不呼叫 onSuccess", async () => {
    mockAccept.mockResolvedValueOnce({
      notion: { success: false, error: "Token 無效" },
      drive: { success: false, error: "" },
      summary: "",
      intelligence: "",
    });

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledOnce();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("hook.error 有值 → 顯示錯誤訊息", () => {
    mockUseOrchestrator.mockReturnValue(makeOrchestrator({ error: "Token 無效" }));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.getByText("Token 無效")).toBeTruthy();
  });

  it("accepting=true → 按鈕文字改為「建案中...」且 disabled", () => {
    mockUseOrchestrator.mockReturnValue(makeOrchestrator({ accepting: true }));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    expect(screen.getByText("建案中...")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "建案中..." }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("無憑證時「建案到 Notion」按鈕 disabled 且顯示設定提示", () => {
    mockUseSettings.mockReturnValue(makeSettings(false));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    const btn = screen.getByRole("button", { name: /建案到 Notion/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/請先至設定頁面填入 Notion Token/)).toBeTruthy();
  });
});
