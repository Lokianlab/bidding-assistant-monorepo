"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { STAGES } from "@/data/config/stages";
import { PROMPT_FILES, RULE_MAP } from "@/data/config/prompt-assembly";
import { StageCard, ToolCard } from "@/components/prompt-library/StageCard";
import { StageFileList } from "@/components/prompt-library/StageFileList";
import { KBMatrixTable } from "@/components/prompt-library/KBMatrixTable";
import { EmergencyCopyPanel } from "@/components/prompt-library/EmergencyCopyPanel";

export default function PromptLibraryPage() {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const selectedStage = selectedStageId
    ? STAGES.find((s) => s.id === selectedStageId) ?? null
    : null;

  // 工具類檔案（T1, T3）
  const toolFiles = PROMPT_FILES.filter((f) => f.category === "tool");

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <MobileMenuButton />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">模板庫</h1>
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
              L1-L8 階段提示詞、知識庫引用矩陣與緊急協作工具
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stages">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="stages" className="text-xs sm:text-sm">
            階段總覽
          </TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs sm:text-sm">
            知識庫矩陣
          </TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs sm:text-sm">
            緊急協作
          </TabsTrigger>
        </TabsList>

        {/* 階段總覽 */}
        <TabsContent value="stages" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {STAGES.map((stage) => {
              const rule = RULE_MAP[stage.id];
              const fileCount = rule
                ? rule.alwaysLoad.length + 1 + rule.extraSpecs.length + Object.keys(rule.kb).length
                : 0;
              return (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  fileCount={fileCount}
                  selected={selectedStageId === stage.id}
                  onClick={() =>
                    setSelectedStageId(
                      selectedStageId === stage.id ? null : stage.id,
                    )
                  }
                />
              );
            })}
            {/* 工具卡片 */}
            {toolFiles.map((file) => (
              <ToolCard
                key={file.id}
                file={file}
                selected={false}
                onClick={() => {}}
              />
            ))}
          </div>

          {/* 階段檔案清單 Dialog */}
          {selectedStage && (
            <StageFileList
              stage={selectedStage}
              open={!!selectedStage}
              onClose={() => setSelectedStageId(null)}
            />
          )}
        </TabsContent>

        {/* 知識庫矩陣 */}
        <TabsContent value="matrix" className="mt-4">
          <KBMatrixTable />
        </TabsContent>

        {/* 緊急協作 */}
        <TabsContent value="emergency" className="mt-4">
          <EmergencyCopyPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
