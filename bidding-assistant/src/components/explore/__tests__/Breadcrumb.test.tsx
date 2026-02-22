import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExplorerBreadcrumb } from "../Breadcrumb";
import type { StackEntry } from "@/lib/explore/types";

describe("ExplorerBreadcrumb", () => {
  it("堆疊只有 1 層時不渲染", () => {
    const stack: StackEntry[] = [{ type: "search", id: "title:食農", label: "搜尋「食農」" }];
    const { container } = render(<ExplorerBreadcrumb stack={stack} onJump={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("堆疊 2 層以上時渲染麵包屑", () => {
    const stack: StackEntry[] = [
      { type: "search", id: "title:食農", label: "搜尋「食農」" },
      { type: "tender", id: "U1/J1", label: "食農教育計畫" },
    ];
    render(<ExplorerBreadcrumb stack={stack} onJump={vi.fn()} />);
    expect(screen.getByText("搜尋「食農」")).toBeTruthy();
    expect(screen.getByText("食農教育計畫")).toBeTruthy();
  });

  it("點擊非最後一層觸發 onJump", () => {
    const onJump = vi.fn();
    const stack: StackEntry[] = [
      { type: "search", id: "s1", label: "搜尋" },
      { type: "tender", id: "t1", label: "案件" },
      { type: "company", id: "c1", label: "廠商" },
    ];
    render(<ExplorerBreadcrumb stack={stack} onJump={onJump} />);

    // 點「搜尋」（第 0 層）
    fireEvent.click(screen.getByText("搜尋"));
    expect(onJump).toHaveBeenCalledWith(0);

    // 點「案件」（第 1 層）
    fireEvent.click(screen.getByText("案件"));
    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("最後一層不是按鈕（不可點擊）", () => {
    const stack: StackEntry[] = [
      { type: "search", id: "s1", label: "搜尋" },
      { type: "tender", id: "t1", label: "最終層" },
    ];
    render(<ExplorerBreadcrumb stack={stack} onJump={vi.fn()} />);

    const lastItem = screen.getByText("最終層");
    expect(lastItem.closest("button")).toBeNull();
  });
});
