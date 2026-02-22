"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";

/** 常用中文字型 */
const COMMON_FONTS = [
  "標楷體",
  "新細明體",
  "微軟正黑體",
  "微軟雅黑",
  "華康中黑體",
  "華康楷書體",
  "Noto Sans TC",
  "Noto Serif TC",
];

const CUSTOM_VALUE = "__custom__";

/** 字型選擇器：下拉 + 自訂 */
function FontSelect({
  label,
  value,
  onChange,
  customFonts,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  customFonts: string[];
}) {
  const allOptions = [...COMMON_FONTS, ...customFonts.filter((f) => !COMMON_FONTS.includes(f))];
  const isPreset = allOptions.includes(value);
  const [customMode, setCustomMode] = useState(!isPreset && value !== "");

  if (customMode) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="輸入字型名稱..."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setCustomMode(false);
              if (!allOptions.includes(value) && value) {
                // 如果輸入了不在清單中的字型，保持值不變
              }
            }}
          >
            選單
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={allOptions.includes(value) ? value : CUSTOM_VALUE}
        onValueChange={(v) => {
          if (v === CUSTOM_VALUE) {
            setCustomMode(true);
          } else {
            onChange(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="選擇字型" />
        </SelectTrigger>
        <SelectContent>
          {allOptions.map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>自訂...</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function DocumentSettingsPage() {
  const { settings, hydrated, updateSection } = useSettings();
  const [doc, setDoc] = useState(settings.document);
  const [newFontName, setNewFontName] = useState("");

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) setDoc(settings.document);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleSave() {
    updateSection("document", doc);
    toast.success("文件設定已儲存");
  }

  function addCustomFont() {
    const name = newFontName.trim();
    if (!name) return;
    if (doc.fonts.customFonts.some((f) => f.name === name)) {
      toast.error("此字型已存在");
      return;
    }
    setDoc({
      ...doc,
      fonts: {
        ...doc.fonts,
        customFonts: [...doc.fonts.customFonts, { name, filename: "" }],
      },
    });
    setNewFontName("");
    toast.success(`已新增自訂字型「${name}」`);
  }

  function removeCustomFont(name: string) {
    setDoc({
      ...doc,
      fonts: {
        ...doc.fonts,
        customFonts: doc.fonts.customFonts.filter((f) => f.name !== name),
      },
    });
  }

  const customFontNames = doc.fonts.customFonts.map((f) => f.name);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">輸出文件設定</h1>
        <p className="text-muted-foreground mt-1">設定 DOCX 輸出的字型、字級、頁面格式</p>
      </div>

      <div className="space-y-6">
        {/* 字型設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">字型</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              從下拉選單選擇常用字型，或點「自訂...」手動輸入字型名稱
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FontSelect
                label="內文字型"
                value={doc.fonts.body}
                onChange={(v) => setDoc({ ...doc, fonts: { ...doc.fonts, body: v } })}
                customFonts={customFontNames}
              />
              <FontSelect
                label="標題字型"
                value={doc.fonts.heading}
                onChange={(v) => setDoc({ ...doc, fonts: { ...doc.fonts, heading: v } })}
                customFonts={customFontNames}
              />
              <FontSelect
                label="頁首/頁尾字型"
                value={doc.fonts.headerFooter}
                onChange={(v) => setDoc({ ...doc, fonts: { ...doc.fonts, headerFooter: v } })}
                customFonts={customFontNames}
              />
            </div>

            <Separator />

            {/* 自訂字型管理 */}
            <div>
              <Label className="text-sm font-medium">自訂字型清單</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                新增的自訂字型會出現在上方下拉選單中。DOCX 生成時會使用指定的字型名稱，請確認目標電腦已安裝該字型。
              </p>
              {doc.fonts.customFonts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {doc.fonts.customFonts.map((f) => (
                    <Badge
                      key={f.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeCustomFont(f.name)}
                    >
                      {f.name} &times;
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="輸入字型名稱..."
                  value={newFontName}
                  onChange={(e) => setNewFontName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomFont();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={addCustomFont}
                >
                  新增字型
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 字級設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">字級（pt）</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(["body", "h1", "h2", "h3", "h4"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label>{key === "body" ? "內文" : key.toUpperCase()}</Label>
                <Input
                  type="number"
                  min={8}
                  max={72}
                  value={doc.fontSize[key]}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      fontSize: { ...doc.fontSize, [key]: Number(e.target.value) },
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 頁面設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">頁面</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>紙張大小</Label>
                <Select
                  value={doc.page.size}
                  onValueChange={(v) =>
                    setDoc({ ...doc, page: { ...doc.page, size: v as "A4" | "Letter" | "custom" } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="custom">自訂</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>行距</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={1}
                  max={3}
                  value={doc.page.lineSpacing}
                  onChange={(e) =>
                    setDoc({ ...doc, page: { ...doc.page, lineSpacing: Number(e.target.value) } })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side} className="space-y-2">
                  <Label>
                    {side === "top" ? "上" : side === "bottom" ? "下" : side === "left" ? "左" : "右"}邊距（cm）
                  </Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    max={5}
                    value={doc.page.margins[side]}
                    onChange={(e) =>
                      setDoc({
                        ...doc,
                        page: {
                          ...doc.page,
                          margins: { ...doc.page.margins, [side]: Number(e.target.value) },
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>段前間距（pt）</Label>
                <Input
                  type="number"
                  min={0}
                  max={72}
                  value={doc.page.paragraphSpacing.before}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      page: {
                        ...doc.page,
                        paragraphSpacing: {
                          ...doc.page.paragraphSpacing,
                          before: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>段後間距（pt）</Label>
                <Input
                  type="number"
                  min={0}
                  max={72}
                  value={doc.page.paragraphSpacing.after}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      page: {
                        ...doc.page,
                        paragraphSpacing: {
                          ...doc.page.paragraphSpacing,
                          after: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 頁首/頁尾 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">頁首 / 頁尾</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>頁首範本</Label>
              <Input
                value={doc.header.template}
                onChange={(e) => setDoc({ ...doc, header: { ...doc.header, template: e.target.value } })}
              />
              <p className="text-xs text-muted-foreground">
                可用變數：{"{{案名}}"} {"{{章節名}}"} {"{{公司名}}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>頁尾範本</Label>
              <Input
                value={doc.footer.template}
                onChange={(e) => setDoc({ ...doc, footer: { ...doc.footer, template: e.target.value } })}
              />
              <p className="text-xs text-muted-foreground">
                可用變數：{"{{公司名}}"} {"{{頁碼}}"} {"{{總頁數}}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>雲端硬碟命名規則</Label>
              <Input
                value={doc.driveNamingRule}
                onChange={(e) => setDoc({ ...doc, driveNamingRule: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                可用變數：{"{{唯一碼}}"} {"{{民國年}}"} {"{{月}}"} {"{{日}}"} {"{{案名}}"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDoc(settings.document)}>
            取消
          </Button>
          <Button onClick={handleSave}>儲存文件設定</Button>
        </div>
      </div>
    </div>
  );
}
