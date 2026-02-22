import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ── mock useSettings ───────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: {
      document: {},
      company: { name: "大員洛川顧問有限公司" },
    },
    updateSettings: vi.fn(),
  }),
}));

// ── mock useDocumentAssembly ──────────────────────────────

vi.mock("@/lib/output/useDocumentAssembly", () => ({
  useDocumentAssembly: () => ({
    templateId: "general",
    projectName: "",
    chapters: [],
    setTemplateId: vi.fn(),
    setProjectName: vi.fn(),
    updateChapter: vi.fn(),
    addChapter: vi.fn(),
    removeChapter: vi.fn(),
    moveChapter: vi.fn(),
    assemble: () => ({ chapters: [], warnings: [] }),
  }),
}));

// ── mock useExport ────────────────────────────────────────

vi.mock("@/lib/output/useExport", () => ({
  useExport: () => ({
    isExporting: false,
    lastError: null,
    doExport: vi.fn(),
    downloadBlob: vi.fn(),
  }),
}));

// ── mock getTemplateById ──────────────────────────────────

vi.mock("@/lib/output/template-manager", () => ({
  getTemplateById: () => ({
    id: "general",
    name: "通用範本",
    chapters: [],
  }),
}));

// ── mock 子元件 ────────────────────────────────────────────

vi.mock("../TemplateSelector", () => ({
  TemplateSelector: () => createElement("div", { "data-testid": "template-selector" }),
}));

vi.mock("../ChapterList", () => ({
  ChapterList: () => createElement("div", { "data-testid": "chapter-list" }),
}));

vi.mock("../ChapterEditor", () => ({
  ChapterEditor: () => createElement("div", { "data-testid": "chapter-editor" }),
}));

vi.mock("../ExportPanel", () => ({
  ExportPanel: () => createElement("div", { "data-testid": "export-panel" }),
}));

vi.mock("../AssemblyWarnings", () => ({
  AssemblyWarnings: () => createElement("div", { "data-testid": "assembly-warnings" }),
}));

vi.mock("../DocumentPreview", () => ({
  DocumentPreview: () => createElement("div", { "data-testid": "document-preview" }),
}));

async function getDocumentWorkbench() {
  const mod = await import("../DocumentWorkbench");
  return mod.DocumentWorkbench;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("DocumentWorkbench — 基本渲染", () => {
  it("渲染 TemplateSelector", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByTestId("template-selector")).toBeTruthy();
  });

  it("渲染 ChapterList", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByTestId("chapter-list")).toBeTruthy();
  });

  it("渲染 ExportPanel", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByTestId("export-panel")).toBeTruthy();
  });

  it("顯示「章節列表」標籤", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByText("章節列表")).toBeTruthy();
  });

  it("顯示「案名」輸入欄位", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByPlaceholderText("案件名稱")).toBeTruthy();
  });

  it("顯示「匯出設定」標籤", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByText("匯出設定")).toBeTruthy();
  });

  it("無選中章節時顯示「從左側選擇一個章節開始編輯」", async () => {
    const DocumentWorkbench = await getDocumentWorkbench();
    render(createElement(DocumentWorkbench, {}));
    expect(screen.getByText("從左側選擇一個章節開始編輯")).toBeTruthy();
  });
});
