import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CaseBoardPage from "../page";

// ── Mock useSettings ─────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: {
      connections: { notion: { token: "", databaseId: "" } },
    },
    hydrated: true,
  })),
}));

// ── Mock logger ──────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock dashboard helpers ───────────────────────────
vi.mock("@/lib/dashboard/helpers", () => ({
  loadCache: vi.fn(() => null),
  saveCache: vi.fn(),
}));

// ── Mock case-board helpers ──────────────────────────
vi.mock("@/lib/case-board/helpers", () => ({
  applyBoardFilters: vi.fn((pages: unknown[]) => pages),
}));

// ── Mock dashboard types ─────────────────────────────
vi.mock("@/lib/dashboard/types", () => ({
  F: {
    名稱: "名稱",
    進程: "進程",
    決策: "決策",
    截標: "截標",
    預算: "預算",
    招標機關: "招標機關",
    投遞序位: "投遞序位",
    確定協作: "確定協作",
  },
  BOARD_COLUMNS_ORDER: ["備標中", "投標完成"],
}));

// ── Mock next/link ───────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock Notion fields ───────────────────────────────
vi.mock("@/lib/constants/notion-fields", () => ({
  FIELDS_DASHBOARD: [],
}));

// ── Mock UI 元件 ─────────────────────────────────────
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

// ── Mock 子元件 ──────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/dashboard/ProjectDetailSheet", () => ({
  ProjectDetailSheet: () => <div data-testid="detail-sheet" />,
}));

vi.mock("@/components/case-board/CaseKanbanView", () => ({
  CaseKanbanView: () => <div data-testid="kanban-view">看板視圖</div>,
}));

vi.mock("@/components/case-board/CaseListView", () => ({
  CaseListView: () => <div data-testid="list-view">列表視圖</div>,
}));

vi.mock("@/components/case-board/CaseCalendarView", () => ({
  CaseCalendarView: () => <div data-testid="calendar-view">行事曆視圖</div>,
}));

// ── Mock fetch ───────────────────────────────────────
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ pages: [], schema: {} }),
  }),
) as unknown as typeof fetch;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────

describe("CaseBoardPage — 渲染", () => {
  it("顯示頁面標題「案件看板」", () => {
    render(<CaseBoardPage />);
    expect(screen.getByRole("heading", { name: "案件看板" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<CaseBoardPage />);
    expect(screen.getByText("AI 輔助備標進度追蹤")).toBeTruthy();
  });

  it("顯示三個視圖切換按鈕", () => {
    render(<CaseBoardPage />);
    expect(screen.getByRole("button", { name: "看板" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "列表" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "行事曆" })).toBeTruthy();
  });

  it("顯示搜尋輸入框", () => {
    render(<CaseBoardPage />);
    expect(screen.getByPlaceholderText("搜尋案名或機關...")).toBeTruthy();
  });

  it("顯示「重新整理」按鈕", () => {
    render(<CaseBoardPage />);
    expect(screen.getByRole("button", { name: "重新整理" })).toBeTruthy();
  });

  it("預設顯示看板視圖", () => {
    render(<CaseBoardPage />);
    expect(screen.getByTestId("kanban-view")).toBeTruthy();
  });

  it("未連線時顯示「展示模式」徽章", () => {
    render(<CaseBoardPage />);
    expect(screen.getByText("展示模式")).toBeTruthy();
  });

  it("未連線時顯示模擬資料提示", () => {
    render(<CaseBoardPage />);
    expect(screen.getByText("目前顯示模擬資料。")).toBeTruthy();
  });

  it("顯示案件數量", () => {
    render(<CaseBoardPage />);
    // 模擬資料 3 件（mock 的 applyBoardFilters 回傳原始 3 筆 MOCK_PAGES）
    expect(screen.getByText(/件$/)).toBeTruthy();
  });

  it("渲染 MobileMenuButton", () => {
    render(<CaseBoardPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });
});

describe("CaseBoardPage — 互動", () => {
  it("點「列表」切換到列表視圖", () => {
    render(<CaseBoardPage />);
    fireEvent.click(screen.getByRole("button", { name: "列表" }));
    expect(screen.getByTestId("list-view")).toBeTruthy();
  });

  it("點「行事曆」切換到行事曆視圖", () => {
    render(<CaseBoardPage />);
    fireEvent.click(screen.getByRole("button", { name: "行事曆" }));
    expect(screen.getByTestId("calendar-view")).toBeTruthy();
  });

  it("搜尋輸入框可以輸入文字", () => {
    render(<CaseBoardPage />);
    const input = screen.getByPlaceholderText("搜尋案名或機關...");
    fireEvent.change(input, { target: { value: "台中" } });
    expect((input as HTMLInputElement).value).toBe("台中");
  });
});
