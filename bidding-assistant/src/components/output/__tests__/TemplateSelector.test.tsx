import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { TemplateSelector } from "../TemplateSelector";
import { getBuiltinTemplates } from "@/lib/output/template-manager";

// ── Tests ────────────────────────────────────────────────

describe("TemplateSelector", () => {
  const builtins = getBuiltinTemplates();

  it("顯示「選擇範本」標題", () => {
    render(createElement(TemplateSelector, { selectedId: builtins[0].id, onChange: vi.fn() }));
    expect(screen.getByText("選擇範本")).toBeTruthy();
  });

  it("顯示所有內建範本名稱", () => {
    render(createElement(TemplateSelector, { selectedId: builtins[0].id, onChange: vi.fn() }));
    for (const t of builtins) {
      expect(screen.getByText(t.name)).toBeTruthy();
    }
  });

  it("顯示範本描述", () => {
    render(createElement(TemplateSelector, { selectedId: builtins[0].id, onChange: vi.fn() }));
    for (const t of builtins) {
      expect(screen.getByText(t.description)).toBeTruthy();
    }
  });

  it("點擊範本按鈕呼叫 onChange", () => {
    const onChange = vi.fn();
    render(createElement(TemplateSelector, { selectedId: builtins[0].id, onChange }));
    // 點擊非選中的範本（如果有多個）
    if (builtins.length > 1) {
      fireEvent.click(screen.getByText(builtins[1].name));
      expect(onChange).toHaveBeenCalledWith(builtins[1].id);
    }
  });

  it("傳入自訂範本時一併顯示", () => {
    const custom = {
      id: "my-custom",
      name: "自訂範本",
      description: "測試用",
      chapters: [],
      variables: [],
    };
    render(createElement(TemplateSelector, {
      selectedId: builtins[0].id,
      customTemplates: [custom],
      onChange: vi.fn(),
    }));
    expect(screen.getByText("自訂範本")).toBeTruthy();
    expect(screen.getByText("測試用")).toBeTruthy();
  });
});
