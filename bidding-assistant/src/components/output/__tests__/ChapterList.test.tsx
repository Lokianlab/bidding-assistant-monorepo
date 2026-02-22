import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { ChapterList } from "../ChapterList";
import type { WorkbenchChapter } from "@/lib/output/types";

// ── Helpers ──────────────────────────────────────────────

function makeChapter(id: string, title: string): WorkbenchChapter {
  return { id, title, content: "", charCount: 0 };
}

const chapters = [
  makeChapter("ch-1", "專案理解"),
  makeChapter("ch-2", "服務方案"),
  makeChapter("ch-3", "團隊組織"),
];

// ── Tests ────────────────────────────────────────────────

describe("ChapterList", () => {
  it("顯示所有章節標題", () => {
    render(createElement(ChapterList, {
      chapters,
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    expect(screen.getByText("專案理解")).toBeTruthy();
    expect(screen.getByText("服務方案")).toBeTruthy();
    expect(screen.getByText("團隊組織")).toBeTruthy();
  });

  it("顯示章節編號", () => {
    render(createElement(ChapterList, {
      chapters,
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    expect(screen.getByText("1.")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
    expect(screen.getByText("3.")).toBeTruthy();
  });

  it("空標題顯示「（未命名）」", () => {
    render(createElement(ChapterList, {
      chapters: [makeChapter("ch-x", "")],
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    expect(screen.getByText("（未命名）")).toBeTruthy();
  });

  it("點擊章節呼叫 onSelect", () => {
    const onSelect = vi.fn();
    render(createElement(ChapterList, {
      chapters,
      selectedId: null,
      onSelect,
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    fireEvent.click(screen.getByText("服務方案"));
    expect(onSelect).toHaveBeenCalledWith("ch-2");
  });

  it("顯示新增章節按鈕", () => {
    render(createElement(ChapterList, {
      chapters,
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    expect(screen.getByText("新增章節")).toBeTruthy();
  });

  it("點擊新增章節呼叫 onAdd", () => {
    const onAdd = vi.fn();
    render(createElement(ChapterList, {
      chapters,
      selectedId: null,
      onSelect: vi.fn(),
      onAdd,
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    fireEvent.click(screen.getByText("新增章節"));
    expect(onAdd).toHaveBeenCalled();
  });

  it("空章節列表仍顯示新增按鈕", () => {
    render(createElement(ChapterList, {
      chapters: [],
      selectedId: null,
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
    }));
    expect(screen.getByText("新增章節")).toBeTruthy();
  });
});
