import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PromptsPage from "../page";

// ── Mock STAGES（提供穩定的測試資料）──────────────────────
vi.mock("@/data/config/stages", () => ({
  STAGES: [
    {
      id: "L1", name: "戰略分析", phase: "投標",
      triggerCommand: "/分析", description: "分析招標文件",
      promptFile: "stages/01.md", expectedOutput: "戰略分析報告",
      dialogTips: "",
    },
    {
      id: "L2", name: "備標規劃", phase: "投標",
      triggerCommand: "/規劃", description: "備標規劃書",
      promptFile: "stages/02.md", expectedOutput: "備標規劃書",
      dialogTips: "",
    },
    {
      id: "L3", name: "企劃草稿", phase: "投標",
      triggerCommand: "/企劃", description: "企劃稿",
      promptFile: "stages/03.md", expectedOutput: "企劃稿",
      dialogTips: "",
    },
  ],
}));

// ── Mock estimateTokens ──────────────────────────────────
vi.mock("@/lib/assembly/helpers", () => ({
  estimateTokens: vi.fn(() => 150),
}));

// ── Mock Radix UI Tabs（避免 lazy render 問題）────────────
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Hoisted mocks ─────────────────────────────────────────
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock sonner ────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ── Mock Sidebar ──────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock localStorage ─────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

// ── Tests ─────────────────────────────────────────────────

describe("PromptsPage — 渲染", () => {
  it("顯示頁面標題「提示詞編輯器」", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("heading", { name: "提示詞編輯器" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<PromptsPage />);
    expect(screen.getByText(/編輯各 AI 階段的 System Prompt/)).toBeTruthy();
  });

  it("顯示「儲存所有提示詞」按鈕", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: "儲存所有提示詞" })).toBeTruthy();
  });

  it("顯示「還原預設」按鈕", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: "還原預設" })).toBeTruthy();
  });

  it("顯示「新增階段」按鈕（全形加號前綴）", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("button", { name: /新增階段/ })).toBeTruthy();
  });

  it("顯示 L1 階段 ID（sidebar + card header badge）", () => {
    render(<PromptsPage />);
    expect(screen.getAllByText("L1").length).toBeGreaterThan(0);
  });

  it("顯示內容 Tab（System Prompt、User Prompt 範本、預覽）", () => {
    render(<PromptsPage />);
    expect(screen.getByRole("tab", { name: "System Prompt" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "User Prompt 範本" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "預覽" })).toBeTruthy();
  });

  it("顯示搜尋框", () => {
    render(<PromptsPage />);
    expect(screen.getByPlaceholderText("搜尋階段...")).toBeTruthy();
  });

  it("顯示 L1~L3 三個階段名稱", () => {
    render(<PromptsPage />);
    expect(screen.getAllByText("戰略分析").length).toBeGreaterThan(0);
    expect(screen.getByText("備標規劃")).toBeTruthy();
    expect(screen.getByText("企劃草稿")).toBeTruthy();
  });

  it("顯示預估 token 數", () => {
    render(<PromptsPage />);
    expect(screen.getByText(/~150 tokens/)).toBeTruthy();
  });

  it("顯示複製按鈕（每個階段一個）", () => {
    render(<PromptsPage />);
    const dupBtns = screen.getAllByTitle("複製此階段");
    expect(dupBtns.length).toBe(3);
  });
});

describe("PromptsPage — 互動", () => {
  it("點「儲存所有提示詞」後呼叫 localStorage.setItem 和 toast.success", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: "儲存所有提示詞" }));
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "bidding-assistant-prompts",
      expect.any(String),
    );
    expect(mockToast.success).toHaveBeenCalledWith("提示詞已儲存");
  });

  it("點「還原預設」後呼叫 toast.success", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: "還原預設" }));
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("已還原預設"),
    );
  });

  it("點「＋ 新增階段」後顯示新增表單", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: /新增階段/ }));
    expect(screen.getByPlaceholderText("階段 ID（如 L9）")).toBeTruthy();
    expect(screen.getByPlaceholderText("階段名稱")).toBeTruthy();
    expect(screen.getByRole("button", { name: "確定新增" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "取消" })).toBeTruthy();
  });

  it("新增表單按「取消」後回到按鈕狀態", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: /新增階段/ }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("button", { name: /新增階段/ })).toBeTruthy();
    expect(screen.queryByPlaceholderText("階段 ID（如 L9）")).toBeNull();
  });

  it("新增表單未填 ID 和名稱時按「確定新增」會呼叫 toast.error", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: /新增階段/ }));
    fireEvent.click(screen.getByRole("button", { name: "確定新增" }));
    expect(mockToast.error).toHaveBeenCalledWith("請填寫階段 ID 和名稱");
  });

  it("填入 ID 和名稱後成功新增自訂階段", () => {
    render(<PromptsPage />);
    fireEvent.click(screen.getByRole("button", { name: /新增階段/ }));
    fireEvent.change(screen.getByPlaceholderText("階段 ID（如 L9）"), {
      target: { value: "L9" },
    });
    fireEvent.change(screen.getByPlaceholderText("階段名稱"), {
      target: { value: "自訂階段" },
    });
    fireEvent.click(screen.getByRole("button", { name: "確定新增" }));
    expect(mockToast.success).toHaveBeenCalledWith("已新增階段「自訂階段」");
  });

  it("搜尋框輸入文字後過濾階段列表", () => {
    render(<PromptsPage />);
    fireEvent.change(screen.getByPlaceholderText("搜尋階段..."), {
      target: { value: "戰略" },
    });
    // L1 戰略分析仍顯示
    expect(screen.getAllByText("戰略分析").length).toBeGreaterThan(0);
    // L2 備標規劃應該被過濾掉
    expect(screen.queryByText("備標規劃")).toBeNull();
  });

  it("點複製按鈕後新增副本階段", () => {
    render(<PromptsPage />);
    const dupBtns = screen.getAllByTitle("複製此階段");
    fireEvent.click(dupBtns[0]); // 複製 L1
    expect(mockToast.success).toHaveBeenCalledWith("已複製「戰略分析」");
  });
});
