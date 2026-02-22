import { describe, it, expect } from "vitest";
import { mapTenderToNotionProperties, buildCreatePageBody } from "../notion-mapper";
import type { ScanTender } from "../types";
import { DEFAULT_FIELD_MAP } from "@/lib/constants/field-mapping";

function makeTender(overrides?: Partial<ScanTender>): ScanTender {
  return {
    title: "食農教育推廣計畫",
    unit: "教育局",
    jobNumber: "J001",
    budget: 500_000,
    deadline: "20260315",
    publishDate: "20260228",
    url: "https://pcc.g0v.ronny.tw/tender/J001",
    category: "招標公告",
    ...overrides,
  };
}

describe("mapTenderToNotionProperties", () => {
  it("完整標案轉換所有欄位", () => {
    const props = mapTenderToNotionProperties(makeTender());

    // 標案名稱 (title)
    expect(props[DEFAULT_FIELD_MAP.名稱]).toEqual({
      title: [{ text: { content: "食農教育推廣計畫" } }],
    });

    // 招標機關
    expect(props[DEFAULT_FIELD_MAP.招標機關]).toEqual({
      rich_text: [{ text: { content: "教育局" } }],
    });

    // 案號
    expect(props[DEFAULT_FIELD_MAP.案號]).toEqual({
      rich_text: [{ text: { content: "J001" } }],
    });

    // 預算金額
    expect(props[DEFAULT_FIELD_MAP.預算]).toEqual({ number: 500_000 });

    // 截標時間
    expect(props[DEFAULT_FIELD_MAP.截標]).toEqual({
      date: { start: "2026-03-15" },
    });

    // 案件唯一碼
    expect(props[DEFAULT_FIELD_MAP.唯一碼]).toEqual({
      rich_text: [{ text: { content: "PCC-J001" } }],
    });

    // 標案類型
    expect(props[DEFAULT_FIELD_MAP.標案類型]).toEqual({
      multi_select: [{ name: "招標公告" }],
    });

    // 預設值
    expect(props[DEFAULT_FIELD_MAP.進程]).toEqual({ status: { name: "To-do" } });
    expect(props[DEFAULT_FIELD_MAP.決策]).toEqual({ select: { name: "入選" } });
  });

  it("預算為 0 時不填預算欄位", () => {
    const props = mapTenderToNotionProperties(makeTender({ budget: 0 }));
    expect(props[DEFAULT_FIELD_MAP.預算]).toBeUndefined();
  });

  it("空截標時間不填日期欄位", () => {
    const props = mapTenderToNotionProperties(makeTender({ deadline: "" }));
    expect(props[DEFAULT_FIELD_MAP.截標]).toBeUndefined();
  });

  it("空機關不填招標機關欄位", () => {
    const props = mapTenderToNotionProperties(makeTender({ unit: "" }));
    expect(props[DEFAULT_FIELD_MAP.招標機關]).toBeUndefined();
  });

  it("空案號不填案號和唯一碼", () => {
    const props = mapTenderToNotionProperties(makeTender({ jobNumber: "" }));
    expect(props[DEFAULT_FIELD_MAP.案號]).toBeUndefined();
    expect(props[DEFAULT_FIELD_MAP.唯一碼]).toBeUndefined();
  });

  it("無標案類型不填", () => {
    const props = mapTenderToNotionProperties(makeTender({ category: undefined }));
    expect(props[DEFAULT_FIELD_MAP.標案類型]).toBeUndefined();
  });

  it("YYYYMMDD 日期格式正確轉為 ISO", () => {
    const props = mapTenderToNotionProperties(makeTender({ deadline: "20260401" }));
    expect(props[DEFAULT_FIELD_MAP.截標]).toEqual({
      date: { start: "2026-04-01" },
    });
  });

  it("ISO 日期格式直接使用", () => {
    const props = mapTenderToNotionProperties(makeTender({ deadline: "2026-04-01" }));
    expect(props[DEFAULT_FIELD_MAP.截標]).toEqual({
      date: { start: "2026-04-01" },
    });
  });

  it("永遠設定預設的進程和決策", () => {
    const props = mapTenderToNotionProperties(makeTender({ title: "最簡標案" }));
    expect(props[DEFAULT_FIELD_MAP.進程]).toEqual({ status: { name: "To-do" } });
    expect(props[DEFAULT_FIELD_MAP.決策]).toEqual({ select: { name: "入選" } });
  });

  it("支援自訂欄位映射", () => {
    const customMap = { ...DEFAULT_FIELD_MAP, 名稱: "Custom Title Field" };
    const props = mapTenderToNotionProperties(makeTender(), customMap);
    expect(props["Custom Title Field"]).toEqual({
      title: [{ text: { content: "食農教育推廣計畫" } }],
    });
  });
});

describe("buildCreatePageBody", () => {
  it("產生正確的 Notion API request body", () => {
    const props = mapTenderToNotionProperties(makeTender());
    const body = buildCreatePageBody("db-123", props);

    expect(body.parent.database_id).toBe("db-123");
    expect(body.properties).toBe(props);
  });
});
