"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { TemplateSelector } from "./TemplateSelector";
import { ChapterList } from "./ChapterList";
import { ChapterEditor } from "./ChapterEditor";
import { ExportPanel } from "./ExportPanel";
import { AssemblyWarnings } from "./AssemblyWarnings";
import { DocumentPreview } from "./DocumentPreview";

import { useDocumentAssembly } from "@/lib/output/useDocumentAssembly";
import { useExport } from "@/lib/output/useExport";
import { getTemplateById } from "@/lib/output/template-manager";
import { useSettings } from "@/lib/context/settings-context";
import type { ExportFormat } from "@/lib/output/types";

export function DocumentWorkbench() {
  const { settings } = useSettings();
  const {
    templateId,
    projectName,
    chapters,
    setTemplateId,
    setProjectName,
    updateChapter,
    addChapter,
    removeChapter,
    moveChapter,
    assemble,
  } = useDocumentAssembly();

  const { isExporting, lastError, doExport, downloadBlob } = useExport();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    chapters[0]?.id ?? null
  );
  const [printHtml, setPrintHtml] = useState<string | null>(null);

  const currentTemplate = getTemplateById(templateId);
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? null;
  const selectedIndex = chapters.findIndex((c) => c.id === selectedChapterId);
  const templateChapterMeta = currentTemplate?.chapters[selectedIndex];

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    // 切換範本後選第一章
    setTimeout(() => {
      setSelectedChapterId(null);
    }, 0);
  };

  const handleAddChapter = () => {
    addChapter();
    // 選取新加入的最後一章
    setTimeout(() => {
      setSelectedChapterId(null);
    }, 0);
  };

  const handleExport = async (opts: {
    format: ExportFormat;
    coverPage: boolean;
    tableOfContents: boolean;
  }) => {
    const assembled = assemble();
    const result = await doExport({
      format: opts.format,
      template: templateId,
      chapters: assembled.chapters,
      documentSettings: settings.document,
      projectName: projectName || "未命名案件",
      companyName: settings.company.name,
      coverPage: opts.coverPage,
      tableOfContents: opts.tableOfContents,
    });

    if (!result) return;

    if (result.format === "docx") {
      downloadBlob(result.blob, result.filename);
    } else if (result.format === "markdown") {
      const blob = new Blob([result.text], { type: "text/markdown;charset=utf-8" });
      downloadBlob(blob, result.filename);
    } else if (result.format === "print") {
      setPrintHtml(result.html);
    }
  };

  // 組裝警告（即時顯示）
  const assembled = assemble();
  const warnings = assembled.warnings;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 border rounded-lg overflow-hidden">
      {/* 左側欄：範本 + 章節列表 + 案件資訊 */}
      <div className="w-56 flex flex-col border-r bg-muted/30 p-3 gap-4">
        <TemplateSelector
          selectedId={templateId}
          onChange={handleTemplateChange}
        />

        <Separator />

        <div className="flex-1 min-h-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">章節列表</p>
          <ChapterList
            chapters={chapters}
            selectedId={selectedChapterId}
            onSelect={setSelectedChapterId}
            onAdd={handleAddChapter}
            onRemove={removeChapter}
            onMove={moveChapter}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">案件資訊</p>
          <div className="space-y-1">
            <Label htmlFor="project-name" className="text-xs">
              案名
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="案件名稱"
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 主編輯區 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {selectedChapter ? (
            <ChapterEditor
              chapter={selectedChapter}
              index={selectedIndex}
              guideText={templateChapterMeta?.guideText}
              suggestedLength={templateChapterMeta?.suggestedLength}
              onUpdate={updateChapter}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              從左側選擇一個章節開始編輯
            </div>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="border-t p-3 max-h-32 overflow-y-auto">
            <AssemblyWarnings warnings={warnings} />
          </div>
        )}
      </div>

      {/* 右側欄：匯出設定 */}
      <div className="w-52 border-l bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-3">匯出設定</p>
        <ExportPanel
          isExporting={isExporting}
          errorMessage={lastError}
          onExport={handleExport}
        />
      </div>

      {/* 列印預覽對話框 */}
      {printHtml !== null && (
        <DocumentPreview
          html={printHtml}
          projectName={projectName || "未命名案件"}
          open={printHtml !== null}
          onClose={() => setPrintHtml(null)}
        />
      )}
    </div>
  );
}
