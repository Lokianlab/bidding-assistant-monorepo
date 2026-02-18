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
import { SmugMugPhotoPicker } from "./SmugMugPhotoPicker";
import { useCustomOptions } from "@/lib/knowledge-base/useCustomOptions";
import type { KBEntry00B, ProjectWorkItem } from "@/lib/knowledge-base/types";

interface Props {
  initial?: KBEntry00B;
  onSave: (entry: KBEntry00B) => void;
  onCancel: () => void;
  nextId: string;
}

function emptyWorkItem(): ProjectWorkItem {
  return { item: "", description: "" };
}

export default function EntryEditor00B({ initial, onSave, onCancel, nextId }: Props) {
  const isEdit = !!initial;
  const { getOptions, addOption, removeOption } = useCustomOptions();
  const [entry, setEntry] = useState<KBEntry00B>(
    initial ?? {
      id: nextId,
      projectName: "",
      client: "",
      contractAmount: "",
      period: "",
      entity: "",
      role: "",
      completionStatus: "履約中",
      teamMembers: "",
      workItems: [emptyWorkItem()],
      outcomes: "",
      documentLinks: "",
      entryStatus: "draft",
      updatedAt: new Date().toISOString(),
    }
  );

  function update<K extends keyof KBEntry00B>(key: K, value: KBEntry00B[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave({ ...entry, updatedAt: new Date().toISOString() });
  }

  const workItemCount = entry.workItems.filter((w) => w.item || w.description).length;

  const photoCount = entry.photos?.length || 0;

  const defaultOpen: string[] = [];
  if (isEdit || workItemCount > 0) defaultOpen.push("workItems");
  if (entry.outcomes) defaultOpen.push("outcomes");
  if (photoCount > 0) defaultOpen.push("photos");

  return (
    <div className="space-y-5">
      {/* ===== 基本資訊 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>編號</Label>
          <Input value={entry.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} />
        </div>
        <div className="space-y-2">
          <Label>案名 *</Label>
          <Input value={entry.projectName} onChange={(e) => update("projectName", e.target.value)} placeholder="臺灣形象展規劃執行" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>委託機關</Label>
          <Input value={entry.client} onChange={(e) => update("client", e.target.value)} placeholder="○○部○○司" />
        </div>
        <div className="space-y-2">
          <Label>決標金額</Label>
          <Input value={entry.contractAmount} onChange={(e) => update("contractAmount", e.target.value)} placeholder="1,200,000 元" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>履約期間</Label>
          <Input value={entry.period} onChange={(e) => update("period", e.target.value)} placeholder="民國 114 年 3 月至 8 月" />
        </div>
        <div className="space-y-2">
          <Label>承接主體</Label>
          <EditableSelect
            value={entry.entity}
            onChange={(v) => update("entity", v)}
            options={getOptions("00B_entity")}
            placeholder="輸入或選擇公司名稱"
            fieldKey="00B_entity"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>本公司角色</Label>
          <EditableSelect
            value={entry.role}
            onChange={(v) => update("role", v)}
            options={getOptions("00B_role")}
            placeholder="輸入或選擇角色"
            fieldKey="00B_role"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
        <div className="space-y-2">
          <Label>結案狀態</Label>
          <EditableSelect
            value={entry.completionStatus}
            onChange={(v) => update("completionStatus", v)}
            options={getOptions("00B_status")}
            placeholder="輸入或選擇狀態"
            fieldKey="00B_status"
            onAddOption={addOption}
            onRemoveOption={removeOption}
          />
        </div>
        <div className="space-y-2">
          <Label>資料狀態</Label>
          <Select value={entry.entryStatus} onValueChange={(v) => update("entryStatus", v as KBEntry00B["entryStatus"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">啟用</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="archived">封存</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>專案團隊</Label>
        <Input value={entry.teamMembers} onChange={(e) => update("teamMembers", e.target.value)} placeholder="計畫主持人：黃偉誠（M-001）、專案經理：..." />
      </div>

      {/* ===== 收合區塊 ===== */}
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        <AccordionItem value="workItems">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              工作內容細項
              {workItemCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{workItemCount}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                每一項回答三個問題：做了什麼事、規模多大、怎麼做的
              </p>
              {entry.workItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="工作項目" value={item.item} className="w-1/3" onChange={(e) => {
                    const arr = [...entry.workItems]; arr[i] = { ...item, item: e.target.value }; update("workItems", arr);
                  }} />
                  <Textarea placeholder="具體描述（規模、做法）" value={item.description} rows={2} className="flex-1" onChange={(e) => {
                    const arr = [...entry.workItems]; arr[i] = { ...item, description: e.target.value }; update("workItems", arr);
                  }} />
                  <Button variant="ghost" size="sm" className="shrink-0 text-destructive mt-1" onClick={() => {
                    update("workItems", entry.workItems.filter((_, j) => j !== i));
                  }}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("workItems", [...entry.workItems, emptyWorkItem()])}>
                ＋ 新增項目
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="photos">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              實績照片（SmugMug）
              {photoCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{photoCount}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <SmugMugPhotoPicker
              selected={entry.photos || []}
              onChange={(photos) => update("photos", photos)}
              albumKey={entry.smugmugAlbumKey}
              onAlbumKeyChange={(key) => update("smugmugAlbumKey", key)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="outcomes">
          <AccordionTrigger className="text-sm font-semibold py-3">
            成果數據與文件連結
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>成果數據</Label>
                <Textarea
                  value={entry.outcomes}
                  onChange={(e) => update("outcomes", e.target.value)}
                  placeholder="參與人次、場次、滿意度、媒體露出..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>文件連結</Label>
                <Input value={entry.documentLinks} onChange={(e) => update("documentLinks", e.target.value)} placeholder="Google Drive 連結或備註" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSave} disabled={!entry.projectName.trim()}>
          {isEdit ? "更新" : "新增"}
        </Button>
      </div>
    </div>
  );
}
