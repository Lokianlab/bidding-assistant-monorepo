"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/data/config/stages";
import { useState } from "react";
import { toast } from "sonner";

interface PromptTemplate {
  stageId: string;
  stageName: string;
  phase: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: string;
  isDefault: boolean; // 是否為預設的 L1-L8（不可刪除）
}

const STORAGE_KEY = "bidding-assistant-prompts";

const DEFAULT_STAGE_IDS = new Set(STAGES.map((s) => s.id));

function buildDefaultPrompts(): PromptTemplate[] {
  return STAGES.map((s) => ({
    stageId: s.id,
    stageName: s.name,
    phase: s.phase,
    systemPrompt: `你是一位資深的標案顧問，正在協助「${s.name}」階段的工作。\n\n請依照以下原則：\n1. 使用正式的政府標案用語\n2. 避免使用禁用詞（如：豐富的經驗、全方位等）\n3. 內容需具體、可執行\n4. 數據需可查證`,
    userPromptTemplate: `請根據以下資料，執行「${s.name}」：\n\n---\n{{輸入資料}}\n---\n\n產出：${s.expectedOutput}`,
    outputFormat: s.expectedOutput,
    isDefault: true,
  }));
}

/** 從 localStorage 載入已儲存的提示詞，若無則回傳預設值 */
function loadPrompts(): PromptTemplate[] {
  if (typeof window === "undefined") return buildDefaultPrompts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PromptTemplate[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 確保 isDefault 欄位存在（相容舊格式）
        return parsed.map((p) => ({
          ...p,
          isDefault: p.isDefault ?? DEFAULT_STAGE_IDS.has(p.stageId),
        }));
      }
    }
  } catch {}
  return buildDefaultPrompts();
}

export default function PromptsPage() {
  // 使用 lazy initializer 直接從 localStorage 載入（loadPrompts 內有 SSR guard）
  const [hydrated] = useState(() => typeof window !== "undefined");
  const [prompts, setPrompts] = useState<PromptTemplate[]>(() => loadPrompts());
  const [activeStage, setActiveStage] = useState("L1");
  const [search, setSearch] = useState("");

  // 新增階段用的 state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhase, setNewPhase] = useState("投標");

  const current = prompts.find((p) => p.stageId === activeStage);

  function updatePrompt(stageId: string, patch: Partial<PromptTemplate>) {
    setPrompts(prompts.map((p) => (p.stageId === stageId ? { ...p, ...patch } : p)));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    toast.success("提示詞已儲存");
  }

  function handleReset() {
    const defaults = buildDefaultPrompts();
    // 保留使用者自訂的（非預設）階段
    const custom = prompts.filter((p) => !p.isDefault);
    setPrompts([...defaults, ...custom]);
    toast.success("已還原預設的 L1-L8 提示詞（自訂階段保留）");
  }

  function handleAdd() {
    const id = newId.trim().toUpperCase();
    const name = newName.trim();
    if (!id || !name) {
      toast.error("請填寫階段 ID 和名稱");
      return;
    }
    if (prompts.some((p) => p.stageId === id)) {
      toast.error(`階段 ID「${id}」已存在`);
      return;
    }
    const newPrompt: PromptTemplate = {
      stageId: id,
      stageName: name,
      phase: newPhase,
      systemPrompt: `你是一位資深的標案顧問，正在協助「${name}」階段的工作。\n\n請依照以下原則：\n1. 使用正式的政府標案用語\n2. 避免使用禁用詞\n3. 內容需具體、可執行`,
      userPromptTemplate: `請根據以下資料，執行「${name}」：\n\n---\n{{輸入資料}}\n---`,
      outputFormat: "",
      isDefault: false,
    };
    setPrompts([...prompts, newPrompt]);
    setActiveStage(id);
    setShowAddForm(false);
    setNewId("");
    setNewName("");
    toast.success(`已新增階段「${name}」`);
  }

  function handleDelete(stageId: string) {
    const target = prompts.find((p) => p.stageId === stageId);
    if (!target) return;
    if (target.isDefault) {
      toast.error("預設階段（L1-L8）不可刪除");
      return;
    }
    const next = prompts.filter((p) => p.stageId !== stageId);
    setPrompts(next);
    if (activeStage === stageId) {
      setActiveStage(next[0]?.stageId ?? "L1");
    }
    toast.success(`已刪除階段「${target.stageName}」`);
  }

  function handleDuplicate(stageId: string) {
    const source = prompts.find((p) => p.stageId === stageId);
    if (!source) return;
    // 生成不重複的 ID
    let counter = 1;
    let newDupId = `${stageId}_${counter}`;
    while (prompts.some((p) => p.stageId === newDupId)) {
      counter++;
      newDupId = `${stageId}_${counter}`;
    }
    const dup: PromptTemplate = {
      ...source,
      stageId: newDupId,
      stageName: `${source.stageName}（副本）`,
      isDefault: false,
    };
    setPrompts([...prompts, dup]);
    setActiveStage(newDupId);
    toast.success(`已複製「${source.stageName}」`);
  }

  function countTokensEstimate(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.round(chineseChars * 2 + otherChars / 4);
  }

  if (!hydrated) return null;
  if (!current) return null;

  const totalTokens = countTokensEstimate(current.systemPrompt + current.userPromptTemplate);

  const filteredPrompts = prompts.filter(
    (p) =>
      search === "" ||
      p.stageName.includes(search) ||
      p.stageId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">提示詞編輯器</h1>
        <p className="text-muted-foreground mt-1">
          編輯各 AI 階段的 System Prompt 與 User Prompt 範本，可新增自訂階段
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側：階段選擇 */}
        <div className="space-y-2">
          <Input
            placeholder="搜尋階段..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          {filteredPrompts.map((p) => (
            <div key={p.stageId} className="flex items-center gap-1">
              <button
                onClick={() => setActiveStage(p.stageId)}
                className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeStage === p.stageId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {p.stageId}
                    </Badge>
                    <span className="truncate">{p.stageName}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {p.phase}
                  </Badge>
                </div>
              </button>
              {/* 複製按鈕 */}
              <button
                onClick={() => handleDuplicate(p.stageId)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
                title="複製此階段"
              >
                📋
              </button>
              {/* 刪除按鈕（僅自訂階段可刪） */}
              {!p.isDefault && (
                <button
                  onClick={() => handleDelete(p.stageId)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs"
                  title="刪除此階段"
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          <Separator className="my-2" />

          {/* 新增階段 */}
          {showAddForm ? (
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <p className="text-sm font-medium">新增階段</p>
              <Input
                placeholder="階段 ID（如 L9）"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
              <Input
                placeholder="階段名稱"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                className="w-full text-sm border rounded px-2 py-1.5"
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
              >
                <option value="投標">投標</option>
                <option value="評選">評選</option>
                <option value="其他">其他</option>
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} className="flex-1">
                  確定新增
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              ＋ 新增階段
            </Button>
          )}
        </div>

        {/* 右側：編輯區 */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge className="font-mono">{current.stageId}</Badge>
                    {current.stageName}
                    {!current.isDefault && (
                      <Badge variant="secondary" className="text-xs">自訂</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-xs text-muted-foreground">階段名稱</Label>
                    <Input
                      className="h-7 text-sm w-48"
                      value={current.stageName}
                      onChange={(e) =>
                        updatePrompt(activeStage, { stageName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">~{totalTokens} tokens</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    階段：{current.phase}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="system">
            <TabsList>
              <TabsTrigger value="system">System Prompt</TabsTrigger>
              <TabsTrigger value="user">User Prompt 範本</TabsTrigger>
              <TabsTrigger value="preview">預覽</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>System Prompt</Label>
                      <span className="text-xs text-muted-foreground">
                        {current.systemPrompt.length} 字
                      </span>
                    </div>
                    <Textarea
                      value={current.systemPrompt}
                      onChange={(e) =>
                        updatePrompt(activeStage, { systemPrompt: e.target.value })
                      }
                      rows={16}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>User Prompt 範本</Label>
                      <span className="text-xs text-muted-foreground">
                        {current.userPromptTemplate.length} 字
                      </span>
                    </div>
                    <Textarea
                      value={current.userPromptTemplate}
                      onChange={(e) =>
                        updatePrompt(activeStage, { userPromptTemplate: e.target.value })
                      }
                      rows={16}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      可用變數：{"{{輸入資料}}"} {"{{案名}}"} {"{{公司名}}"} {"{{階段名}}"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">SYSTEM</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">
                      {current.systemPrompt}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">USER</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">
                      {current.userPromptTemplate}
                    </div>
                  </div>
                  {current.outputFormat && (
                    <div className="text-right">
                      <Badge variant="outline">
                        預期產出：{current.outputFormat}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset}>
              還原預設
            </Button>
            <Button onClick={handleSave}>儲存所有提示詞</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
