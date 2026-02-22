import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ── Radix Dialog 需要 scrollIntoView ─────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── mock sonner ───────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── mock react-markdown / remark-gfm ─────────────────────

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) =>
    createElement("div", { "data-testid": "markdown" }, children),
}));

vi.mock("remark-gfm", () => ({
  default: () => ({}),
}));

// ── mock global fetch ─────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  mockFetch.mockReset();
});

// ── Helper ──────────────────────────────────────────────────

const testFile = {
  id: "SYS-01",
  label: "系統角色定義",
  filename: "system/role.md",
  category: "system" as const,
  categoryLabel: "系統",
};

async function getToolFileDialog() {
  const mod = await import("../ToolFileDialog");
  return mod.ToolFileDialog;
}

// ── open=false ─────────────────────────────────────────────

describe("ToolFileDialog — open=false", () => {
  it("open=false 時 Dialog 不顯示", async () => {
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: false,
        onClose: vi.fn(),
      })
    );
    expect(screen.queryByText("系統角色定義")).toBeNull();
  });

  it("open=false 時不觸發 fetch", async () => {
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: false,
        onClose: vi.fn(),
      })
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── open=true，fetch 中 ────────────────────────────────────

describe("ToolFileDialog — open=true, 載入中", () => {
  it("open=true 時顯示「載入中...」", async () => {
    // 讓 fetch 永遠 pending
    mockFetch.mockReturnValue(new Promise(() => {}));
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("載入中...")).toBeTruthy();
  });

  it("顯示檔案標題和 ID badge", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("SYS-01")).toBeTruthy();
    expect(screen.getByText("系統角色定義")).toBeTruthy();
  });

  it("顯示 filename", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("system/role.md")).toBeTruthy();
  });
});

// ── fetch 失敗 ─────────────────────────────────────────────

describe("ToolFileDialog — fetch 失敗", () => {
  it("fetch 失敗時顯示「無法載入檔案內容」", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const ToolFileDialog = await getToolFileDialog();
    render(
      createElement(ToolFileDialog, {
        file: testFile,
        open: true,
        onClose: vi.fn(),
      })
    );
    // 等待 useEffect 完成
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("無法載入檔案內容")).toBeTruthy();
  });
});
