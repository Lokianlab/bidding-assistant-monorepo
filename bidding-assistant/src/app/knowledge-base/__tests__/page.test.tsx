import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KnowledgeBasePage from "../page";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";

// ── Mock useKnowledgeBase ─────────────────────────────────
const mockKb = {
  data: { "00A": [], "00B": [], "00C": [], "00D": [], "00E": [], lastUpdated: "", version: 1 },
  hydrated: true,
  addEntry00A: vi.fn(),
  addEntry00B: vi.fn(),
  addEntry00C: vi.fn(),
  addEntry00D: vi.fn(),
  addEntry00E: vi.fn(),
  updateEntry00A: vi.fn(),
  updateEntry00B: vi.fn(),
  updateEntry00C: vi.fn(),
  updateEntry00D: vi.fn(),
  updateEntry00E: vi.fn(),
  deleteEntry: vi.fn(),
  updateEntryStatus: vi.fn(),
  exportData: vi.fn(() => ({})),
  importData: vi.fn(),
  clearAll: vi.fn(),
} as unknown as ReturnType<typeof useKnowledgeBase>;

vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: vi.fn(() => mockKb),
}));

// ── Mock Radix UI Tabs ────────────────────────────────────
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

// ── Mock Dialog / AlertDialog（避免 Portal 問題）──────────
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/knowledge-base/EntryEditor00A", () => ({
  default: () => <div data-testid="editor-00a">編輯器 00A</div>,
}));

vi.mock("@/components/knowledge-base/EntryEditor00B", () => ({
  default: () => <div data-testid="editor-00b">編輯器 00B</div>,
}));

vi.mock("@/components/knowledge-base/EntryEditorGeneric", () => ({
  EntryEditor00C: () => <div data-testid="editor-00c">編輯器 00C</div>,
  EntryEditor00D: () => <div data-testid="editor-00d">編輯器 00D</div>,
  EntryEditor00E: () => <div data-testid="editor-00e">編輯器 00E</div>,
}));

// ── Mock sonner ────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // 每次測試前確保 hydrated=true（避免前一個測試設定的 mockReturnValue 污染）
  vi.mocked(useKnowledgeBase).mockReturnValue(mockKb);
});

// ── Tests ─────────────────────────────────────────────────

describe("KnowledgeBasePage — 未水合", () => {
  it("hydrated=false 時顯示「載入中...」", () => {
    vi.mocked(useKnowledgeBase).mockReturnValue({ ...mockKb, hydrated: false });
    render(<KnowledgeBasePage />);
    expect(screen.getByText("載入中...")).toBeTruthy();
  });
});

describe("KnowledgeBasePage — 渲染", () => {
  it("顯示頁面標題「知識庫管理」", () => {
    render(<KnowledgeBasePage />);
    expect(screen.getByRole("heading", { name: "知識庫管理" })).toBeTruthy();
  });

  it("顯示「匯入」和「匯出」按鈕", () => {
    render(<KnowledgeBasePage />);
    expect(screen.getByRole("button", { name: "匯入" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "匯出" })).toBeTruthy();
  });

  it("顯示「新增資料」按鈕", () => {
    render(<KnowledgeBasePage />);
    expect(screen.getByRole("button", { name: "新增資料" })).toBeTruthy();
  });

  it("顯示搜尋輸入框", () => {
    render(<KnowledgeBasePage />);
    expect(screen.getByPlaceholderText("搜尋知識庫...")).toBeTruthy();
  });

  it("顯示五個知識庫統計卡片", () => {
    render(<KnowledgeBasePage />);
    // KB_CATEGORIES 有 00A-00E 五個
    const activeLabels = screen.getAllByText("啟用");
    expect(activeLabels.length).toBe(5);
  });

  it("顯示「尚無資料」提示（空知識庫）", () => {
    render(<KnowledgeBasePage />);
    expect(screen.getAllByText("尚無資料").length).toBeGreaterThan(0);
  });
});

describe("KnowledgeBasePage — 互動", () => {
  it("點「新增資料」後開啟 Dialog", () => {
    render(<KnowledgeBasePage />);
    fireEvent.click(screen.getByRole("button", { name: "新增資料" }));
    expect(screen.getByTestId("dialog")).toBeTruthy();
  });
});
