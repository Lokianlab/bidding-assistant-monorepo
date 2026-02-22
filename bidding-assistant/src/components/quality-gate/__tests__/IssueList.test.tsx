import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { IssueList } from "../IssueList";

// ── 空狀態 ─────────────────────────────────────────────────

describe("IssueList — 空狀態", () => {
  it("issues=[] 時顯示預設空訊息", () => {
    render(createElement(IssueList, { issues: [] }));
    expect(screen.getByText("沒有發現問題")).toBeTruthy();
  });

  it("issues=[] 且傳入 emptyMessage 時顯示自訂訊息", () => {
    render(
      createElement(IssueList, {
        issues: [],
        emptyMessage: "本段落沒有問題",
      })
    );
    expect(screen.getByText("本段落沒有問題")).toBeTruthy();
  });

  it("空狀態不渲染 <ul>", () => {
    const { container } = render(createElement(IssueList, { issues: [] }));
    expect(container.querySelector("ul")).toBeNull();
  });
});

// ── error 嚴重程度 ─────────────────────────────────────────

describe("IssueList — error 嚴重程度", () => {
  it("error 項目顯示 ❌ 圖示", () => {
    render(
      createElement(IssueList, {
        issues: [{ severity: "error", message: "文字品質不足" }],
      })
    );
    expect(screen.getByText(/❌/)).toBeTruthy();
  });

  it("error 項目顯示訊息文字", () => {
    render(
      createElement(IssueList, {
        issues: [{ severity: "error", message: "金額超出預算" }],
      })
    );
    expect(screen.getByText(/金額超出預算/)).toBeTruthy();
  });
});

// ── warning 嚴重程度 ───────────────────────────────────────

describe("IssueList — warning 嚴重程度", () => {
  it("warning 項目顯示 ⚠️ 圖示", () => {
    render(
      createElement(IssueList, {
        issues: [{ severity: "warning", message: "建議補充說明" }],
      })
    );
    expect(screen.getByText(/⚠️/)).toBeTruthy();
  });

  it("warning 項目顯示訊息文字", () => {
    render(
      createElement(IssueList, {
        issues: [{ severity: "warning", message: "模糊量化詞" }],
      })
    );
    expect(screen.getByText(/模糊量化詞/)).toBeTruthy();
  });
});

// ── unknown severity fallback ──────────────────────────────

describe("IssueList — 未知 severity fallback", () => {
  it("未知 severity 使用 warning 樣式（⚠️）", () => {
    render(
      createElement(IssueList, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        issues: [{ severity: "unknown" as any, message: "奇怪的問題" }],
      })
    );
    // fallback 到 warning → 顯示 ⚠️ 不是 ❌
    expect(screen.getByText(/⚠️/)).toBeTruthy();
    expect(screen.queryByText(/❌/)).toBeNull();
  });
});

// ── context 欄位 ───────────────────────────────────────────

describe("IssueList — context 欄位", () => {
  it("有 context 時顯示原文片段", () => {
    render(
      createElement(IssueList, {
        issues: [
          {
            severity: "warning",
            message: "句子過長",
            context: "本計畫將於三年內達成所有預定目標，並確保...",
          },
        ],
      })
    );
    expect(
      screen.getByText("本計畫將於三年內達成所有預定目標，並確保...")
    ).toBeTruthy();
  });

  it("無 context 時不渲染額外文字", () => {
    const { container } = render(
      createElement(IssueList, {
        issues: [{ severity: "error", message: "缺少履約實績" }],
      })
    );
    // 只有一個 <li>，且無 context div
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(1);
    // li 內只有一個 div（訊息行），沒有第二個 div（context 行）
    const divs = items[0].querySelectorAll("div");
    expect(divs).toHaveLength(1);
  });
});

// ── 多筆項目 ───────────────────────────────────────────────

describe("IssueList — 多筆項目", () => {
  it("三筆問題都渲染", () => {
    render(
      createElement(IssueList, {
        issues: [
          { severity: "error", message: "問題一" },
          { severity: "warning", message: "問題二" },
          { severity: "error", message: "問題三" },
        ],
      })
    );
    expect(screen.getByText(/問題一/)).toBeTruthy();
    expect(screen.getByText(/問題二/)).toBeTruthy();
    expect(screen.getByText(/問題三/)).toBeTruthy();
  });

  it("多筆問題以 <ul> 包裹", () => {
    const { container } = render(
      createElement(IssueList, {
        issues: [
          { severity: "error", message: "A" },
          { severity: "warning", message: "B" },
        ],
      })
    );
    expect(container.querySelector("ul")).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
