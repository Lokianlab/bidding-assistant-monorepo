import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ChapterEditor } from "../ChapterEditor";
import type { WorkbenchChapter } from "@/lib/output/types";

// Mock KBInsertDialog to avoid deep dependency chain (useKnowledgeBase etc.)
vi.mock("../KBInsertDialog", () => ({
  KBInsertDialog: ({ onInsert }: { onInsert: (s: string) => void }) =>
    createElement(
      "button",
      { "data-testid": "kb-insert-btn", onClick: () => onInsert("{{test}}") },
      "插入知識庫",
    ),
}));

// ── Helpers ──────────────────────────────────────────────

function makeChapter(overrides: Partial<WorkbenchChapter> = {}): WorkbenchChapter {
  return {
    id: "ch-001",
    title: "專案理解與服務理念",
    content: "本公司擬提出之服務方案...",
    charCount: 14,
    ...overrides,
  };
}

const noop = vi.fn();

// ── Tests ────────────────────────────────────────────────

describe("ChapterEditor", () => {
  it("顯示章節編號 badge", () => {
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 2, onUpdate: noop }));
    expect(screen.getByText("第 3 章")).toBeTruthy();
  });

  it("顯示章節標題在 input 中", () => {
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 0, onUpdate: noop }));
    const input = screen.getByPlaceholderText("章節標題") as HTMLInputElement;
    expect(input.value).toBe("專案理解與服務理念");
  });

  it("顯示章節內容在 textarea 中", () => {
    render(createElement(ChapterEditor, {
      chapter: makeChapter({ content: "測試內容" }),
      index: 0,
      onUpdate: noop,
    }));
    const textarea = screen.getByPlaceholderText(/貼入或輸入/) as HTMLTextAreaElement;
    expect(textarea.value).toBe("測試內容");
  });

  it("有 guideText 時顯示撰寫指引", () => {
    render(createElement(ChapterEditor, {
      chapter: makeChapter(),
      index: 0,
      guideText: "請描述團隊的專案理解",
      onUpdate: noop,
    }));
    expect(screen.getByText("請描述團隊的專案理解")).toBeTruthy();
  });

  it("無 guideText 時不顯示撰寫指引", () => {
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 0, onUpdate: noop }));
    expect(screen.queryByText("請描述")).toBeNull();
  });

  it("有 suggestedLength 時顯示建議字數", () => {
    render(createElement(ChapterEditor, {
      chapter: makeChapter(),
      index: 0,
      suggestedLength: "2000-3000",
      onUpdate: noop,
    }));
    expect(screen.getByText("（建議 2000-3000 字）")).toBeTruthy();
  });

  it("修改標題時呼叫 onUpdate", () => {
    const onUpdate = vi.fn();
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 0, onUpdate }));
    const input = screen.getByPlaceholderText("章節標題");
    fireEvent.change(input, { target: { value: "新標題" } });
    expect(onUpdate).toHaveBeenCalledWith("ch-001", { title: "新標題" });
  });

  it("修改內容時呼叫 onUpdate", () => {
    const onUpdate = vi.fn();
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 0, onUpdate }));
    const textarea = screen.getByPlaceholderText(/貼入或輸入/);
    fireEvent.change(textarea, { target: { value: "新內容" } });
    expect(onUpdate).toHaveBeenCalledWith("ch-001", { content: "新內容" });
  });

  it("顯示字數統計", () => {
    render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 1234 }),
      index: 0,
      onUpdate: noop,
    }));
    expect(screen.getByText("1,234 字")).toBeTruthy();
  });

  it("字數低於建議下限時顯示琥珀色", () => {
    const { container } = render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 500 }),
      index: 0,
      suggestedLength: "2000-3000",
      onUpdate: noop,
    }));
    const charDiv = container.querySelector(".text-amber-500");
    expect(charDiv).toBeTruthy();
  });

  it("字數超過建議上限時顯示紅色", () => {
    const { container } = render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 5000 }),
      index: 0,
      suggestedLength: "2000-3000",
      onUpdate: noop,
    }));
    const charDiv = container.querySelector(".text-red-500");
    expect(charDiv).toBeTruthy();
  });

  it("字數在建議範圍內時顯示綠色", () => {
    const { container } = render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 2500 }),
      index: 0,
      suggestedLength: "2000-3000",
      onUpdate: noop,
    }));
    const charDiv = container.querySelector(".text-green-600");
    expect(charDiv).toBeTruthy();
  });

  it("無 suggestedLength 時字數為預設色", () => {
    const { container } = render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 100 }),
      index: 0,
      onUpdate: noop,
    }));
    const charDiv = container.querySelector(".text-muted-foreground");
    expect(charDiv).toBeTruthy();
    expect(container.querySelector(".text-amber-500")).toBeNull();
    expect(container.querySelector(".text-red-500")).toBeNull();
  });

  it("知識庫插入按鈕存在", () => {
    render(createElement(ChapterEditor, { chapter: makeChapter(), index: 0, onUpdate: noop }));
    expect(screen.getByTestId("kb-insert-btn")).toBeTruthy();
  });

  it("點擊知識庫插入按鈕呼叫 onUpdate 追加內容", () => {
    const onUpdate = vi.fn();
    render(createElement(ChapterEditor, {
      chapter: makeChapter({ content: "原始內容" }),
      index: 0,
      onUpdate,
    }));
    fireEvent.click(screen.getByTestId("kb-insert-btn"));
    expect(onUpdate).toHaveBeenCalledWith("ch-001", { content: "原始內容{{test}}" });
  });

  it("charCount 為 0 時顯示 0 字", () => {
    render(createElement(ChapterEditor, {
      chapter: makeChapter({ charCount: 0 }),
      index: 0,
      onUpdate: noop,
    }));
    expect(screen.getByText("0 字")).toBeTruthy();
  });
});
