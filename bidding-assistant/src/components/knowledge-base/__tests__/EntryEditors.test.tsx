import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── mock useCustomOptions ─────────────────────────────────

vi.mock("@/lib/knowledge-base/useCustomOptions", () => ({
  useCustomOptions: () => ({
    getOptions: (_key: string) => [],
    addOption: vi.fn(),
    removeOption: vi.fn(),
  }),
}));

// ── mock SmugMugPhotoPicker（EntryEditor00B 依賴） ─────────

vi.mock("../SmugMugPhotoPicker", () => ({
  SmugMugPhotoPicker: () => null,
}));

// ── Radix UI scrollIntoView polyfill ──────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── 延遲 import（確保 mock 先生效） ─────────────────────────

async function getEditor00A() {
  const mod = await import("../EntryEditor00A");
  return mod.default;
}
async function getEditor00B() {
  const mod = await import("../EntryEditor00B");
  return mod.default;
}
async function getEditor00C() {
  const mod = await import("../EntryEditorGeneric");
  return mod.EntryEditor00C;
}
async function getEditor00D() {
  const mod = await import("../EntryEditorGeneric");
  return mod.EntryEditor00D;
}
async function getEditor00E() {
  const mod = await import("../EntryEditorGeneric");
  return mod.EntryEditor00E;
}

// ── EntryEditor00A ─────────────────────────────────────────

describe("EntryEditor00A", () => {
  it("渲染「姓名 *」欄位", async () => {
    const Editor = await getEditor00A();
    render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00A001",
    }));
    expect(screen.getByText(/姓名/)).toBeTruthy();
  });

  it("姓名為空時「新增」按鈕 disabled", async () => {
    const Editor = await getEditor00A();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00A001",
    }));
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("新增")
    );
    expect(saveBtn?.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const Editor = await getEditor00A();
    const onCancel = vi.fn();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel,
      nextId: "00A001",
    }));
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("取消")
    );
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });

  it("有 initial 時顯示「更新」按鈕", async () => {
    const Editor = await getEditor00A();
    render(createElement(Editor as React.ComponentType<object>, {
      initial: {
        id: "00A001",
        name: "王小明",
        title: "計畫主持人",
        status: "在職",
        authorizedRoles: [],
        education: [],
        certifications: [],
        experiences: [],
        projects: [],
        additionalCapabilities: "",
        entryStatus: "active",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00A002",
    }));
    expect(screen.getByText("更新")).toBeTruthy();
  });
});

// ── EntryEditor00B ─────────────────────────────────────────

describe("EntryEditor00B", () => {
  it("渲染「案名 *」欄位", async () => {
    const Editor = await getEditor00B();
    render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00B001",
    }));
    expect(screen.getByText(/案名/)).toBeTruthy();
  });

  it("案名為空時「新增」按鈕 disabled", async () => {
    const Editor = await getEditor00B();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00B001",
    }));
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("新增")
    );
    expect(saveBtn?.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const Editor = await getEditor00B();
    const onCancel = vi.fn();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel,
      nextId: "00B001",
    }));
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("取消")
    );
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });
});

// ── EntryEditor00C ─────────────────────────────────────────

describe("EntryEditor00C", () => {
  it("渲染「範本名稱 *」欄位", async () => {
    const Editor = await getEditor00C();
    render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00C001",
    }));
    expect(screen.getByText(/範本名稱/)).toBeTruthy();
  });

  it("範本名稱為空時「新增」按鈕 disabled", async () => {
    const Editor = await getEditor00C();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00C001",
    }));
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("新增")
    );
    expect(saveBtn?.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const Editor = await getEditor00C();
    const onCancel = vi.fn();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel,
      nextId: "00C001",
    }));
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("取消")
    );
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });
});

// ── EntryEditor00D ─────────────────────────────────────────

describe("EntryEditor00D", () => {
  it("渲染「風險名稱 *」欄位", async () => {
    const Editor = await getEditor00D();
    render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00D001",
    }));
    expect(screen.getByText(/風險名稱/)).toBeTruthy();
  });

  it("風險名稱為空時「新增」按鈕 disabled", async () => {
    const Editor = await getEditor00D();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00D001",
    }));
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("新增")
    );
    expect(saveBtn?.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const Editor = await getEditor00D();
    const onCancel = vi.fn();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel,
      nextId: "00D001",
    }));
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("取消")
    );
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });
});

// ── EntryEditor00E ─────────────────────────────────────────

describe("EntryEditor00E", () => {
  it("渲染「案名 *」欄位", async () => {
    const Editor = await getEditor00E();
    render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00E001",
    }));
    expect(screen.getByText(/案名/)).toBeTruthy();
  });

  it("案名為空時「新增」按鈕 disabled", async () => {
    const Editor = await getEditor00E();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      nextId: "00E001",
    }));
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("新增")
    );
    expect(saveBtn?.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const Editor = await getEditor00E();
    const onCancel = vi.fn();
    const { container } = render(createElement(Editor as React.ComponentType<object>, {
      onSave: vi.fn(),
      onCancel,
      nextId: "00E001",
    }));
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("取消")
    );
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });
});
