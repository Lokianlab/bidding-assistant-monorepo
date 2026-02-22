import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QualityPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("QualityPage — 渲染", () => {
  it("顯示頁面標題「品質檢查」", () => {
    render(<QualityPage />);
    expect(screen.getByRole("heading", { name: "品質檢查" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<QualityPage />);
    expect(screen.getByText(/檢查禁用詞/)).toBeTruthy();
  });

  it("顯示 textarea 輸入區", () => {
    render(<QualityPage />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("textarea 無內容時「執行檢查」按鈕 disabled", () => {
    render(<QualityPage />);
    const btn = screen.getByRole("button", {
      name: "執行檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("顯示「待檢文字」卡片", () => {
    render(<QualityPage />);
    expect(screen.getByText("待檢文字")).toBeTruthy();
  });
});

describe("QualityPage — 互動", () => {
  it("輸入文字後「執行檢查」按鈕 enabled", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    const btn = screen.getByRole("button", {
      name: "執行檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點「執行檢查」後顯示「檢查結果」卡片", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("檢查結果")).toBeTruthy();
  });

  it("點「執行檢查」後顯示錯誤/警告統計 badge", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    // 檢查結果區顯示統計 badge（不論有無問題都顯示）
    expect(screen.getByText(/\d+ 錯誤/)).toBeTruthy();
    expect(screen.getByText(/\d+ 警告/)).toBeTruthy();
  });

  it("修改文字後 checked 重置（檢查結果消失）", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("檢查結果")).toBeTruthy();

    // 再修改文字 → checked=false → 結果消失
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "修改後的文字" },
    });
    expect(screen.queryByText("檢查結果")).toBeNull();
  });
});
