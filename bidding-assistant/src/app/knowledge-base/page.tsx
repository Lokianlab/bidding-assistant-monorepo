"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { KB_CATEGORIES, KB_CATEGORY_MAP, ENTRY_STATUS_LABELS } from "@/lib/knowledge-base/constants";
import {
  generateNextId,
  generateProjectId,
  searchEntries,
  getKBStats,
  renderKBToMarkdown,
} from "@/lib/knowledge-base/helpers";
import type {
  KBId,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
} from "@/lib/knowledge-base/types";
import EntryEditor00A from "@/components/knowledge-base/EntryEditor00A";
import EntryEditor00B from "@/components/knowledge-base/EntryEditor00B";
import { EntryEditor00C, EntryEditor00D, EntryEditor00E } from "@/components/knowledge-base/EntryEditorGeneric";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { SEED_00C, SEED_00D } from "@/lib/knowledge-base/seed-data";

// ====== 匯入匯出 ======

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== 主頁面 ======

export default function KnowledgeBasePage() {
  const kb = useKnowledgeBase();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<KBId>("00A");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ kbId: KBId; entry: unknown } | null>(null);
  const [duplicateData, setDuplicateData] = useState<unknown>(null); // 複製用暫存
  const [deleteTarget, setDeleteTarget] = useState<{ kbId: KBId; entryId: string; title: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const stats = useMemo(() => getKBStats(kb.data), [kb.data]);

  // 取得當前 tab 的過濾後條目
  const filteredEntries = useMemo(() => {
    const entries = kb.data[activeTab] as Array<{ id: string }>;
    return searchEntries(entries, search);
  }, [kb.data, activeTab, search]);

  // 取得 entry 顯示標題
  const getEntryTitle = useCallback((kbId: KBId, entry: unknown): string => {
    switch (kbId) {
      case "00A": return `${(entry as KBEntry00A).name} — ${(entry as KBEntry00A).title}`;
      case "00B": return (entry as KBEntry00B).projectName;
      case "00C": return (entry as KBEntry00C).templateName;
      case "00D": return (entry as KBEntry00D).riskName;
      case "00E": return `${(entry as KBEntry00E).projectName}（${(entry as KBEntry00E).result}）`;
      default: return (entry as { id: string }).id;
    }
  }, []);

  // 新增
  function handleAdd() {
    setEditingEntry(null);
    setEditorOpen(true);
  }

  // 編輯
  function handleEdit(entry: unknown) {
    setEditingEntry({ kbId: activeTab, entry });
    setEditorOpen(true);
  }

  // 複製（以現有資料為基底，產生新 ID，以新增模式開啟編輯器）
  function handleDuplicate(entry: unknown) {
    const newId = getNextId();
    const cloned = { ...(entry as Record<string, unknown>), id: newId, entryStatus: "draft", updatedAt: new Date().toISOString() };
    setEditingEntry(null); // null = 新增模式
    setDuplicateData(cloned);
    setEditorOpen(true);
  }

  // 儲存
  function handleSave(entry: unknown) {
    const isNew = !editingEntry;
    switch (activeTab) {
      case "00A":
        if (isNew) kb.addEntry00A(entry as KBEntry00A);
        else kb.updateEntry00A((entry as KBEntry00A).id, entry as Partial<KBEntry00A>);
        break;
      case "00B":
        if (isNew) kb.addEntry00B(entry as KBEntry00B);
        else kb.updateEntry00B((entry as KBEntry00B).id, entry as Partial<KBEntry00B>);
        break;
      case "00C":
        if (isNew) kb.addEntry00C(entry as KBEntry00C);
        else kb.updateEntry00C((entry as KBEntry00C).id, entry as Partial<KBEntry00C>);
        break;
      case "00D":
        if (isNew) kb.addEntry00D(entry as KBEntry00D);
        else kb.updateEntry00D((entry as KBEntry00D).id, entry as Partial<KBEntry00D>);
        break;
      case "00E":
        if (isNew) kb.addEntry00E(entry as KBEntry00E);
        else kb.updateEntry00E((entry as KBEntry00E).id, entry as Partial<KBEntry00E>);
        break;
    }
    setEditorOpen(false);
    setEditingEntry(null);
    toast.success(isNew ? "已新增" : "已更新");
  }

  // 刪除確認
  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    kb.deleteEntry(deleteTarget.kbId, deleteTarget.entryId);
    setDeleteTarget(null);
    toast.success("已刪除");
  }

  // 產生下一個 ID
  function getNextId(): string {
    const existingIds = (kb.data[activeTab] as Array<{ id: string }>).map((e) => e.id);
    const cat = KB_CATEGORY_MAP[activeTab];
    if (activeTab === "00B") return generateProjectId(existingIds);
    return generateNextId(existingIds, cat.idPrefix);
  }

  // 載入預設範本資料（00C / 00D）
  function handleLoadSeedData(kbId: "00C" | "00D") {
    const seedEntries = kbId === "00C" ? SEED_00C : SEED_00D;
    const existing = kb.data[kbId] as Array<{ id: string }>;
    const existingIds = new Set(existing.map((e) => e.id));
    let addedCount = 0;
    for (const entry of seedEntries) {
      if (!existingIds.has(entry.id)) {
        if (kbId === "00C") kb.addEntry00C(entry as KBEntry00C);
        else kb.addEntry00D(entry as KBEntry00D);
        addedCount++;
      }
    }
    if (addedCount > 0) {
      toast.success(`已載入 ${addedCount} 筆預設${kbId === "00C" ? "時程範本" : "應變SOP"}`);
    } else {
      toast.info("預設資料已全部存在，無需載入");
    }
  }

  // 匯出 JSON
  function handleExportJSON() {
    const data = kb.exportData();
    downloadJSON(data, `知識庫備份_${new Date().toISOString().slice(0, 10)}.json`);
    toast.success("已匯出 JSON");
  }

  // 匯入 JSON
  function handleImportJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        kb.importData(imported);
        toast.success("匯入成功");
      } catch {
        toast.error("匯入失敗：檔案格式錯誤");
      }
    };
    input.click();
  }

  // 預覽 markdown
  function handlePreviewMarkdown() {
    const md = renderKBToMarkdown(activeTab, kb.data);
    setPreviewContent(md);
    setPreviewOpen(true);
  }

  // 匯出 markdown
  function handleExportMarkdown() {
    const md = renderKBToMarkdown(activeTab, kb.data);
    const cat = KB_CATEGORY_MAP[activeTab];
    downloadMarkdown(md, `${activeTab}_${cat.label}.md`);
    toast.success(`已匯出 ${cat.label} Markdown`);
  }

  // 渲染編輯器
  function renderEditor() {
    const nextId = getNextId();
    const props = {
      onSave: (entry: unknown) => { setDuplicateData(null); handleSave(entry); },
      onCancel: () => { setEditorOpen(false); setEditingEntry(null); setDuplicateData(null); },
      nextId,
    };

    // 編輯模式用 editingEntry，複製模式用 duplicateData，新增模式用 undefined
    const initial = editingEntry?.entry ?? duplicateData ?? undefined;

    switch (activeTab) {
      case "00A":
        return <EntryEditor00A {...props} initial={initial as KBEntry00A | undefined} />;
      case "00B":
        return <EntryEditor00B {...props} initial={initial as KBEntry00B | undefined} />;
      case "00C":
        return <EntryEditor00C {...props} initial={initial as KBEntry00C | undefined} />;
      case "00D":
        return <EntryEditor00D {...props} initial={initial as KBEntry00D | undefined} />;
      case "00E":
        return <EntryEditor00E {...props} initial={initial as KBEntry00E | undefined} />;
    }
  }

  if (!kb.hydrated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* 標題 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-2xl font-bold">知識庫管理</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              管理五大知識庫資料，提示詞組裝時自動引用最新內容
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleImportJSON}>
            匯入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            匯出
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        {KB_CATEGORIES.map((cat) => (
          <Card
            key={cat.id}
            className={`cursor-pointer transition-all ${activeTab === cat.id ? "ring-2 ring-primary" : "hover:shadow-sm"}`}
            onClick={() => setActiveTab(cat.id)}
          >
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-medium truncate">{cat.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold">{stats[cat.id].active}</span>
                <span className="text-xs text-muted-foreground">啟用</span>
                {stats[cat.id].draft > 0 && (
                  <span className="text-xs text-amber-600">+{stats[cat.id].draft}草稿</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜尋 + 操作 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <Input
          placeholder="搜尋知識庫..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={handlePreviewMarkdown}>
            預覽 Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
            匯出 .md
          </Button>
          <Button onClick={handleAdd}>新增資料</Button>
        </div>
      </div>

      {/* Tab 切換 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KBId)}>
        <TabsList>
          {KB_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden">{cat.id}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {KB_CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{cat.icon} {cat.label}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(cat.id === "00C" || cat.id === "00D") && (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleLoadSeedData(cat.id as "00C" | "00D")}>
                        載入預設範本
                      </Button>
                    )}
                    <Badge variant="secondary">{filteredEntries.length} 筆</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border border-dashed rounded-lg gap-2">
                    <p>尚無資料</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleAdd}>
                        新增第一筆
                      </Button>
                      {(cat.id === "00C" || cat.id === "00D") && (
                        <Button variant="outline" size="sm" onClick={() => handleLoadSeedData(cat.id as "00C" | "00D")}>
                          載入預設範本
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">編號</TableHead>
                        <TableHead>名稱</TableHead>
                        <TableHead className="w-28">更新日期</TableHead>
                        <TableHead className="w-20">狀態</TableHead>
                        <TableHead className="w-36"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const e = entry as { id: string; entryStatus: string; updatedAt: string };
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-xs">{e.id}</TableCell>
                            <TableCell className="font-medium">
                              {getEntryTitle(activeTab, entry)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {e.updatedAt ? new Date(e.updatedAt).toLocaleDateString("zh-TW") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  e.entryStatus === "active" ? "default"
                                    : e.entryStatus === "draft" ? "secondary"
                                      : "outline"
                                }
                              >
                                {ENTRY_STATUS_LABELS[e.entryStatus as import("@/lib/knowledge-base/types").KBEntryStatus] ?? e.entryStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                                  編輯
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(entry)}>
                                  複製
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeleteTarget({
                                    kbId: activeTab,
                                    entryId: e.id,
                                    title: getEntryTitle(activeTab, entry),
                                  })}
                                >
                                  刪除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* 編輯對話框 */}
      <Dialog open={editorOpen} onOpenChange={(open) => { if (!open) { setEditorOpen(false); setEditingEntry(null); setDuplicateData(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "編輯" : duplicateData ? "複製新增" : "新增"} — {KB_CATEGORY_MAP[activeTab]?.label}
            </DialogTitle>
          </DialogHeader>
          {renderEditor()}
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deleteTarget?.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Markdown 預覽 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Markdown 預覽 — {KB_CATEGORY_MAP[activeTab]?.label}</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">
            此內容會在提示詞組裝時自動帶入 AI 對話
          </div>
          <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {previewContent || "（尚無資料）"}
          </pre>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(previewContent);
              toast.success("已複製");
            }}>
              複製
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
              下載 .md
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
