"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";
import { toast } from "sonner";
import { generateDocx, downloadBlob } from "@/lib/docgen/generate-docx";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

export default function DocxPage() {
  const { settings } = useSettings();
  const [projectName, setProjectName] = useState("");
  const [generating, setGenerating] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "1", title: "第壹章 計畫緣起與目的", content: "" },
    { id: "2", title: "第貳章 工作內容與方法", content: "" },
    { id: "3", title: "第參章 組織架構與人力配置", content: "" },
    { id: "4", title: "第肆章 預定工作進度", content: "" },
    { id: "5", title: "第伍章 經費概算", content: "" },
  ]);

  function addChapter() {
    const num = chapters.length + 1;
    setChapters([
      ...chapters,
      { id: String(Date.now()), title: `第${num}章 新章節`, content: "" },
    ]);
  }

  function removeChapter(id: string) {
    setChapters(chapters.filter((c) => c.id !== id));
  }

  function updateChapter(id: string, patch: Partial<Chapter>) {
    setChapters(chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function moveChapter(id: string, direction: "up" | "down") {
    const idx = chapters.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;
    const next = [...chapters];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setChapters(next);
  }

  async function handleGenerate() {
    if (!projectName.trim()) {
      toast.error("請輸入案名");
      return;
    }

    const hasContent = chapters.some((c) => c.content.trim());
    if (!hasContent) {
      toast.error("請至少在一個章節中輸入內容");
      return;
    }

    setGenerating(true);
    try {
      const blob = await generateDocx({
        projectName,
        chapters: chapters.filter((c) => c.content.trim()),
        documentSettings: settings.document,
        companySettings: settings.company,
      });
      const filename = `${projectName}.docx`;
      downloadBlob(blob, filename);
      toast.success("DOCX 文件已生成並下載");
    } catch (err) {
      toast.error(`生成失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setGenerating(false);
    }
  }

  const totalChars = chapters.reduce((s, c) => s + c.content.length, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">文件生成</h1>
        <p className="text-muted-foreground mt-1">
          將各階段 AI 產出的內容貼入對應章節，點選「生成」即可輸出 DOCX 建議書文件。
          章節可自由新增、刪除和調整順序，右側會顯示目前的文件格式設定摘要。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：章節編輯 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">文件資訊</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>案名</Label>
                  <Input
                    placeholder="輸入標案名稱..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>輸出格式</Label>
                  <div className="flex items-center h-9 px-3 border rounded-md text-sm text-muted-foreground">
                    DOCX
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">章節內容</CardTitle>
                <Button size="sm" variant="outline" onClick={addChapter}>
                  新增章節
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {chapters.map((ch, idx) => (
                  <AccordionItem key={ch.id} value={ch.id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {idx + 1}
                        </Badge>
                        <span>{ch.title}</span>
                        <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                          {ch.content.length} 字
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label>章節標題</Label>
                        <Input
                          value={ch.title}
                          onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>內容</Label>
                        <Textarea
                          placeholder="輸入或貼上章節內容..."
                          value={ch.content}
                          onChange={(e) => updateChapter(ch.id, { content: e.target.value })}
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveChapter(ch.id, "up")}
                          disabled={idx === 0}
                        >
                          上移
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveChapter(ch.id, "down")}
                          disabled={idx === chapters.length - 1}
                        >
                          下移
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive ml-auto"
                          onClick={() => removeChapter(ch.id)}
                        >
                          刪除章節
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* 右側：摘要與生成 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">文件摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">章節數</span>
                <span>{chapters.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">總字數</span>
                <span>{totalChars.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">字型</span>
                <span>{settings.document.fonts.body}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">紙張</span>
                <span>{settings.document.page.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">行距</span>
                <span>{settings.document.page.lineSpacing}</span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                至「設定 → 輸出文件設定」調整格式
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">生成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? "生成中..." : "生成 DOCX"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
