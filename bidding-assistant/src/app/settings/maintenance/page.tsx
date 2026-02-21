"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { CHANGELOG } from "@/data/changelog";
import { ChangelogPanel } from "@/components/settings/ChangelogPanel";
import { DebugLogPanel } from "@/components/settings/DebugLogPanel";

const currentVersion = CHANGELOG[0]?.version ?? "0.0.0";

export default function MaintenancePage() {
  const { settings, resetSettings } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  function exportSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bidding-assistant-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("設定已匯出");
  }

  function importSettings(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          toast.error("匯入失敗：檔案內容必須是 JSON 物件");
          return;
        }
        localStorage.setItem("bidding-assistant-settings", JSON.stringify(data));
        toast.success("設定已匯入，重新整理頁面以套用");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error("匯入失敗：JSON 格式不正確");
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetSettings();
    toast.success("已還原為預設值");
    setConfirmReset(false);
  }

  function clearCache() {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("bidding-assistant")
      );
      keys.forEach((k) => localStorage.removeItem(k));
      toast.success(`已清除 ${keys.length} 個快取項目`);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">系統維護</h1>
        <p className="text-muted-foreground mt-1">系統管理、更新日誌、除錯日誌</p>
      </div>

      <Tabs defaultValue="maintenance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="maintenance">系統維護</TabsTrigger>
          <TabsTrigger value="changelog">更新日誌</TabsTrigger>
          <TabsTrigger value="debug-log">除錯日誌</TabsTrigger>
        </TabsList>

        {/* ── 系統維護 ── */}
        <TabsContent value="maintenance" className="space-y-6">
          {/* 設定備份 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">設定備份</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={exportSettings}>匯出設定（JSON）</Button>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("import-file")?.click()}
                >
                  匯入設定
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importSettings(file);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 快取管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快取管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                清除瀏覽器中的所有 bidding-assistant 相關快取資料
              </p>
              <Button variant="outline" onClick={clearCache}>
                清除快取
              </Button>
            </CardContent>
          </Card>

          {/* 危險區域 */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">危險區域</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                還原所有設定為出廠預設值。此操作無法復原。
              </p>
              <Button variant="destructive" onClick={handleReset}>
                {confirmReset ? "確認還原？再按一次" : "還原預設設定"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>版本：v{currentVersion}</p>
            <p>建置框架：Next.js + shadcn/ui + Tailwind CSS</p>
          </div>
        </TabsContent>

        {/* ── 更新日誌 ── */}
        <TabsContent value="changelog">
          <ChangelogPanel />
        </TabsContent>

        {/* ── 除錯日誌 ── */}
        <TabsContent value="debug-log">
          <DebugLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
