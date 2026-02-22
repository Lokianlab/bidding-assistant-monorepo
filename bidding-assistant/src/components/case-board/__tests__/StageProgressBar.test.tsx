import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { StageProgressBar } from "../StageProgressBar";
import type { CaseStageProgress } from "@/lib/case-board/types";

// ── Helpers ────────────────────────────────────────────────

function makeStage(stageId: string, status: CaseStageProgress["status"]): CaseStageProgress {
  return { stageId, status };
}

// ── 基本顯示（非編輯模式）─────────────────────────────────

describe("StageProgressBar — 非編輯模式", () => {
  it("每個階段渲染一個色塊 div", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [
          makeStage("L1", "completed"),
          makeStage("L2", "in-progress"),
          makeStage("L3", "not-started"),
        ],
        editable: false,
      })
    );
    // 非編輯模式下，每個階段是一個 div（無 Popover）
    const colorBlocks = container.querySelectorAll('div[title]');
    expect(colorBlocks.length).toBe(3);
  });

  it("completed 狀態的 div 有 bg-green-500 class", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L1", "completed")],
        editable: false,
      })
    );
    expect(container.querySelector(".bg-green-500")).toBeTruthy();
  });

  it("in-progress 狀態的 div 有 bg-blue-500 class", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L2", "in-progress")],
        editable: false,
      })
    );
    expect(container.querySelector(".bg-blue-500")).toBeTruthy();
  });

  it("not-started 狀態的 div 有 bg-gray-200 class", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L3", "not-started")],
        editable: false,
      })
    );
    expect(container.querySelector(".bg-gray-200")).toBeTruthy();
  });

  it("skipped 狀態的 div 有 bg-gray-400 class", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L4", "skipped")],
        editable: false,
      })
    );
    expect(container.querySelector(".bg-gray-400")).toBeTruthy();
  });

  it("title 屬性包含 stageId 和狀態標籤", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L1", "completed")],
        editable: false,
      })
    );
    const block = container.querySelector('[title]');
    expect(block?.getAttribute("title")).toMatch(/L1/);
    expect(block?.getAttribute("title")).toMatch(/已完成/);
  });

  it("空階段列表不渲染任何色塊", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [],
        editable: false,
      })
    );
    expect(container.querySelectorAll('div[title]').length).toBe(0);
  });
});

// ── 編輯模式 ───────────────────────────────────────────────

describe("StageProgressBar — 編輯模式", () => {
  it("editable=true 時渲染 Popover 觸發按鈕", () => {
    const { container } = render(
      createElement(StageProgressBar, {
        stages: [makeStage("L1", "not-started")],
        editable: true,
        onStageChange: vi.fn(),
      })
    );
    // 編輯模式下，每個階段是一個 button（Popover trigger）
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("點擊 Popover 觸發按鈕後顯示狀態選項", () => {
    render(
      createElement(StageProgressBar, {
        stages: [makeStage("L1", "not-started")],
        editable: true,
        onStageChange: vi.fn(),
      })
    );
    // 點 Popover trigger
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    // Popover 打開後顯示狀態選項
    expect(screen.getByText("已完成")).toBeTruthy();
    expect(screen.getByText("進行中")).toBeTruthy();
    expect(screen.getByText("未開始")).toBeTruthy();
    expect(screen.getByText("略過")).toBeTruthy();
  });

  it("點擊狀態選項觸發 onStageChange 並帶正確參數", () => {
    const onStageChange = vi.fn();
    render(
      createElement(StageProgressBar, {
        stages: [makeStage("L1", "not-started")],
        editable: true,
        onStageChange,
      })
    );
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("已完成"));
    expect(onStageChange).toHaveBeenCalledWith("L1", "completed");
  });
});
