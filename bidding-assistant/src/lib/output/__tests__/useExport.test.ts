import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport, FORMAT_LABELS } from "../useExport";
import type { ExportOptions } from "../types";
import type { DocumentSettings } from "@/lib/settings/types";

// ── Mock export-engine ─────────────────────────────────────────

vi.mock("../export-engine", () => ({
  exportDocument: vi.fn(),
}));

import { exportDocument } from "../export-engine";
const mockExportDocument = vi.mocked(exportDocument);

// ── 共用測試資料 ───────────────────────────────────────────────

const mockDocSettings: DocumentSettings = {
  fonts: { body: "標楷體", heading: "標楷體", headerFooter: "標楷體", customFonts: [] },
  fontSize: { body: 12, h1: 18, h2: 16, h3: 14, h4: 13 },
  page: {
    size: "A4",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    lineSpacing: 1.5,
    paragraphSpacing: { before: 0, after: 6 },
  },
  header: { template: "" },
  footer: { template: "" },
  driveNamingRule: "",
};

const mockOptions: ExportOptions = {
  format: "docx",
  template: "proposal-standard",
  chapters: [{ title: "第壹章", content: "內容" }],
  documentSettings: mockDocSettings,
  projectName: "測試標案",
  companyName: "大員洛川",
};

const mockDocxResult = {
  format: "docx" as const,
  blob: new Blob(["test"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
  filename: "測試標案.docx",
};

// ── 初始狀態 ──────────────────────────────────────────────────

describe("useExport — 初始狀態", () => {
  it("初始 isExporting = false", () => {
    const { result } = renderHook(() => useExport());
    expect(result.current.isExporting).toBe(false);
  });

  it("初始 lastError = null", () => {
    const { result } = renderHook(() => useExport());
    expect(result.current.lastError).toBeNull();
  });
});

// ── doExport 成功路徑 ──────────────────────────────────────────

describe("useExport — doExport() 成功", () => {
  beforeEach(() => {
    mockExportDocument.mockResolvedValue(mockDocxResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("成功後 isExporting 回到 false", async () => {
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(result.current.isExporting).toBe(false);
  });

  it("成功後回傳 ExportResult", async () => {
    const { result } = renderHook(() => useExport());

    let exportResult: Awaited<ReturnType<typeof result.current.doExport>>;
    await act(async () => {
      exportResult = await result.current.doExport(mockOptions);
    });

    expect(exportResult!).not.toBeNull();
    expect(exportResult!).toEqual(mockDocxResult);
  });

  it("成功後 lastError 保持 null", async () => {
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(result.current.lastError).toBeNull();
  });

  it("呼叫了 exportDocument（轉發選項）", async () => {
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(mockExportDocument).toHaveBeenCalledWith(mockOptions);
    expect(mockExportDocument).toHaveBeenCalledTimes(1);
  });
});

// ── doExport 錯誤路徑 ──────────────────────────────────────────

describe("useExport — doExport() 失敗", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Error 拋出 → lastError 設為 message", async () => {
    mockExportDocument.mockRejectedValue(new Error("DOCX 生成失敗"));
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(result.current.lastError).toBe("DOCX 生成失敗");
  });

  it("非 Error 拋出 → lastError 使用預設訊息", async () => {
    mockExportDocument.mockRejectedValue("字串錯誤");
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(result.current.lastError).toBe("匯出失敗，請稍後再試");
  });

  it("失敗後回傳 null", async () => {
    mockExportDocument.mockRejectedValue(new Error("失敗"));
    const { result } = renderHook(() => useExport());

    let exportResult: Awaited<ReturnType<typeof result.current.doExport>>;
    await act(async () => {
      exportResult = await result.current.doExport(mockOptions);
    });

    expect(exportResult!).toBeNull();
  });

  it("失敗後 isExporting 回到 false", async () => {
    mockExportDocument.mockRejectedValue(new Error("失敗"));
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });

    expect(result.current.isExporting).toBe(false);
  });

  it("第二次呼叫前 lastError 清空", async () => {
    // 先失敗 → 再成功
    mockExportDocument
      .mockRejectedValueOnce(new Error("第一次失敗"))
      .mockResolvedValueOnce(mockDocxResult);

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.doExport(mockOptions);
    });
    expect(result.current.lastError).toBe("第一次失敗");

    await act(async () => {
      await result.current.doExport(mockOptions);
    });
    // 成功後 lastError 應被清空
    expect(result.current.lastError).toBeNull();
  });
});

// ── downloadBlob ──────────────────────────────────────────────

describe("useExport — downloadBlob()", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: () => void;

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue("blob:http://localhost/fake");
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });

    clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node: Node) => node);
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node: Node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("呼叫 URL.createObjectURL", () => {
    const blob = new Blob(["test"]);
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.downloadBlob(blob, "test.docx");
    });

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
  });

  it("點擊 <a> 觸發下載", () => {
    const blob = new Blob(["test"]);
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.downloadBlob(blob, "test.docx");
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("呼叫 URL.revokeObjectURL 清理", () => {
    const blob = new Blob(["test"]);
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.downloadBlob(blob, "test.docx");
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:http://localhost/fake");
  });

  it("appendChild 以 <a> 元素呼叫，removeChild 各一次", () => {
    const blob = new Blob(["test"]);
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.downloadBlob(blob, "test.docx");
    });

    // renderHook 本身也會呼叫 appendChild，只驗證有帶 <a> 元素的呼叫存在
    const anchorCalls = appendChildSpy.mock.calls.filter(
      ([node]: [Node]) => (node as HTMLElement).tagName === "A"
    );
    expect(anchorCalls.length).toBe(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });
});

// ── FORMAT_LABELS ─────────────────────────────────────────────

describe("FORMAT_LABELS", () => {
  it("docx 格式有中文標籤", () => {
    expect(FORMAT_LABELS.docx).toBeTruthy();
    expect(FORMAT_LABELS.docx).toContain("docx");
  });

  it("markdown 格式有中文標籤", () => {
    expect(FORMAT_LABELS.markdown).toBeTruthy();
    expect(FORMAT_LABELS.markdown.toLowerCase()).toContain("markdown");
  });

  it("print 格式有中文標籤", () => {
    expect(FORMAT_LABELS.print).toBeTruthy();
  });

  it("涵蓋三種格式", () => {
    const formats = Object.keys(FORMAT_LABELS);
    expect(formats).toContain("docx");
    expect(formats).toContain("markdown");
    expect(formats).toContain("print");
    expect(formats).toHaveLength(3);
  });
});
