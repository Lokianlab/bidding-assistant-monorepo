import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AssemblyPage from "../page";

// ── Hoisted mocks ─────────────────────────────────────
const { mockPush, mockSearchGet } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSearchGet: vi.fn((_key: string): string | null => null),
}));

// ── Mock next/navigation ──────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchGet }),
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock assembly helpers（控制 activeFiles 為空，避免 loadFile fetch） ──
vi.mock("@/lib/assembly/helpers", () => ({
  estimateTokens: vi.fn(() => 0),
  formatKB: vi.fn(() => "0 B"),
  buildFilename: vi.fn(() => "file.md"),
  computeFileList: vi.fn(() => []),
  computeActiveFiles: vi.fn(() => []),
  assembleContent: vi.fn(() => "組裝後的提示詞內容"),
}));

// ── Mock sonner ───────────────────────────────────────
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Mock Sidebar ──────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock useKnowledgeBase ─────────────────────────────
// 必須使用穩定物件參考：assembly page 有 useEffect([kbData, kbHydrated])，
// 若每次渲染回傳新物件會觸發無限重渲染循環導致 OOM 崩潰
const stableKbData = { "00A": [], "00B": [], "00C": [], "00D": [], "00E": [] };
const stableKbResult = { data: stableKbData, hydrated: true };

vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: vi.fn(() => stableKbResult),
}));

// ── Mock renderKBToMarkdown ───────────────────────────
vi.mock("@/lib/knowledge-base/helpers", () => ({
  renderKBToMarkdown: vi.fn(() => ""),
}));

const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchGet.mockReturnValue(null);
  mockClipboardWrite.mockResolvedValue(undefined);
  // Object.assign 在 jsdom 中對 read-only getter 會 silently fail；
  // 用 Object.defineProperty 確保覆蓋成功
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockClipboardWrite },
    writable: true,
    configurable: true,
  });
});

// ── Tests ─────────────────────────────────────────────

describe("AssemblyPage — 基本渲染", () => {
  it("顯示「提示詞組裝引擎」標題", () => {
    render(<AssemblyPage />);
    expect(
      screen.getByRole("heading", { name: "提示詞組裝引擎" }),
    ).toBeTruthy();
  });

  it("顯示副標說明文字", () => {
    render(<AssemblyPage />);
    expect(
      screen.getByText(/選擇階段.*自動選取.*一鍵複製到 Claude/),
    ).toBeTruthy();
  });

  it("顯示 MobileMenuButton", () => {
    render(<AssemblyPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("顯示「選擇階段」卡片標題", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("選擇階段")).toBeTruthy();
  });

  it("顯示「投標階段」分組標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("投標階段")).toBeTruthy();
  });

  it("顯示「評選階段」分組標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("評選階段")).toBeTruthy();
  });

  it("顯示「案件唯一碼（選填）」標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("案件唯一碼（選填）")).toBeTruthy();
  });

  it("顯示「組裝提示詞」按鈕", () => {
    render(<AssemblyPage />);
    expect(screen.getByRole("button", { name: /組裝提示詞/ })).toBeTruthy();
  });

  it("顯示「使用方式」提示卡", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("使用方式")).toBeTruthy();
  });

  it("無 caseName 時不顯示評分 badge", () => {
    render(<AssemblyPage />);
    expect(screen.queryByText(/建議投標|值得評估|不建議/)).toBeNull();
  });
});

describe("AssemblyPage — 案件上下文 banner", () => {
  it("caseName 存在時顯示案件名稱", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "測試標案名稱";
      return null;
    });
    render(<AssemblyPage />);
    expect(screen.getByText("測試標案名稱")).toBeTruthy();
  });

  it("verdict 和 total 存在時顯示評分 badge", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "某標案";
      if (key === "verdict") return "建議投標";
      if (key === "total") return "82";
      return null;
    });
    render(<AssemblyPage />);
    expect(screen.getByText("建議投標 82/100")).toBeTruthy();
  });
});

// ── 輔助：渲染並觸發組裝（showResult → true） ─────────
async function renderAndAssemble() {
  render(<AssemblyPage />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /組裝提示詞/ }));
  });
}

// React 18 concurrent mode + jsdom 的 act() flush 在高負載下需要較長時間
// 加 timeout: 15000 防止全 suite 跑時因系統負載超過預設 5s 上限
describe("AssemblyPage — GAP-2：複製並前往品質檢查", { timeout: 15000 }, () => {
  it("組裝後顯示「複製並前往品質檢查」按鈕", async () => {
    await renderAndAssemble();
    expect(
      screen.getByRole("button", { name: "複製並前往品質檢查" }),
    ).toBeTruthy();
  });

  it("無 caseId 時點按鈕仍導航至品質檢查（不帶 caseId param）", async () => {
    mockSearchGet.mockReturnValue(null);
    await renderAndAssemble();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "複製並前往品質檢查" }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith("/tools/quality-gate?");
  });

  it("有 caseId 時導航帶 caseId param", async () => {
    mockSearchGet.mockImplementation((key: string) =>
      key === "caseId" ? "abc-123" : null,
    );
    await renderAndAssemble();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "複製並前往品質檢查" }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/tools/quality-gate?caseId=abc-123",
    );
  });

  it("有 caseId+caseName 時導航帶兩個 params", async () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseId") return "abc-123";
      if (key === "caseName") return "某某音樂節目";
      return null;
    });
    await renderAndAssemble();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "複製並前往品質檢查" }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/tools/quality-gate?caseId=abc-123&caseName=%E6%9F%90%E6%9F%90%E9%9F%B3%E6%A8%82%E7%AF%80%E7%9B%AE",
    );
  });

  it("點按鈕時複製組裝內容到剪貼簿", async () => {
    await renderAndAssemble();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "複製並前往品質檢查" }),
      );
    });
    expect(mockClipboardWrite).toHaveBeenCalledWith("組裝後的提示詞內容");
  });
});
