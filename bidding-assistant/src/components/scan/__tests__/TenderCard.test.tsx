import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TenderCard } from "../TenderCard";
import type { ScanResult } from "@/lib/scan/types";

function makeResult(overrides?: Partial<{
  title: string;
  category: "must" | "review" | "exclude" | "other";
  label: string;
  unit: string;
  budget: number;
  publishDate: string;
  jobNumber: string;
}>): ScanResult {
  return {
    tender: {
      title: overrides?.title ?? "測試標案",
      unit: overrides?.unit ?? "測試機關",
      jobNumber: overrides?.jobNumber ?? "J001",
      budget: overrides?.budget ?? 0,
      deadline: "",
      publishDate: overrides?.publishDate ?? "20260228",
      url: "https://pcc.g0v.ronny.tw/tender/J001",
    },
    classification: {
      category: overrides?.category ?? "must",
      matchedLabel: overrides?.label ?? "食農教育",
      matchedKeywords: ["食農教育"],
    },
  };
}

describe("TenderCard", () => {
  it("顯示標案標題和機關", () => {
    render(<TenderCard result={makeResult({ title: "食農教育推廣", unit: "教育局" })} />);
    expect(screen.getByText("食農教育推廣")).toBeDefined();
    expect(screen.getByText("教育局")).toBeDefined();
  });

  it("must 類別顯示「推薦」標籤", () => {
    render(<TenderCard result={makeResult({ category: "must" })} />);
    expect(screen.getByText("推薦")).toBeDefined();
  });

  it("review 類別顯示「需要看」標籤和詳情按鈕", () => {
    const onViewDetail = vi.fn();
    render(<TenderCard result={makeResult({ category: "review", label: "燈節" })} onViewDetail={onViewDetail} />);
    expect(screen.getByText("需要看")).toBeDefined();
    const detailBtn = screen.getByText("詳情");
    expect(detailBtn).toBeDefined();
    fireEvent.click(detailBtn);
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  it("exclude 類別不顯示建案按鈕", () => {
    render(<TenderCard result={makeResult({ category: "exclude", label: "課後服務" })} />);
    expect(screen.getByText("已排除")).toBeDefined();
    expect(screen.queryByText("建案")).toBeNull();
  });

  it("other 類別顯示「其他」標籤", () => {
    render(<TenderCard result={makeResult({ category: "other" })} />);
    expect(screen.getByText("其他")).toBeDefined();
  });

  it("點擊建案按鈕觸發 onCreateCase", () => {
    const onCreateCase = vi.fn();
    const result = makeResult({ category: "must" });
    render(<TenderCard result={result} onCreateCase={onCreateCase} />);
    fireEvent.click(screen.getByText("建案"));
    expect(onCreateCase).toHaveBeenCalledWith(result);
  });

  it("點擊跳過按鈕觸發 onSkip", () => {
    const onSkip = vi.fn();
    const result = makeResult();
    render(<TenderCard result={result} onSkip={onSkip} />);
    fireEvent.click(screen.getByText("跳過"));
    expect(onSkip).toHaveBeenCalledWith(result);
  });

  it("顯示預算金額（當預算 > 0）", () => {
    render(<TenderCard result={makeResult({ budget: 500_000 })} />);
    expect(screen.getByText("50萬")).toBeDefined();
  });

  it("預算 = 0 時顯示「預算未公告」", () => {
    render(<TenderCard result={makeResult({ budget: 0 })} />);
    expect(screen.getByText("預算未公告")).toBeDefined();
  });

  it("日期格式轉換（20260228 → 公告 2026/02/28）", () => {
    render(<TenderCard result={makeResult({ publishDate: "20260228" })} />);
    expect(screen.getByText("公告 2026/02/28")).toBeDefined();
  });

  it("顯示匹配標籤", () => {
    render(<TenderCard result={makeResult({ category: "must", label: "食農教育" })} />);
    expect(screen.getByText("食農教育")).toBeDefined();
  });

  it("createStatus=creating 時按鈕顯示「建案中...」並 disabled", () => {
    render(
      <TenderCard
        result={makeResult({ category: "must" })}
        onCreateCase={vi.fn()}
        createStatus="creating"
      />
    );
    const btn = screen.getByText("建案中...");
    expect(btn).toBeDefined();
    expect((btn.closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("createStatus=done 時按鈕顯示「已建案」並 disabled", () => {
    render(
      <TenderCard
        result={makeResult({ category: "must" })}
        onCreateCase={vi.fn()}
        createStatus="done"
      />
    );
    const btn = screen.getByText("已建案");
    expect(btn).toBeDefined();
    expect((btn.closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("createStatus=error 時按鈕顯示「重試」", () => {
    const onCreateCase = vi.fn();
    const result = makeResult({ category: "must" });
    render(
      <TenderCard
        result={result}
        onCreateCase={onCreateCase}
        createStatus="error"
      />
    );
    expect(screen.getByText("重試")).toBeDefined();
  });
});
