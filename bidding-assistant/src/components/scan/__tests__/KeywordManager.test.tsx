// ====== KeywordManager 元件測試 ======

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeywordManager } from "../KeywordManager";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scan/constants";

describe("KeywordManager", () => {
  const baseKeywords = ["食農教育", "藝術", "春聯"];

  // ── 渲染 ──

  it("顯示傳入的關鍵字 chips", () => {
    render(<KeywordManager keywords={baseKeywords} onChange={vi.fn()} />);
    expect(screen.getByText(/食農教育/)).toBeTruthy();
    expect(screen.getByText(/藝術/)).toBeTruthy();
    expect(screen.getByText(/春聯/)).toBeTruthy();
  });

  it("空陣列時顯示提示文字", () => {
    render(<KeywordManager keywords={[]} onChange={vi.fn()} />);
    expect(screen.getByText("尚未設定任何關鍵字")).toBeTruthy();
  });

  // ── 新增關鍵字 ──

  it("按新增按鈕加入新關鍵字", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    const input = screen.getByPlaceholderText("新增關鍵字（按 Enter 確認）");
    fireEvent.change(input, { target: { value: "燈節" } });
    const addBtn = screen.getByRole("button", { name: "新增" });
    fireEvent.click(addBtn);
    expect(onChange).toHaveBeenCalledWith([...baseKeywords, "燈節"]);
  });

  it("按 Enter 鍵也可以新增關鍵字", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    const input = screen.getByPlaceholderText("新增關鍵字（按 Enter 確認）");
    fireEvent.change(input, { target: { value: "晚會" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith([...baseKeywords, "晚會"]);
  });

  it("不接受空字串", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    const addBtn = screen.getByRole("button", { name: "新增" });
    fireEvent.click(addBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("不接受重複關鍵字", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    const input = screen.getByPlaceholderText("新增關鍵字（按 Enter 確認）");
    fireEvent.change(input, { target: { value: "藝術" } }); // 已存在
    const addBtn = screen.getByRole("button", { name: "新增" });
    fireEvent.click(addBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("新增後清空輸入框", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    const input = screen.getByPlaceholderText("新增關鍵字（按 Enter 確認）") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "燈節" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("");
  });

  // ── 移除關鍵字 ──

  it("點擊 chip 移除對應關鍵字", () => {
    const onChange = vi.fn();
    const { container } = render(<KeywordManager keywords={baseKeywords} onChange={onChange} />);
    // Badge 是 span，用 querySelector 找包含「藝術」文字的 chip
    const chips = Array.from(container.querySelectorAll("[class*='cursor-pointer']"));
    const artChip = chips.find((el) => el.textContent?.includes("藝術"));
    expect(artChip).toBeTruthy();
    fireEvent.click(artChip!);
    expect(onChange).toHaveBeenCalledWith(["食農教育", "春聯"]);
  });

  // ── 恢復預設 ──

  it("點擊「恢復預設」重置為 DEFAULT_SEARCH_KEYWORDS", () => {
    const onChange = vi.fn();
    render(<KeywordManager keywords={["自訂關鍵字"]} onChange={onChange} />);
    const resetBtn = screen.getByRole("button", { name: "恢復預設" });
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledWith([...DEFAULT_SEARCH_KEYWORDS]);
  });

  // ── 新增按鈕狀態 ──

  it("輸入框空白時新增按鈕為 disabled", () => {
    render(<KeywordManager keywords={baseKeywords} onChange={vi.fn()} />);
    const addBtn = screen.getByRole("button", { name: "新增" }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });

  it("輸入框有內容時新增按鈕為可點擊", () => {
    render(<KeywordManager keywords={baseKeywords} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("新增關鍵字（按 Enter 確認）");
    fireEvent.change(input, { target: { value: "測試" } });
    const addBtn = screen.getByRole("button", { name: "新增" }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(false);
  });
});
