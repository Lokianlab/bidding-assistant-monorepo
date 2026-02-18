"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditableSelect } from "./EditableSelect";
import { useCustomOptions } from "@/lib/knowledge-base/useCustomOptions";
import type {
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KBEntryStatus,
  TimelinePhase,
  SOPStep,
} from "@/lib/knowledge-base/types";

// ====== 00C 時程範本編輯器 ======

interface Props00C {
  initial?: KBEntry00C;
  onSave: (entry: KBEntry00C) => void;
  onCancel: () => void;
  nextId: string;
}

function emptyPhase(): TimelinePhase {
  return { phase: "", duration: "", deliverables: "", checkpoints: "" };
}

export function EntryEditor00C({ initial, onSave, onCancel, nextId }: Props00C) {
  const isEdit = !!initial;
  const { getOptions, addOption, removeOption } = useCustomOptions();
  const [entry, setEntry] = useState<KBEntry00C>(
    initial ?? {
      id: nextId,
      templateName: "",
      applicableType: "",
      budgetRange: "",
      durationRange: "",
      phases: [emptyPhase()],
      warnings: "",
      entryStatus: "draft" as KBEntryStatus,
      updatedAt: new Date().toISOString(),
    }
  );

  function update<K extends keyof KBEntry00C>(key: K, value: KBEntry00C[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  const phaseCount = entry.phases.filter((p) => p.phase).length;
  const defaultOpen: string[] = [];
  if (isEdit || phaseCount > 0) defaultOpen.push("phases");
  if (entry.warnings) defaultOpen.push("warnings");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>編號</Label>
          <Input value={entry.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} />
        </div>
        <div className="space-y-2">
          <Label>範本名稱 *</Label>
          <Input value={entry.templateName} onChange={(e) => update("templateName", e.target.value)} placeholder="展覽策展" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>適用類型</Label>
          <EditableSelect
            value={entry.applicableType}
            onChange={(v) => update("applicableType", v)}
            options={getOptions("00C_type")}
            placeholder="輸入或選擇類型"
            fieldKey="00C_type"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
        <div className="space-y-2">
          <Label>預算範圍</Label>
          <Input value={entry.budgetRange} onChange={(e) => update("budgetRange", e.target.value)} placeholder="80萬-500萬" />
        </div>
        <div className="space-y-2">
          <Label>工期範圍</Label>
          <Input value={entry.durationRange} onChange={(e) => update("durationRange", e.target.value)} placeholder="4-8個月" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>資料狀態</Label>
        <Select value={entry.entryStatus} onValueChange={(v) => update("entryStatus", v as KBEntryStatus)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">啟用</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">封存</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        <AccordionItem value="phases">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              階段規劃
              {phaseCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{phaseCount}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {entry.phases.map((phase, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end">
                  <Input placeholder="階段" value={phase.phase} onChange={(e) => {
                    const arr = [...entry.phases]; arr[i] = { ...phase, phase: e.target.value }; update("phases", arr);
                  }} />
                  <Input placeholder="工期" value={phase.duration} onChange={(e) => {
                    const arr = [...entry.phases]; arr[i] = { ...phase, duration: e.target.value }; update("phases", arr);
                  }} />
                  <Input placeholder="交付物" value={phase.deliverables} onChange={(e) => {
                    const arr = [...entry.phases]; arr[i] = { ...phase, deliverables: e.target.value }; update("phases", arr);
                  }} />
                  <div className="flex gap-1">
                    <Input placeholder="檢核點" value={phase.checkpoints} onChange={(e) => {
                      const arr = [...entry.phases]; arr[i] = { ...phase, checkpoints: e.target.value }; update("phases", arr);
                    }} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => {
                      update("phases", entry.phases.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("phases", [...entry.phases, emptyPhase()])}>
                ＋ 新增階段
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="warnings">
          <AccordionTrigger className="text-sm font-semibold py-3">
            常見低估提醒
          </AccordionTrigger>
          <AccordionContent>
            <Textarea value={entry.warnings} onChange={(e) => update("warnings", e.target.value)} rows={3} placeholder="注意事項..." />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSave({ ...entry, updatedAt: new Date().toISOString() })} disabled={!entry.templateName.trim()}>
          {isEdit ? "更新" : "新增"}
        </Button>
      </div>
    </div>
  );
}

// ====== 00D 應變SOP編輯器 ======

interface Props00D {
  initial?: KBEntry00D;
  onSave: (entry: KBEntry00D) => void;
  onCancel: () => void;
  nextId: string;
}

function emptyStep(): SOPStep {
  return { step: "", action: "", responsible: "" };
}

export function EntryEditor00D({ initial, onSave, onCancel, nextId }: Props00D) {
  const isEdit = !!initial;
  const { getOptions, addOption, removeOption } = useCustomOptions();
  const [entry, setEntry] = useState<KBEntry00D>(
    initial ?? {
      id: nextId,
      riskName: "",
      riskLevel: "中",
      prevention: "",
      responseSteps: [emptyStep()],
      notes: "",
      entryStatus: "draft" as KBEntryStatus,
      updatedAt: new Date().toISOString(),
    }
  );

  function update<K extends keyof KBEntry00D>(key: K, value: KBEntry00D[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  const stepCount = entry.responseSteps.filter((s) => s.action).length;
  const defaultOpen: string[] = [];
  if (isEdit || stepCount > 0) defaultOpen.push("steps");
  if (entry.prevention) defaultOpen.push("prevention");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>編號</Label>
          <Input value={entry.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} />
        </div>
        <div className="space-y-2">
          <Label>風險名稱 *</Label>
          <EditableSelect
            value={entry.riskName}
            onChange={(v) => update("riskName", v)}
            options={getOptions("00D_risk")}
            placeholder="輸入或選擇風險名稱"
            fieldKey="00D_risk"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
        <div className="space-y-2">
          <Label>風險等級</Label>
          <Select value={entry.riskLevel} onValueChange={(v) => update("riskLevel", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="低">低</SelectItem>
              <SelectItem value="中">中</SelectItem>
              <SelectItem value="高">高</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>資料狀態</Label>
        <Select value={entry.entryStatus} onValueChange={(v) => update("entryStatus", v as KBEntryStatus)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">啟用</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">封存</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        <AccordionItem value="prevention">
          <AccordionTrigger className="text-sm font-semibold py-3">
            預防措施
          </AccordionTrigger>
          <AccordionContent>
            <Textarea value={entry.prevention} onChange={(e) => update("prevention", e.target.value)} rows={3} placeholder="事前預防措施..." />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="steps">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              應變步驟
              {stepCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stepCount}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {entry.responseSteps.map((step, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <Input placeholder="步驟" value={step.step} onChange={(e) => {
                    const arr = [...entry.responseSteps]; arr[i] = { ...step, step: e.target.value }; update("responseSteps", arr);
                  }} />
                  <Input placeholder="行動" value={step.action} onChange={(e) => {
                    const arr = [...entry.responseSteps]; arr[i] = { ...step, action: e.target.value }; update("responseSteps", arr);
                  }} />
                  <div className="flex gap-1">
                    <Input placeholder="負責人" value={step.responsible} onChange={(e) => {
                      const arr = [...entry.responseSteps]; arr[i] = { ...step, responsible: e.target.value }; update("responseSteps", arr);
                    }} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => {
                      update("responseSteps", entry.responseSteps.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("responseSteps", [...entry.responseSteps, emptyStep()])}>
                ＋ 新增步驟
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-2">
        <Label>備註</Label>
        <Textarea value={entry.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="備註..." />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSave({ ...entry, updatedAt: new Date().toISOString() })} disabled={!entry.riskName.trim()}>
          {isEdit ? "更新" : "新增"}
        </Button>
      </div>
    </div>
  );
}

// ====== 00E 案後檢討編輯器 ======

interface Props00E {
  initial?: KBEntry00E;
  onSave: (entry: KBEntry00E) => void;
  onCancel: () => void;
  nextId: string;
}

export function EntryEditor00E({ initial, onSave, onCancel, nextId }: Props00E) {
  const isEdit = !!initial;
  const { getOptions, addOption, removeOption } = useCustomOptions();
  const [entry, setEntry] = useState<KBEntry00E>(
    initial ?? {
      id: nextId,
      projectName: "",
      result: "得標",
      year: String(new Date().getFullYear()),
      bidPhaseReview: "",
      executionReview: "",
      kbUpdateSuggestions: "",
      aiToolFeedback: "",
      oneSentenceSummary: "",
      entryStatus: "draft" as KBEntryStatus,
      updatedAt: new Date().toISOString(),
    }
  );

  function update<K extends keyof KBEntry00E>(key: K, value: KBEntry00E[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  const defaultOpen: string[] = [];
  if (isEdit || entry.bidPhaseReview) defaultOpen.push("bidPhase");
  if (entry.executionReview) defaultOpen.push("execution");
  if (entry.kbUpdateSuggestions || entry.aiToolFeedback) defaultOpen.push("feedback");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>編號</Label>
          <Input value={entry.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} />
        </div>
        <div className="space-y-2">
          <Label>案名 *</Label>
          <Input value={entry.projectName} onChange={(e) => update("projectName", e.target.value)} placeholder="○○案" />
        </div>
        <div className="space-y-2">
          <Label>結果</Label>
          <EditableSelect
            value={entry.result}
            onChange={(v) => update("result", v)}
            options={getOptions("00E_result")}
            placeholder="輸入或選擇結果"
            fieldKey="00E_result"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
        <div className="space-y-2">
          <Label>年度</Label>
          <Input value={entry.year} onChange={(e) => update("year", e.target.value)} placeholder="2025" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>資料狀態</Label>
        <Select value={entry.entryStatus} onValueChange={(v) => update("entryStatus", v as KBEntryStatus)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">啟用</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">封存</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>一句話總結</Label>
        <Input value={entry.oneSentenceSummary} onChange={(e) => update("oneSentenceSummary", e.target.value)} placeholder="一句話描述此案的關鍵教訓" />
      </div>

      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        <AccordionItem value="bidPhase">
          <AccordionTrigger className="text-sm font-semibold py-3">
            投標階段檢討（L1-L4）
          </AccordionTrigger>
          <AccordionContent>
            <Textarea value={entry.bidPhaseReview} onChange={(e) => update("bidPhaseReview", e.target.value)} rows={4} placeholder="策略分析、備標規劃、企劃草稿、定稿撰寫各階段的檢討..." />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="execution">
          <AccordionTrigger className="text-sm font-semibold py-3">
            執行階段檢討
          </AccordionTrigger>
          <AccordionContent>
            <Textarea value={entry.executionReview} onChange={(e) => update("executionReview", e.target.value)} rows={4} placeholder="僅得標案件：履約執行過程的檢討..." />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="feedback">
          <AccordionTrigger className="text-sm font-semibold py-3">
            知識庫更新建議 ＆ AI 工具回饋
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>知識庫更新建議</Label>
                <Textarea value={entry.kbUpdateSuggestions} onChange={(e) => update("kbUpdateSuggestions", e.target.value)} rows={3} placeholder="建議更新 00A-00D 的哪些內容..." />
              </div>
              <div className="space-y-2">
                <Label>AI 工具回饋</Label>
                <Textarea value={entry.aiToolFeedback} onChange={(e) => update("aiToolFeedback", e.target.value)} rows={3} placeholder="AI 輔助過程的經驗回饋..." />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSave({ ...entry, updatedAt: new Date().toISOString() })} disabled={!entry.projectName.trim()}>
          {isEdit ? "更新" : "新增"}
        </Button>
      </div>
    </div>
  );
}
