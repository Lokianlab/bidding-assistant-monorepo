"use client";

import { useState, useRef, KeyboardEvent } from "react";
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
import { useCustomOptions } from "@/lib/knowledge-base/useCustomOptions";
import type {
  KBEntry00A,
  TeamMemberEducation,
  TeamMemberCertification,
  TeamMemberExperience,
  TeamMemberProject,
} from "@/lib/knowledge-base/types";

interface Props {
  initial?: KBEntry00A;
  onSave: (entry: KBEntry00A) => void;
  onCancel: () => void;
  nextId: string;
}

function emptyEducation(): TeamMemberEducation {
  return { school: "", department: "", degree: "" };
}
function emptyCertification(): TeamMemberCertification {
  return { name: "", issuer: "", expiry: "" };
}
function emptyExperience(): TeamMemberExperience {
  return { period: "", organization: "", title: "", description: "" };
}
function emptyProject(): TeamMemberProject {
  return { role: "", projectName: "", client: "", year: "", outcome: "" };
}

export default function EntryEditor00A({ initial, onSave, onCancel, nextId }: Props) {
  const isEdit = !!initial;
  const { getOptions, addOption, removeOption } = useCustomOptions();
  const [entry, setEntry] = useState<KBEntry00A>(
    initial ?? {
      id: nextId,
      name: "",
      title: "",
      status: "在職",
      authorizedRoles: [],
      education: [emptyEducation()],
      certifications: [],
      experiences: [],
      projects: [],
      additionalCapabilities: "",
      entryStatus: "draft",
      updatedAt: new Date().toISOString(),
    }
  );

  // 自訂角色輸入
  const [roleInput, setRoleInput] = useState("");
  const roleInputRef = useRef<HTMLInputElement>(null);

  // 從自訂選項 hook 取得角色建議
  const roleSuggestions = getOptions("00A_roles");

  function update<K extends keyof KBEntry00A>(key: K, value: KBEntry00A[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  function addRole(role: string) {
    const trimmed = role.trim();
    if (!trimmed) return;
    if (entry.authorizedRoles.includes(trimmed)) return;
    update("authorizedRoles", [...entry.authorizedRoles, trimmed]);
    setRoleInput("");
  }

  function removeRole(role: string) {
    update("authorizedRoles", entry.authorizedRoles.filter((r) => r !== role));
  }

  function handleRoleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addRole(roleInput);
    }
  }

  // 建議角色中還沒被選的
  const unusedSuggestions = roleSuggestions.filter(
    (r) => !entry.authorizedRoles.includes(r)
  );

  function handleSave() {
    onSave({ ...entry, updatedAt: new Date().toISOString() });
  }

  // 計算各區塊有幾筆資料
  const sectionCounts = {
    education: entry.education.filter((e) => e.school || e.department).length,
    certifications: entry.certifications.filter((e) => e.name).length,
    experiences: entry.experiences.filter((e) => e.organization || e.period).length,
    projects: entry.projects.filter((e) => e.projectName || e.role).length,
  };

  // 預設展開已有資料的區塊
  const defaultOpen: string[] = [];
  if (isEdit || entry.education.some((e) => e.school)) defaultOpen.push("education");
  if (entry.certifications.length > 0) defaultOpen.push("certifications");
  if (entry.experiences.length > 0) defaultOpen.push("experiences");
  if (entry.projects.length > 0) defaultOpen.push("projects");

  return (
    <div className="space-y-5">
      {/* ===== 基本資訊 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>編號</Label>
          <Input value={entry.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} />
        </div>
        <div className="space-y-2">
          <Label>姓名 *</Label>
          <Input value={entry.name} onChange={(e) => update("name", e.target.value)} placeholder="王○○" />
        </div>
        <div className="space-y-2">
          <Label>職稱</Label>
          <Input value={entry.title} onChange={(e) => update("title", e.target.value)} placeholder="專案經理" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>狀態</Label>
          <Select value={entry.status} onValueChange={(v) => update("status", v as KBEntry00A["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="在職">在職</SelectItem>
              <SelectItem value="已離職">已離職</SelectItem>
              <SelectItem value="外部合作">外部合作</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>資料狀態</Label>
          <Select value={entry.entryStatus} onValueChange={(v) => update("entryStatus", v as KBEntry00A["entryStatus"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">啟用</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="archived">封存</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== 授權角色（可自訂增刪） ===== */}
      <div className="space-y-2">
        <Label>公司授權可擔任角色</Label>
        {/* 已選角色 */}
        {entry.authorizedRoles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.authorizedRoles.map((role) => (
              <Badge key={role} variant="default" className="gap-1 pr-1">
                {role}
                <button
                  type="button"
                  className="ml-0.5 rounded-full hover:bg-white/20 px-1 text-xs"
                  onClick={() => removeRole(role)}
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>
        )}
        {/* 輸入框 + 新增按鈕 */}
        <div className="flex gap-2">
          <Input
            ref={roleInputRef}
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={handleRoleKeyDown}
            placeholder="輸入角色名稱，按 Enter 新增"
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addRole(roleInput)}
            disabled={!roleInput.trim()}
          >
            新增
          </Button>
        </div>
        {/* 快速建議（可自訂管理） */}
        {(unusedSuggestions.length > 0 || roleInput.trim()) && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">常用：</span>
            {unusedSuggestions.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className="cursor-pointer hover:bg-accent text-xs gap-0.5 pr-1"
              >
                <span onClick={() => addRole(role)}>＋ {role}</span>
                <button
                  type="button"
                  className="ml-0.5 text-muted-foreground hover:text-destructive text-[10px]"
                  onClick={(e) => { e.stopPropagation(); removeOption("00A_roles", role); }}
                  title="從常用移除"
                >
                  ✕
                </button>
              </Badge>
            ))}
            {/* 如果輸入了新角色且不在常用中，提供加入常用的按鈕 */}
            {roleInput.trim() && !roleSuggestions.includes(roleInput.trim()) && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => {
                  addOption("00A_roles", roleInput.trim());
                  addRole(roleInput);
                }}
              >
                ＋ 將「{roleInput.trim()}」加入常用
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ===== 收合區塊 ===== */}
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
        {/* 學歷 */}
        <AccordionItem value="education">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              學歷
              {sectionCounts.education > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sectionCounts.education}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {entry.education.map((edu, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <Input placeholder="學校" value={edu.school} onChange={(e) => {
                    const arr = [...entry.education]; arr[i] = { ...edu, school: e.target.value }; update("education", arr);
                  }} />
                  <Input placeholder="系所" value={edu.department} onChange={(e) => {
                    const arr = [...entry.education]; arr[i] = { ...edu, department: e.target.value }; update("education", arr);
                  }} />
                  <div className="flex gap-1">
                    <Input placeholder="學位" value={edu.degree} onChange={(e) => {
                      const arr = [...entry.education]; arr[i] = { ...edu, degree: e.target.value }; update("education", arr);
                    }} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => {
                      update("education", entry.education.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("education", [...entry.education, emptyEducation()])}>
                ＋ 新增學歷
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 證照 */}
        <AccordionItem value="certifications">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              證照與認證
              {sectionCounts.certifications > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sectionCounts.certifications}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {entry.certifications.map((cert, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <Input placeholder="證照名稱" value={cert.name} onChange={(e) => {
                    const arr = [...entry.certifications]; arr[i] = { ...cert, name: e.target.value }; update("certifications", arr);
                  }} />
                  <Input placeholder="發證單位" value={cert.issuer} onChange={(e) => {
                    const arr = [...entry.certifications]; arr[i] = { ...cert, issuer: e.target.value }; update("certifications", arr);
                  }} />
                  <div className="flex gap-1">
                    <Input placeholder="有效期限" value={cert.expiry} onChange={(e) => {
                      const arr = [...entry.certifications]; arr[i] = { ...cert, expiry: e.target.value }; update("certifications", arr);
                    }} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => {
                      update("certifications", entry.certifications.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("certifications", [...entry.certifications, emptyCertification()])}>
                ＋ 新增證照
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 工作經歷 */}
        <AccordionItem value="experiences">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              工作經歷
              {sectionCounts.experiences > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sectionCounts.experiences}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {entry.experiences.map((exp, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-lg">
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="期間 (2018-2022)" value={exp.period} onChange={(e) => {
                      const arr = [...entry.experiences]; arr[i] = { ...exp, period: e.target.value }; update("experiences", arr);
                    }} />
                    <Input placeholder="機構" value={exp.organization} onChange={(e) => {
                      const arr = [...entry.experiences]; arr[i] = { ...exp, organization: e.target.value }; update("experiences", arr);
                    }} />
                    <Input placeholder="職稱" value={exp.title} onChange={(e) => {
                      const arr = [...entry.experiences]; arr[i] = { ...exp, title: e.target.value }; update("experiences", arr);
                    }} />
                  </div>
                  <div className="flex gap-1">
                    <Textarea placeholder="做了什麼（50-80字）" value={exp.description} onChange={(e) => {
                      const arr = [...entry.experiences]; arr[i] = { ...exp, description: e.target.value }; update("experiences", arr);
                    }} rows={2} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive self-start" onClick={() => {
                      update("experiences", entry.experiences.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("experiences", [...entry.experiences, emptyExperience()])}>
                ＋ 新增經歷
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 專案經歷 */}
        <AccordionItem value="projects">
          <AccordionTrigger className="text-sm font-semibold py-3">
            <span className="flex items-center gap-2">
              專案經歷
              {sectionCounts.projects > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sectionCounts.projects}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {entry.projects.map((proj, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input placeholder="角色" value={proj.role} onChange={(e) => {
                      const arr = [...entry.projects]; arr[i] = { ...proj, role: e.target.value }; update("projects", arr);
                    }} />
                    <Input placeholder="案名" value={proj.projectName} onChange={(e) => {
                      const arr = [...entry.projects]; arr[i] = { ...proj, projectName: e.target.value }; update("projects", arr);
                    }} />
                    <Input placeholder="業主" value={proj.client} onChange={(e) => {
                      const arr = [...entry.projects]; arr[i] = { ...proj, client: e.target.value }; update("projects", arr);
                    }} />
                    <Input placeholder="年度" value={proj.year} onChange={(e) => {
                      const arr = [...entry.projects]; arr[i] = { ...proj, year: e.target.value }; update("projects", arr);
                    }} />
                  </div>
                  <div className="flex gap-1">
                    <Input placeholder="成果" value={proj.outcome} onChange={(e) => {
                      const arr = [...entry.projects]; arr[i] = { ...proj, outcome: e.target.value }; update("projects", arr);
                    }} />
                    <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => {
                      update("projects", entry.projects.filter((_, j) => j !== i));
                    }}>✕</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("projects", [...entry.projects, emptyProject()])}>
                ＋ 新增專案
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 其他能力 */}
      <div className="space-y-2">
        <Label>其他能力</Label>
        <Textarea
          value={entry.additionalCapabilities}
          onChange={(e) => update("additionalCapabilities", e.target.value)}
          placeholder="其他特殊能力或備註..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSave} disabled={!entry.name.trim()}>
          {isEdit ? "更新" : "新增"}
        </Button>
      </div>
    </div>
  );
}
