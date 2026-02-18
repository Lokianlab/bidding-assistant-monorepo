"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ConnectionsPage() {
  const { settings, hydrated, updateSection } = useSettings();
  const [notion, setNotion] = useState(settings.connections.notion);
  const [drive, setDrive] = useState(settings.connections.googleDrive);
  const [smugmug, setSmugmug] = useState(settings.connections.smugmug);
  const [testing, setTesting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    dbTitle?: string;
    firstPageFields?: Record<string, { type: string; sampleValue: unknown }>;
  } | null>(null);
  const [smugmugTesting, setSmugmugTesting] = useState(false);
  const [smugmugResult, setSmugmugResult] = useState<{ ok: boolean; message: string } | null>(null);

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) {
      setNotion(settings.connections.notion);
      setDrive(settings.connections.googleDrive);
      setSmugmug(settings.connections.smugmug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleSave() {
    updateSection("connections", { notion, googleDrive: drive, smugmug });
    toast.success("連線設定已儲存");
  }

  async function handleTestSmugMug() {
    if (!smugmug.apiKey || !smugmug.apiSecret || !smugmug.accessToken || !smugmug.tokenSecret) {
      setSmugmugResult({ ok: false, message: "請先填入所有欄位" });
      return;
    }
    setSmugmugTesting(true);
    setSmugmugResult(null);
    try {
      const res = await fetch("/api/smugmug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          apiKey: smugmug.apiKey,
          apiSecret: smugmug.apiSecret,
          accessToken: smugmug.accessToken,
          tokenSecret: smugmug.tokenSecret,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // 自動記錄 nickname
        if (data.nickname) {
          setSmugmug((prev) => ({ ...prev, nickname: data.nickname }));
        }
        setSmugmugResult({
          ok: true,
          message: `連線成功！使用者：${data.displayName || data.nickname}`,
        });
      } else {
        setSmugmugResult({ ok: false, message: data.error || "連線失敗" });
      }
    } catch {
      setSmugmugResult({ ok: false, message: "網路錯誤" });
    }
    setSmugmugTesting(false);
  }

  async function handleTestNotion() {
    if (!notion.token || !notion.databaseId) {
      setTestResult({ ok: false, message: "請先填入 Token 和 Database ID" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: notion.token,
          databaseId: notion.databaseId,
          action: "schema",
        }),
      });
      const data = await res.json();

      if (res.ok && data.schema) {
        const fieldCount = Object.keys(data.schema).length;
        setTestResult({
          ok: true,
          message: `連線成功！資料庫「${data.title || "（無標題）"}」共 ${fieldCount} 個欄位`,
        });
      } else {
        // 解析常見錯誤
        const errMsg = data.error || "";
        if (errMsg.includes("token is invalid") || errMsg.includes("unauthorized")) {
          setTestResult({
            ok: false,
            message: "Token 無效！請重新到 notion.so/profile/integrations 複製完整的 Internal Integration Secret",
          });
        } else if (errMsg.includes("object_not_found") || errMsg.includes("Could not find")) {
          setTestResult({
            ok: false,
            message: "找不到資料庫！請確認：\n1. Database ID 是否正確\n2. 已在 Notion 資料庫頁面把 Integration 加入「連線」",
          });
        } else {
          setTestResult({ ok: false, message: `連線失敗：${errMsg}` });
        }
      }
    } catch {
      setTestResult({ ok: false, message: "網路錯誤，請確認伺服器正在運行" });
    }

    setTesting(false);
  }

  const notionConnected = !!notion.token && !!notion.databaseId;
  const driveConnected = !!drive.refreshToken && !!drive.sharedDriveFolderId;
  const smugmugConnected = !!smugmug.apiKey && !!smugmug.accessToken;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">外部連線</h1>
        <p className="text-muted-foreground mt-1">管理 Notion、Google Drive 與 SmugMug 連線</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notion</CardTitle>
              <Badge variant={notionConnected ? "default" : "secondary"}>
                {notionConnected ? "已設定" : "未連線"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notion-token">Integration Token（密鑰）</Label>
              <Input
                id="notion-token"
                type="password"
                placeholder="ntn_..."
                value={notion.token}
                onChange={(e) => {
                  setNotion({ ...notion, token: e.target.value });
                  setTestResult(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                到 <span className="font-mono">notion.so/profile/integrations</span> 建立 Internal Integration，然後複製「Internal Integration Secret」
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notion-db">Database ID（資料庫 ID）</Label>
              <Input
                id="notion-db"
                placeholder="例：14cc71c77278..."
                value={notion.databaseId}
                onChange={(e) => {
                  setNotion({ ...notion, databaseId: e.target.value });
                  setTestResult(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                打開 Notion 資料庫頁面，網址中 <span className="font-mono">notion.so/</span> 後面、<span className="font-mono">?v=</span> 前面那段就是 Database ID
              </p>
            </div>

            {/* 測試連線按鈕 */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleTestNotion}
                disabled={testing || !notion.token || !notion.databaseId}
              >
                {testing ? "測試中..." : "測試連線"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/notion/debug", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: notion.token, databaseId: notion.databaseId }),
                  });
                  setDebugInfo(await res.json());
                }}
                disabled={!notion.token || !notion.databaseId}
              >
                檢視欄位
              </Button>
              {testResult && (
                <p
                  className={`text-sm whitespace-pre-wrap ${
                    testResult.ok ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResult.ok ? "OK " : "X "}
                  {testResult.message}
                </p>
              )}
            </div>

            {/* Debug: 顯示欄位資訊 */}
            {debugInfo && (
              <div className="mt-3 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-80">
                <p className="font-bold mb-2">資料庫：{debugInfo.dbTitle}</p>
                {debugInfo.firstPageFields && Object.entries(debugInfo.firstPageFields).map(([name, info]) => (
                  <div key={name} className="flex gap-2 py-0.5">
                    <span className="text-primary font-medium min-w-[140px]">{name}</span>
                    <span className="text-muted-foreground">({info.type})</span>
                    <span className="truncate">{JSON.stringify(info.sampleValue)}</span>
                  </div>
                ))}
              </div>
            )}

            {notion.lastSync && (
              <p className="text-xs text-muted-foreground">
                上次同步：{notion.lastSync}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Google Drive</CardTitle>
              <Badge variant={driveConnected ? "default" : "secondary"}>
                {driveConnected ? "已連線" : "未連線"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drive-token">Refresh Token</Label>
              <Input
                id="drive-token"
                type="password"
                placeholder="1//..."
                value={drive.refreshToken}
                onChange={(e) => setDrive({ ...drive, refreshToken: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive-folder">共用雲端硬碟資料夾 ID</Label>
              <Input
                id="drive-folder"
                placeholder="資料夾 ID"
                value={drive.sharedDriveFolderId}
                onChange={(e) => setDrive({ ...drive, sharedDriveFolderId: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* SmugMug 實績照片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">SmugMug（實績照片）</CardTitle>
              <Badge variant={smugmugConnected ? "default" : "secondary"}>
                {smugmugConnected ? (smugmug.nickname ? `@${smugmug.nickname}` : "已設定") : "未連線"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              串接 SmugMug 後，可在實績資料庫（00B）中直接瀏覽並選取專案照片
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sm-key">API Key</Label>
                <Input
                  id="sm-key"
                  placeholder="SmugMug API Key"
                  value={smugmug.apiKey}
                  onChange={(e) => {
                    setSmugmug({ ...smugmug, apiKey: e.target.value });
                    setSmugmugResult(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm-secret">API Secret</Label>
                <Input
                  id="sm-secret"
                  type="password"
                  placeholder="SmugMug API Secret"
                  value={smugmug.apiSecret}
                  onChange={(e) => {
                    setSmugmug({ ...smugmug, apiSecret: e.target.value });
                    setSmugmugResult(null);
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sm-token">Access Token</Label>
                <Input
                  id="sm-token"
                  type="password"
                  placeholder="OAuth Access Token"
                  value={smugmug.accessToken}
                  onChange={(e) => {
                    setSmugmug({ ...smugmug, accessToken: e.target.value });
                    setSmugmugResult(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm-tsecret">Token Secret</Label>
                <Input
                  id="sm-tsecret"
                  type="password"
                  placeholder="OAuth Token Secret"
                  value={smugmug.tokenSecret}
                  onChange={(e) => {
                    setSmugmug({ ...smugmug, tokenSecret: e.target.value });
                    setSmugmugResult(null);
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              到{" "}
              <a href="https://api.smugmug.com/api/developer/apply" target="_blank" rel="noreferrer" className="underline text-primary">
                api.smugmug.com/api/developer/apply
              </a>
              {" "}申請 API Key。取得 Access Token 的方式請參考{" "}
              <a href="https://api.smugmug.com/api/v2/doc/tutorial/authorization.html" target="_blank" rel="noreferrer" className="underline text-primary">
                SmugMug OAuth 教學
              </a>
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleTestSmugMug}
                disabled={smugmugTesting || !smugmug.apiKey || !smugmug.accessToken}
              >
                {smugmugTesting ? "測試中..." : "測試連線"}
              </Button>
              {smugmugResult && (
                <p className={`text-sm ${smugmugResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {smugmugResult.ok ? "✓ " : "✕ "}
                  {smugmugResult.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => {
            setNotion(settings.connections.notion);
            setDrive(settings.connections.googleDrive);
            setSmugmug(settings.connections.smugmug);
            setTestResult(null);
            setSmugmugResult(null);
          }}>
            取消
          </Button>
          <Button onClick={handleSave}>儲存連線設定</Button>
        </div>
      </div>
    </div>
  );
}
