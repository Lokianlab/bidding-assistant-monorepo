import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkflowPage from "../page";
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("WorkflowPage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("工作流程")).toBeTruthy();
  });

  it("顯示 AI 八階段設定區塊", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("AI 八階段設定")).toBeTruthy();
  });

  it("顯示自動狀態規則區塊", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("自動狀態規則")).toBeTruthy();
  });
});

describe("WorkflowPage — 階段列表", () => {
  it("顯示 L1 階段", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("L1")).toBeTruthy();
  });

  it("顯示 L8 階段（八階段全部渲染）", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("L8")).toBeTruthy();
  });

  it("顯示 L1 的觸發指令 /分析", () => {
    render(<WorkflowPage />);
    expect(screen.getByText("/分析")).toBeTruthy();
  });

  it("渲染所有 8 個階段 badge", () => {
    render(<WorkflowPage />);
    const { workflow } = DEFAULT_SETTINGS;
    workflow.stages.forEach((stage) => {
      expect(screen.getByText(stage.id)).toBeTruthy();
    });
  });
});

describe("WorkflowPage — 自動狀態規則", () => {
  it("渲染所有 autoStatusRules 的 trigger 欄", () => {
    render(<WorkflowPage />);
    const { autoStatusRules } = DEFAULT_SETTINGS.workflow;
    autoStatusRules.forEach((rule) => {
      expect(screen.getByText(rule.trigger)).toBeTruthy();
    });
  });

  it("每條規則都有 checkbox", () => {
    render(<WorkflowPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(DEFAULT_SETTINGS.workflow.autoStatusRules.length);
  });

  it("初始 checkbox 狀態符合 settings（預設全啟用）", () => {
    render(<WorkflowPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => {
      expect(cb.getAttribute("data-state")).toBe("checked");
    });
  });

  it("點擊 checkbox 可切換啟用狀態", () => {
    render(<WorkflowPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    const firstCheckbox = checkboxes[0];
    expect(firstCheckbox.getAttribute("data-state")).toBe("checked");
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox.getAttribute("data-state")).toBe("unchecked");
  });
});

describe("WorkflowPage — 儲存", () => {
  it("點儲存呼叫 updateSection('workflow', ...)", () => {
    render(<WorkflowPage />);
    fireEvent.click(screen.getByText("儲存工作流程"));
    expect(mockUpdateSection).toHaveBeenCalledTimes(1);
    expect(mockUpdateSection).toHaveBeenCalledWith("workflow", DEFAULT_SETTINGS.workflow);
  });

  it("點儲存顯示成功 toast", () => {
    render(<WorkflowPage />);
    fireEvent.click(screen.getByText("儲存工作流程"));
    expect(mockToastSuccess).toHaveBeenCalledWith("工作流程設定已儲存");
  });

  it("checkbox 切換後點儲存傳送更新後的 workflow", () => {
    render(<WorkflowPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByText("儲存工作流程"));

    expect(mockUpdateSection).toHaveBeenCalledWith(
      "workflow",
      expect.objectContaining({
        autoStatusRules: expect.arrayContaining([
          expect.objectContaining({ id: "l1-complete", enabled: false }),
        ]),
      })
    );
  });
});

describe("WorkflowPage — 取消", () => {
  it("點取消不呼叫 updateSection", () => {
    render(<WorkflowPage />);
    fireEvent.click(screen.getByText("取消"));
    expect(mockUpdateSection).not.toHaveBeenCalled();
  });

  it("點取消還原 checkbox 狀態", () => {
    render(<WorkflowPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].getAttribute("data-state")).toBe("unchecked");
    fireEvent.click(screen.getByText("取消"));
    expect(checkboxes[0].getAttribute("data-state")).toBe("checked");
  });
});
