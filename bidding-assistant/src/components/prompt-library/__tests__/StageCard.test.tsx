import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { StageCard, ToolCard } from "../StageCard";
import type { StageDefinition } from "@/data/config/stages";
import type { PromptFile } from "@/data/config/prompt-assembly";

// ── Helpers ──────────────────────────────────────────────

function makeStage(overrides: Partial<StageDefinition> = {}): StageDefinition {
  return {
    id: "L1",
    name: "戰略分析",
    phase: "投標",
    triggerCommand: "/分析",
    description: "分析招標文件，產出戰略分析報告",
    promptFile: "stages/01.md",
    expectedOutput: "戰略分析報告",
    dialogTips: "建議 3-5 輪來回",
    ...overrides,
  };
}

function makeFile(overrides: Partial<PromptFile> = {}): PromptFile {
  return {
    id: "T01",
    label: "品質檢查工具",
    filename: "tools/quality-check.md",
    category: "tool",
    categoryLabel: "工具",
    ...overrides,
  } as PromptFile;
}

// ── StageCard Tests ─────────────────────────────────────

describe("StageCard", () => {
  it("顯示階段 ID badge", () => {
    render(createElement(StageCard, {
      stage: makeStage({ id: "L3" }),
      fileCount: 2,
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("L3")).toBeTruthy();
  });

  it("顯示階段名稱", () => {
    render(createElement(StageCard, {
      stage: makeStage({ name: "備標規劃" }),
      fileCount: 3,
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("備標規劃")).toBeTruthy();
  });

  it("顯示觸發指令", () => {
    render(createElement(StageCard, {
      stage: makeStage({ triggerCommand: "/規劃" }),
      fileCount: 1,
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("/規劃")).toBeTruthy();
  });

  it("顯示說明文字", () => {
    render(createElement(StageCard, {
      stage: makeStage({ description: "產出備標規劃書" }),
      fileCount: 1,
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("產出備標規劃書")).toBeTruthy();
  });

  it("顯示檔案數量", () => {
    render(createElement(StageCard, {
      stage: makeStage(),
      fileCount: 5,
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("5 個檔案")).toBeTruthy();
  });

  it("點擊呼叫 onClick", () => {
    const onClick = vi.fn();
    render(createElement(StageCard, {
      stage: makeStage(),
      fileCount: 1,
      selected: false,
      onClick,
    }));
    fireEvent.click(screen.getByText("戰略分析"));
    expect(onClick).toHaveBeenCalled();
  });
});

// ── ToolCard Tests ──────────────────────────────────────

describe("ToolCard", () => {
  it("顯示工具 ID badge", () => {
    render(createElement(ToolCard, {
      file: makeFile({ id: "T03" }),
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("T03")).toBeTruthy();
  });

  it("顯示工具名稱", () => {
    render(createElement(ToolCard, {
      file: makeFile({ label: "報價計算工具" }),
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("報價計算工具")).toBeTruthy();
  });

  it("顯示分類標籤", () => {
    render(createElement(ToolCard, {
      file: makeFile({ categoryLabel: "規格" }),
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("規格")).toBeTruthy();
  });

  it("顯示檔名", () => {
    render(createElement(ToolCard, {
      file: makeFile({ filename: "tools/pricing.md" }),
      selected: false,
      onClick: vi.fn(),
    }));
    expect(screen.getByText("tools/pricing.md")).toBeTruthy();
  });

  it("點擊呼叫 onClick", () => {
    const onClick = vi.fn();
    render(createElement(ToolCard, {
      file: makeFile(),
      selected: false,
      onClick,
    }));
    fireEvent.click(screen.getByText("品質檢查工具"));
    expect(onClick).toHaveBeenCalled();
  });
});
