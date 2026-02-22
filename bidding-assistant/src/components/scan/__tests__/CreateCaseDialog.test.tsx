import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateCaseDialog } from "../CreateCaseDialog";
import type { ScanResult } from "@/lib/scan/types";

// mock settings context（有 Notion 憑證）
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: {
      connections: {
        notion: { token: "ntn_test", databaseId: "db-123", lastSync: "" },
        googleDrive: { refreshToken: "", sharedDriveFolderId: "" },
        smugmug: { apiKey: "", apiSecret: "", accessToken: "", tokenSecret: "" },
      },
    },
    hydrated: true,
  }),
}));

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
    score: 2,
  },
};

describe("CreateCaseDialog", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
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

  it("建案成功 → 呼叫 onSuccess 帶 url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pageId: "p-abc", url: "https://notion.so/p-abc" }),
    }));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("https://notion.so/p-abc");
    });
  });

  it("建案失敗 → 顯示錯誤訊息，不呼叫 onSuccess", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Token 無效" }),
    }));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(screen.getByText("Token 無效")).toBeTruthy();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("網路例外 → 顯示網路錯誤訊息", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Failed to fetch")));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(screen.getByText("網路錯誤，請稍後再試")).toBeTruthy();
    });
  });

  it("建案中按鈕文字改為「建案中...」且 disabled", async () => {
    // fetch 永不 resolve，保持 loading 狀態
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(
      <CreateCaseDialog result={MOCK_RESULT} open={true} onClose={onClose} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /建案到 Notion/ }));

    await waitFor(() => {
      expect(screen.getByText("建案中...")).toBeTruthy();
    });
    const btn = screen.getByRole("button", { name: "建案中..." }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
