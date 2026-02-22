import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadCaseById } from "../helpers";

vi.mock("@/lib/dashboard/helpers", () => ({
  loadCache: vi.fn(),
}));

import { loadCache } from "@/lib/dashboard/helpers";
const mockedLoadCache = loadCache as ReturnType<typeof vi.fn>;

describe("loadCaseById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("快取為空時回傳 null", () => {
    mockedLoadCache.mockReturnValue(null);
    expect(loadCaseById("page-1")).toBeNull();
  });

  it("快取 pages 為空陣列時回傳 null", () => {
    mockedLoadCache.mockReturnValue({ pages: [] });
    expect(loadCaseById("page-1")).toBeNull();
  });

  it("找不到 page ID 時回傳 null", () => {
    mockedLoadCache.mockReturnValue({
      pages: [{ id: "page-2", properties: {} }],
    });
    expect(loadCaseById("page-1")).toBeNull();
  });

  it("找到匹配的 page 時回傳該 page", () => {
    const page = { id: "page-1", url: "#", properties: { name: "test" } };
    mockedLoadCache.mockReturnValue({ pages: [page, { id: "page-2" }] });
    expect(loadCaseById("page-1")).toEqual(page);
  });

  it("多個 page 中精確匹配", () => {
    const pages = [
      { id: "abc-1", properties: { name: "A" } },
      { id: "abc-2", properties: { name: "B" } },
      { id: "abc-3", properties: { name: "C" } },
    ];
    mockedLoadCache.mockReturnValue({ pages });
    expect(loadCaseById("abc-2")).toEqual(pages[1]);
  });
});
