import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { EditableSelect } from "../EditableSelect";

// ── 基本渲染 ───────────────────────────────────────────────

describe("EditableSelect — 基本渲染", () => {
  it("渲染 input 且顯示 value", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "測試值",
        onChange: vi.fn(),
        options: [],
      })
    );
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("測試值");
  });

  it("顯示 placeholder", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "",
        onChange: vi.fn(),
        options: [],
        placeholder: "請輸入或選擇",
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.placeholder).toBe("請輸入或選擇");
  });

  it("輸入時呼叫 onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      createElement(EditableSelect, { value: "", onChange, options: [] })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "新值" } });
    expect(onChange).toHaveBeenCalledWith("新值");
  });
});

// ── 下拉選項 ───────────────────────────────────────────────

describe("EditableSelect — 下拉選項", () => {
  it("聚焦後顯示常用選項", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "",
        onChange: vi.fn(),
        options: ["選項A", "選項B"],
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    expect(screen.getByText("選項A")).toBeTruthy();
    expect(screen.getByText("選項B")).toBeTruthy();
  });

  it("點擊選項呼叫 onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      createElement(EditableSelect, {
        value: "",
        onChange,
        options: ["選項A"],
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    const option = screen.getByText("選項A");
    fireEvent.mouseDown(option);
    expect(onChange).toHaveBeenCalledWith("選項A");
  });

  it("value 不在 options 時過濾不顯示 options（不符合的選項隱藏）", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "X",
        onChange: vi.fn(),
        options: ["選項A", "選項B"],
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    // "X" 不在 ["選項A", "選項B"] 中 → filtered 為空 → 沒有選項顯示
    expect(screen.queryByText("選項A")).toBeNull();
    expect(screen.queryByText("選項B")).toBeNull();
  });
});

// ── 加入常用選項 ───────────────────────────────────────────

describe("EditableSelect — 加入常用選項", () => {
  it("value 不在 options 時顯示「加入常用」按鈕", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "新名稱",
        onChange: vi.fn(),
        options: ["舊選項"],
        fieldKey: "00A_roles" as const,
        onAddOption: vi.fn(),
        onRemoveOption: vi.fn(),
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    expect(screen.getByText(/將「新名稱」加入常用選項/)).toBeTruthy();
  });

  it("點擊「加入常用」呼叫 onAddOption", () => {
    const onAddOption = vi.fn();
    const { container } = render(
      createElement(EditableSelect, {
        value: "新名稱",
        onChange: vi.fn(),
        options: [],
        fieldKey: "00A_roles" as const,
        onAddOption,
        onRemoveOption: vi.fn(),
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    const addBtn = screen.getByText(/加入常用選項/);
    fireEvent.mouseDown(addBtn);
    expect(onAddOption).toHaveBeenCalledWith("00A_roles", "新名稱");
  });
});

// ── 刪除常用選項 ───────────────────────────────────────────

describe("EditableSelect — 刪除常用選項", () => {
  it("提供 onRemoveOption 時顯示 ✕ 按鈕", () => {
    const { container } = render(
      createElement(EditableSelect, {
        value: "",
        onChange: vi.fn(),
        options: ["選項A"],
        fieldKey: "00A_roles" as const,
        onAddOption: vi.fn(),
        onRemoveOption: vi.fn(),
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("點擊 ✕ 呼叫 onRemoveOption", () => {
    const onRemoveOption = vi.fn();
    const { container } = render(
      createElement(EditableSelect, {
        value: "",
        onChange: vi.fn(),
        options: ["選項A"],
        fieldKey: "00A_roles" as const,
        onAddOption: vi.fn(),
        onRemoveOption,
      })
    );
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.focus(input);
    const removeBtn = screen.getByText("✕");
    fireEvent.mouseDown(removeBtn);
    expect(onRemoveOption).toHaveBeenCalledWith("00A_roles", "選項A");
  });
});
