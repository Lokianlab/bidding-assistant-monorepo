import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ChapterList } from "../ChapterList";
import type { WorkbenchChapter } from "@/lib/output/types";

// ── Helpers ────────────────────────────────────────────────

function makeChapter(id: string, title: string): WorkbenchChapter {
  return { id, title, content: "", charCount: 0 };
}

const noop = vi.fn();

// ── 空章節列表 ─────────────────────────────────────────────

describe("ChapterList — 空章節", () => {
  it("chapters=[] 時只顯示「新增章節」按鈕", () => {
    render(
      createElement(ChapterList, {
        chapters: [],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(screen.getByText("新增章節")).toBeTruthy();
  });

  it("chapters=[] 時沒有章節索引編號", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(container.querySelector(".text-muted-foreground")).toBeNull();
  });
});

// ── 章節顯示 ───────────────────────────────────────────────

describe("ChapterList — 章節顯示", () => {
  it("顯示章節標題", () => {
    render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "執行計畫")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(screen.getByText("執行計畫")).toBeTruthy();
  });

  it("title 為空字串時顯示「（未命名）」", () => {
    render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(screen.getByText("（未命名）")).toBeTruthy();
  });

  it("多章節顯示索引編號 1. 和 2.", () => {
    render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "第一章"), makeChapter("c2", "第二章")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(screen.getByText("1.")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
  });
});

// ── 選中狀態 ───────────────────────────────────────────────

describe("ChapterList — 選中狀態", () => {
  it("selectedId 對應章節的 div 包含 bg-accent class", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "第一章")],
        selectedId: "c1",
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(container.querySelector(".bg-accent")).toBeTruthy();
  });

  it("未選中章節不包含 bg-accent class", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "第一章")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    expect(container.querySelector(".bg-accent")).toBeNull();
  });
});

// ── 回調觸發 ───────────────────────────────────────────────

describe("ChapterList — 回調觸發", () => {
  it("點章節標題呼叫 onSelect 並帶 chapter id", () => {
    const onSelect = vi.fn();
    render(
      createElement(ChapterList, {
        chapters: [makeChapter("ch-99", "我的章節")],
        selectedId: null,
        onSelect,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    fireEvent.click(screen.getByText("我的章節"));
    expect(onSelect).toHaveBeenCalledWith("ch-99");
  });

  it("點「新增章節」按鈕呼叫 onAdd", () => {
    const onAdd = vi.fn();
    render(
      createElement(ChapterList, {
        chapters: [],
        selectedId: null,
        onSelect: noop,
        onAdd,
        onRemove: noop,
        onMove: noop,
      })
    );
    fireEvent.click(screen.getByText("新增章節"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

// ── 按鈕 disabled 狀態 ─────────────────────────────────────

describe("ChapterList — 按鈕 disabled 狀態", () => {
  // 每章節 3 顆按鈕（上移、下移、刪除）+ 1 顆「新增章節」
  // 順序：[ch-up, ch-down, ch-delete, ..., add]

  it("只有一章時上移和下移按鈕都 disabled", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "唯一章節")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    const buttons = container.querySelectorAll("button");
    // buttons[0] = up (idx=0, disabled)
    // buttons[1] = down (idx=0=length-1, disabled)
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it("第一章的上移按鈕 disabled", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "第一章"), makeChapter("c2", "第二章")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    const buttons = container.querySelectorAll("button");
    // buttons[0] = ch1-up (idx=0, disabled)
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    // buttons[1] = ch1-down (idx=0, not last, enabled)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it("最後一章的下移按鈕 disabled", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [makeChapter("c1", "第一章"), makeChapter("c2", "第二章")],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    const buttons = container.querySelectorAll("button");
    // buttons[3] = ch2-up (idx=1, not first, enabled)
    expect((buttons[3] as HTMLButtonElement).disabled).toBe(false);
    // buttons[4] = ch2-down (idx=1=length-1, disabled)
    expect((buttons[4] as HTMLButtonElement).disabled).toBe(true);
  });

  it("中間章節的上移和下移按鈕都不 disabled", () => {
    const { container } = render(
      createElement(ChapterList, {
        chapters: [
          makeChapter("c1", "第一章"),
          makeChapter("c2", "第二章"),
          makeChapter("c3", "第三章"),
        ],
        selectedId: null,
        onSelect: noop,
        onAdd: noop,
        onRemove: noop,
        onMove: noop,
      })
    );
    const buttons = container.querySelectorAll("button");
    // buttons[3] = ch2-up (not first, enabled)
    // buttons[4] = ch2-down (not last, enabled)
    expect((buttons[3] as HTMLButtonElement).disabled).toBe(false);
    expect((buttons[4] as HTMLButtonElement).disabled).toBe(false);
  });
});
