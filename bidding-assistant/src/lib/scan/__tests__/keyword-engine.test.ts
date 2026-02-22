import { describe, it, expect } from "vitest";
import {
  classifyTender,
  classifyTenders,
  countByCategory,
  sortByPriority,
} from "../keyword-engine";
import { DEFAULT_KEYWORD_RULES } from "../constants";
import type { KeywordRule, ScanTender } from "../types";

// ── classifyTender ─────────────────────────────────────────

describe("classifyTender（預設規則）", () => {
  // ── 絕對可以 ──

  it("食農教育 → must", () => {
    const result = classifyTender("113年度食農教育推廣計畫", 500_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("食農教育");
    expect(result.matchedKeywords).toContain("食農教育");
  });

  it("藝術 → must", () => {
    const result = classifyTender("公共藝術設置計畫", 2_000_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("藝術");
  });

  it("服務採購 → must", () => {
    const result = classifyTender("114年度委外服務採購案", 800_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("服務採購");
  });

  it("影片製作 → must", () => {
    const result = classifyTender("形象影片製作案", 600_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("影片製作");
  });

  it("影片拍攝（同義詞）→ must", () => {
    const result = classifyTender("宣傳影片拍攝", 600_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("影片製作");
  });

  it("行銷計畫 → must", () => {
    const result = classifyTender("觀光行銷計畫", 1_500_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("行銷計畫");
  });

  it("春聯 → must", () => {
    const result = classifyTender("114年春聯印製", 200_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("春聯");
  });

  it("100萬以下 → must（純預算規則）", () => {
    const result = classifyTender("某個不認識的標案名稱", 800_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("100萬以下");
    expect(result.matchedKeywords[0]).toContain("預算");
  });

  it("剛好100萬 → must", () => {
    const result = classifyTender("某標案", 1_000_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("100萬以下");
  });

  // ── 需要讀細節 ──

  it("藝術節 → review", () => {
    const result = classifyTender("114年度城市藝術節策展服務", 3_000_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("各種節慶");
  });

  it("燈節 → review", () => {
    const result = classifyTender("2026台灣燈節主燈區策展", 5_000_000);
    expect(result.category).toBe("review");
    // 可能匹配「燈節」或「主燈」
    expect(["燈節", "主燈設計"]).toContain(result.matchedLabel);
  });

  it("舞台 → review", () => {
    const result = classifyTender("大型舞台搭設及音響工程", 2_000_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("舞台");
  });

  it("晚會 → review", () => {
    const result = classifyTender("跨年晚會企劃執行", 8_000_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("晚會演唱會");
  });

  it("布置 → review", () => {
    const result = classifyTender("會場布置服務", 1_500_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("布置");
  });

  it("佈置（異體字）→ review", () => {
    const result = classifyTender("展場佈置委託案", 2_000_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("布置");
  });

  // ── 先不要 ──

  it("課後服務 → exclude", () => {
    const result = classifyTender("國小課後服務委辦案", 500_000);
    expect(result.category).toBe("exclude");
    expect(result.matchedLabel).toBe("課後服務");
  });

  it("課後照顧（同義詞）→ exclude", () => {
    const result = classifyTender("課後照顧班營運管理", 300_000);
    expect(result.category).toBe("exclude");
    expect(result.matchedLabel).toBe("課後服務");
  });

  // ── 其他 ──

  it("無關標案 → other", () => {
    const result = classifyTender("道路工程養護案", 5_000_000);
    expect(result.category).toBe("other");
    expect(result.matchedKeywords).toHaveLength(0);
  });

  // ── 優先序 ──

  it("排除優先於推薦（課後服務 + 100萬以下）", () => {
    const result = classifyTender("課後服務委辦案", 800_000);
    expect(result.category).toBe("exclude");
  });

  it("同長度關鍵字：must 優先於 review", () => {
    // 「藝術」(must, 2字) vs 「舞台」(review, 2字)，同長度 must 優先
    const result = classifyTender("公共藝術舞台設置", 3_000_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("藝術");
  });

  it("更精確的關鍵字勝出（藝術節 3字 > 藝術 2字）", () => {
    const result = classifyTender("公共藝術節策展", 3_000_000);
    expect(result.category).toBe("review");
    expect(result.matchedLabel).toBe("各種節慶");
  });

  // ── 邊界 ──

  it("預算 0 不觸發預算規則", () => {
    const result = classifyTender("某個不認識的標案", 0);
    expect(result.category).toBe("other");
  });

  it("負預算不觸發預算規則", () => {
    const result = classifyTender("某個不認識的標案", -100);
    expect(result.category).toBe("other");
  });

  it("空標題只靠預算判斷", () => {
    const result = classifyTender("", 500_000);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("100萬以下");
  });

  it("超過100萬的無關標案 → other", () => {
    const result = classifyTender("某個不認識的大標案", 1_500_000);
    expect(result.category).toBe("other");
  });
});

// ── 自訂規則 ──────────────────────────────────────────────

describe("classifyTender（自訂規則）", () => {
  const customRules: KeywordRule[] = [
    { category: "must", keywords: ["AI", "人工智慧"], label: "AI 相關" },
    { category: "exclude", keywords: ["軍事"], label: "軍事" },
    { category: "review", keywords: ["研究"], label: "研究類" },
  ];

  it("自訂 must 規則", () => {
    const result = classifyTender("AI 智慧應用計畫", 2_000_000, customRules);
    expect(result.category).toBe("must");
    expect(result.matchedLabel).toBe("AI 相關");
  });

  it("自訂 exclude 規則", () => {
    const result = classifyTender("軍事設施維護", 500_000, customRules);
    expect(result.category).toBe("exclude");
  });

  it("自訂 review 規則", () => {
    const result = classifyTender("環境研究調查計畫", 3_000_000, customRules);
    expect(result.category).toBe("review");
  });

  it("空規則 → 全部 other", () => {
    const result = classifyTender("任何標案", 500_000, []);
    expect(result.category).toBe("other");
  });
});

// ── classifyTenders（批次）────────────────────────────────

describe("classifyTenders", () => {
  const tenders: ScanTender[] = [
    {
      title: "食農教育推廣",
      unit: "教育局",
      jobNumber: "J001",
      budget: 500_000,
      deadline: "2026-03-15",
      publishDate: "2026-02-27",
      url: "https://pcc.g0v.ronny.tw/tender/J001",
    },
    {
      title: "道路工程",
      unit: "工務局",
      jobNumber: "J002",
      budget: 5_000_000,
      deadline: "2026-04-01",
      publishDate: "2026-02-27",
      url: "https://pcc.g0v.ronny.tw/tender/J002",
    },
    {
      title: "課後服務委辦",
      unit: "教育局",
      jobNumber: "J003",
      budget: 300_000,
      deadline: "2026-03-20",
      publishDate: "2026-02-27",
      url: "https://pcc.g0v.ronny.tw/tender/J003",
    },
  ];

  it("批次分類正確", () => {
    const results = classifyTenders(tenders);
    expect(results).toHaveLength(3);
    expect(results[0].classification.category).toBe("must");
    expect(results[1].classification.category).toBe("other");
    expect(results[2].classification.category).toBe("exclude");
  });

  it("保留原始標案資料", () => {
    const results = classifyTenders(tenders);
    expect(results[0].tender.title).toBe("食農教育推廣");
    expect(results[0].tender.budget).toBe(500_000);
  });
});

// ── countByCategory ──────────────────────────────────────

describe("countByCategory", () => {
  it("正確統計各類數量", () => {
    const results = classifyTenders([
      { title: "食農教育", unit: "", jobNumber: "", budget: 500_000, deadline: "", publishDate: "", url: "" },
      { title: "藝術計畫", unit: "", jobNumber: "", budget: 2_000_000, deadline: "", publishDate: "", url: "" },
      { title: "燈節策展", unit: "", jobNumber: "", budget: 5_000_000, deadline: "", publishDate: "", url: "" },
      { title: "課後服務", unit: "", jobNumber: "", budget: 300_000, deadline: "", publishDate: "", url: "" },
      { title: "道路工程", unit: "", jobNumber: "", budget: 3_000_000, deadline: "", publishDate: "", url: "" },
    ]);
    const counts = countByCategory(results);
    expect(counts.must).toBe(2);       // 食農教育、藝術
    expect(counts.review).toBe(1);     // 燈節
    expect(counts.exclude).toBe(1);    // 課後服務
    expect(counts.other).toBe(1);      // 道路工程
  });

  it("空結果", () => {
    const counts = countByCategory([]);
    expect(counts.must).toBe(0);
    expect(counts.review).toBe(0);
    expect(counts.exclude).toBe(0);
    expect(counts.other).toBe(0);
  });
});

// ── sortByPriority ───────────────────────────────────────

describe("sortByPriority", () => {
  it("must 排最前，exclude 排最後", () => {
    const results = classifyTenders([
      { title: "道路工程", unit: "", jobNumber: "", budget: 3_000_000, deadline: "", publishDate: "", url: "" },
      { title: "課後服務", unit: "", jobNumber: "", budget: 300_000, deadline: "", publishDate: "", url: "" },
      { title: "食農教育", unit: "", jobNumber: "", budget: 500_000, deadline: "", publishDate: "", url: "" },
      { title: "燈節策展", unit: "", jobNumber: "", budget: 5_000_000, deadline: "", publishDate: "", url: "" },
    ]);
    const sorted = sortByPriority(results);
    expect(sorted[0].classification.category).toBe("must");
    expect(sorted[1].classification.category).toBe("review");
    expect(sorted[2].classification.category).toBe("other");
    expect(sorted[3].classification.category).toBe("exclude");
  });

  it("不修改原陣列", () => {
    const results = classifyTenders([
      { title: "道路工程", unit: "", jobNumber: "", budget: 3_000_000, deadline: "", publishDate: "", url: "" },
      { title: "食農教育", unit: "", jobNumber: "", budget: 500_000, deadline: "", publishDate: "", url: "" },
    ]);
    const original = [...results];
    sortByPriority(results);
    expect(results[0].tender.title).toBe(original[0].tender.title);
  });
});
