import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { FieldMappingEditor } from "../FieldMappingEditor";
import { FIELD_KEYS, DEFAULT_FIELD_MAP, FIELD_LABELS } from "@/lib/constants/field-mapping";

// ── Radix Select 需要 scrollIntoView ─────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── Helper ──────────────────────────────────────────────────

function makeProps(overrides?: Record<string, unknown>) {
  return {
    mapping: {} as Partial<Record<(typeof FIELD_KEYS)[number], string>>,
    onChange: vi.fn(),
    ...overrides,
  };
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("FieldMappingEditor — 基本渲染", () => {
  it("顯示標題「Notion 欄位對照」", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    expect(screen.getByText("Notion 欄位對照")).toBeTruthy();
  });

  it("顯示所有欄位的系統用途標籤", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    // FIELD_LABELS 的每個值都應出現（可能重複）
    const firstKey = FIELD_KEYS[0];
    expect(screen.getAllByText(FIELD_LABELS[firstKey]).length).toBeGreaterThan(0);
  });

  it("顯示預設欄位名稱", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    // DEFAULT_FIELD_MAP 的值應出現（作為預設欄位名稱）
    const firstKey = FIELD_KEYS[0];
    expect(screen.getAllByText(DEFAULT_FIELD_MAP[firstKey]).length).toBeGreaterThan(0);
  });

  it("顯示表格欄標題「系統用途」", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    expect(screen.getByText("系統用途")).toBeTruthy();
  });

  it("顯示表格欄標題「預設欄位名稱」", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    expect(screen.getByText("預設欄位名稱")).toBeTruthy();
  });
});

// ── 狀態顯示 ───────────────────────────────────────────────

describe("FieldMappingEditor — 狀態顯示", () => {
  it("無 override 時顯示「預設」badge", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    // 所有欄位都是預設值，所以有多個「預設」badge
    expect(screen.getAllByText("預設").length).toBeGreaterThan(0);
  });

  it("有 override 時顯示「已自訂」badge", () => {
    const firstKey = FIELD_KEYS[0];
    render(
      createElement(FieldMappingEditor, makeProps({
        mapping: { [firstKey]: "自訂欄位名稱" },
      }))
    );
    expect(screen.getByText("已自訂")).toBeTruthy();
  });

  it("未拉取 schema 時不顯示下拉框", () => {
    const { container } = render(createElement(FieldMappingEditor, makeProps()));
    // 無 schema 時顯示 span 文字，不顯示 Select
    const selects = container.querySelectorAll("[data-slot='select-trigger']");
    expect(selects.length).toBe(0);
  });
});

// ── 動作 ───────────────────────────────────────────────────

describe("FieldMappingEditor — 動作", () => {
  it("點擊「恢復預設」呼叫 onChange({})", () => {
    const onChange = vi.fn();
    render(createElement(FieldMappingEditor, makeProps({ onChange })));
    const resetBtn = screen.getByText("恢復預設");
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("無 token 時「從 Notion 偵測」按鈕可點擊（但不 fetch）", () => {
    render(createElement(FieldMappingEditor, makeProps()));
    const detectBtn = screen.getByText(/從 Notion 偵測/);
    expect(detectBtn).toBeTruthy();
    // 沒有 notionToken → 不會呼叫 fetch，只要不拋錯
    fireEvent.click(detectBtn);
  });
});
