"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { STAGES } from "@/data/config/stages";
import { KB_LABELS, type KBRequirement } from "@/data/config/kb-matrix";
import {
  FEATURE_REGISTRY,
  SECTION_LABELS,
  getDefaultToggles,
  type FeatureDefinition,
} from "@/lib/modules/feature-registry";
import { FeatureToggleCard } from "@/components/settings/FeatureToggleCard";
import { FieldMappingEditor } from "@/components/settings/FieldMappingEditor";
import { KeywordManager } from "@/components/scan/KeywordManager";
import type { FieldMappingKey } from "@/lib/constants/field-mapping";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scan/constants";

export default function ModulesPage() {
  const { settings, hydrated, updateSection, updateSettings } = useSettings();
  const [modules, setModules] = useState(settings.modules);

  // 功能開關的 local state
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    settings.featureToggles ?? getDefaultToggles(),
  );

  // 欄位對照的 local state
  const [fieldMapping, setFieldMapping] = useState<Partial<Record<FieldMappingKey, string>>>(
    settings.fieldMapping ?? {},
  );

  // 巡標關鍵字的 local state
  const [scanKeywords, setScanKeywords] = useState<string[]>(
    settings.scan?.searchKeywords ?? [...DEFAULT_SEARCH_KEYWORDS],
  );

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) {
      setModules(settings.modules);
      setToggles(settings.featureToggles ?? getDefaultToggles());
      setFieldMapping(settings.fieldMapping ?? {});
      setScanKeywords(settings.scan?.searchKeywords ?? [...DEFAULT_SEARCH_KEYWORDS]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleSaveScanKeywords() {
    updateSettings({ scan: { ...settings.scan, searchKeywords: scanKeywords } });
    toast.success("巡標關鍵字已儲存");
  }

  function handleSaveModules() {
    updateSection("modules", modules);
    toast.success("模組參數已儲存");
  }

  function handleSaveToggles() {
    updateSettings({ featureToggles: toggles });
    toast.success("功能開關已儲存，側欄已更新");
  }

  function handleSaveFieldMapping() {
    updateSettings({ fieldMapping });
    toast.success("欄位對照已儲存");
  }

  function handleToggle(featureId: string, enabled: boolean) {
    setToggles((prev) => ({ ...prev, [featureId]: enabled }));
  }

  const kbKeys = Object.keys(KB_LABELS);

  // 按 section 分組
  const sectionOrder: FeatureDefinition["section"][] = ["core", "tools", "output"];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">功能模組管理</h1>
        <p className="text-muted-foreground mt-1">
          開關功能模組、設定 Notion 欄位對照、調整模組參數
        </p>
      </div>

      <Tabs defaultValue="feature-toggles">
        <TabsList>
          <TabsTrigger value="feature-toggles">功能開關</TabsTrigger>
          <TabsTrigger value="field-mapping">欄位對照</TabsTrigger>
          <TabsTrigger value="kb-matrix">知識庫矩陣</TabsTrigger>
          <TabsTrigger value="quality">品質規則</TabsTrigger>
          <TabsTrigger value="pricing">報價參數</TabsTrigger>
          <TabsTrigger value="negotiation">協商參數</TabsTrigger>
          <TabsTrigger value="scan-keywords">巡標關鍵字</TabsTrigger>
        </TabsList>

        {/* ====== 功能開關 ====== */}
        <TabsContent value="feature-toggles" className="mt-4 space-y-6">
          {sectionOrder.map((sec) => {
            const features = FEATURE_REGISTRY.filter((f) => f.section === sec);
            if (features.length === 0) return null;
            return (
              <div key={sec}>
                <h2 className="text-lg font-semibold mb-3">
                  {SECTION_LABELS[sec]}
                </h2>
                <div className="space-y-3">
                  {features.map((f) => (
                    <FeatureToggleCard
                      key={f.id}
                      feature={f}
                      enabled={toggles[f.id] ?? f.defaultEnabled}
                      onToggle={(v) => handleToggle(f.id, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setToggles(settings.featureToggles ?? getDefaultToggles())}
            >
              取消
            </Button>
            <Button onClick={handleSaveToggles}>
              儲存功能開關
            </Button>
          </div>
        </TabsContent>

        {/* ====== 欄位對照 ====== */}
        <TabsContent value="field-mapping" className="mt-4">
          <FieldMappingEditor
            mapping={fieldMapping}
            onChange={setFieldMapping}
            notionToken={settings.connections.notion.token}
            notionDbId={settings.connections.notion.databaseId}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFieldMapping(settings.fieldMapping ?? {})}
            >
              取消
            </Button>
            <Button onClick={handleSaveFieldMapping}>
              儲存欄位對照
            </Button>
          </div>
        </TabsContent>

        {/* ====== 知識庫矩陣 ====== */}
        <TabsContent value="kb-matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">各階段知識庫需求矩陣</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">階段</TableHead>
                      {kbKeys.map((k) => (
                        <TableHead key={k} className="text-center text-xs">
                          {KB_LABELS[k]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {STAGES.map((stage) => (
                      <TableRow key={stage.id}>
                        <TableCell className="font-medium">
                          {stage.id} {stage.name}
                        </TableCell>
                        {kbKeys.map((kb) => (
                          <TableCell key={kb} className="text-center">
                            <Select
                              value={modules.kbMatrix[stage.id]?.[kb] ?? "none"}
                              onValueChange={(v) => {
                                const next = { ...modules.kbMatrix };
                                next[stage.id] = { ...next[stage.id], [kb]: v as KBRequirement };
                                setModules({ ...modules, kbMatrix: next });
                              }}
                            >
                              <SelectTrigger className="w-20 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="required">必要</SelectItem>
                                <SelectItem value="optional">選用</SelectItem>
                                <SelectItem value="none">無</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModules(settings.modules)}>
              取消
            </Button>
            <Button onClick={handleSaveModules}>儲存模組參數</Button>
          </div>
        </TabsContent>

        {/* ====== 品質規則 ====== */}
        <TabsContent value="quality" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">鐵律檢查</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(modules.qualityRules.ironLawEnabled).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-3">
                  <Checkbox
                    id={`iron-${key}`}
                    checked={enabled}
                    onCheckedChange={(v) =>
                      setModules({
                        ...modules,
                        qualityRules: {
                          ...modules.qualityRules,
                          ironLawEnabled: {
                            ...modules.qualityRules.ironLawEnabled,
                            [key]: !!v,
                          },
                        },
                      })
                    }
                  />
                  <Label htmlFor={`iron-${key}`} className="text-sm">
                    {key === "crossValidateNumbers" && "數字交叉驗證"}
                    {key === "budgetConsistency" && "預算一致性"}
                    {key === "dateConsistency" && "日期一致性"}
                    {key === "teamConsistency" && "團隊一致性"}
                    {key === "scopeConsistency" && "範疇一致性"}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                禁用詞清單
                <Badge variant="secondary" className="ml-2">
                  {modules.qualityRules.blacklist.length} 個
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {modules.qualityRules.blacklist.map((word, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      const next = modules.qualityRules.blacklist.filter((_, idx) => idx !== i);
                      setModules({
                        ...modules,
                        qualityRules: { ...modules.qualityRules, blacklist: next },
                      });
                    }}
                  >
                    {word} &times;
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-blacklist"
                  placeholder="新增禁用詞..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !modules.qualityRules.blacklist.includes(val)) {
                        setModules({
                          ...modules,
                          qualityRules: {
                            ...modules.qualityRules,
                            blacklist: [...modules.qualityRules.blacklist, val],
                          },
                        });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                用語修正對照表
                <Badge variant="secondary" className="ml-2">
                  {modules.qualityRules.terminology.length} 組
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>錯誤用語</TableHead>
                    <TableHead>正確用語</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.qualityRules.terminology.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-destructive">{t.wrong}</TableCell>
                      <TableCell className="text-green-600">{t.correct}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = modules.qualityRules.terminology.filter(
                              (_, idx) => idx !== i
                            );
                            setModules({
                              ...modules,
                              qualityRules: { ...modules.qualityRules, terminology: next },
                            });
                          }}
                        >
                          &times;
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* 新增用語對照 */}
              <div className="flex gap-2 mt-3">
                <Input
                  id="new-term-wrong"
                  placeholder="錯誤用語"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const wrongEl = document.getElementById("new-term-wrong") as HTMLInputElement;
                      const correctEl = document.getElementById("new-term-correct") as HTMLInputElement;
                      const wrong = wrongEl?.value.trim();
                      const correct = correctEl?.value.trim();
                      if (wrong && correct) {
                        setModules({
                          ...modules,
                          qualityRules: {
                            ...modules.qualityRules,
                            terminology: [...modules.qualityRules.terminology, { wrong, correct }],
                          },
                        });
                        wrongEl.value = "";
                        correctEl.value = "";
                        wrongEl.focus();
                      }
                    }
                  }}
                />
                <Input
                  id="new-term-correct"
                  placeholder="正確用語"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const wrongEl = document.getElementById("new-term-wrong") as HTMLInputElement;
                      const correctEl = document.getElementById("new-term-correct") as HTMLInputElement;
                      const wrong = wrongEl?.value.trim();
                      const correct = correctEl?.value.trim();
                      if (wrong && correct) {
                        setModules({
                          ...modules,
                          qualityRules: {
                            ...modules.qualityRules,
                            terminology: [...modules.qualityRules.terminology, { wrong, correct }],
                          },
                        });
                        wrongEl.value = "";
                        correctEl.value = "";
                        wrongEl.focus();
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const wrongEl = document.getElementById("new-term-wrong") as HTMLInputElement;
                    const correctEl = document.getElementById("new-term-correct") as HTMLInputElement;
                    const wrong = wrongEl?.value.trim();
                    const correct = correctEl?.value.trim();
                    if (wrong && correct) {
                      setModules({
                        ...modules,
                        qualityRules: {
                          ...modules.qualityRules,
                          terminology: [...modules.qualityRules.terminology, { wrong, correct }],
                        },
                      });
                      wrongEl.value = "";
                      correctEl.value = "";
                      wrongEl.focus();
                    }
                  }}
                >
                  新增
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                輸入錯誤用語和正確用語後，按 Enter 或點「新增」
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModules(settings.modules)}>
              取消
            </Button>
            <Button onClick={handleSaveModules}>儲存模組參數</Button>
          </div>
        </TabsContent>

        {/* ====== 報價參數 ====== */}
        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本參數</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>營業稅率</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={modules.pricing.taxRate}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      pricing: { ...modules.pricing, taxRate: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>管理費費率</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={modules.pricing.managementFeeRate}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      pricing: {
                        ...modules.pricing,
                        managementFeeRate: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModules(settings.modules)}>
              取消
            </Button>
            <Button onClick={handleSaveModules}>儲存模組參數</Button>
          </div>
        </TabsContent>

        {/* ====== 協商參數 ====== */}
        <TabsContent value="negotiation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">利潤率設定</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>底線利潤率（%）</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={(modules.negotiation?.minMargin ?? 0.05) * 100}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      negotiation: {
                        minMargin: Number(e.target.value) / 100,
                        expectedMargin: modules.negotiation?.expectedMargin ?? 0.15,
                        idealMargin: modules.negotiation?.idealMargin ?? 0.2,
                        maxMargin: modules.negotiation?.maxMargin ?? 0.3,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>預期利潤率（%）</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={(modules.negotiation?.expectedMargin ?? 0.15) * 100}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      negotiation: {
                        minMargin: modules.negotiation?.minMargin ?? 0.05,
                        expectedMargin: Number(e.target.value) / 100,
                        idealMargin: modules.negotiation?.idealMargin ?? 0.2,
                        maxMargin: modules.negotiation?.maxMargin ?? 0.3,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>理想利潤率（%）</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={(modules.negotiation?.idealMargin ?? 0.2) * 100}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      negotiation: {
                        minMargin: modules.negotiation?.minMargin ?? 0.05,
                        expectedMargin: modules.negotiation?.expectedMargin ?? 0.15,
                        idealMargin: Number(e.target.value) / 100,
                        maxMargin: modules.negotiation?.maxMargin ?? 0.3,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>天花板利潤率（%）</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={(modules.negotiation?.maxMargin ?? 0.3) * 100}
                  onChange={(e) =>
                    setModules({
                      ...modules,
                      negotiation: {
                        minMargin: modules.negotiation?.minMargin ?? 0.05,
                        expectedMargin: modules.negotiation?.expectedMargin ?? 0.15,
                        idealMargin: modules.negotiation?.idealMargin ?? 0.2,
                        maxMargin: Number(e.target.value) / 100,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setModules(settings.modules)}>
              取消
            </Button>
            <Button onClick={handleSaveModules}>儲存模組參數</Button>
          </div>
        </TabsContent>

        {/* ====== 巡標關鍵字 ====== */}
        <TabsContent value="scan-keywords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                PCC 搜尋關鍵字
                <Badge variant="secondary" className="ml-2">
                  {scanKeywords.length} 個
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KeywordManager keywords={scanKeywords} onChange={setScanKeywords} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() =>
                setScanKeywords(settings.scan?.searchKeywords ?? [...DEFAULT_SEARCH_KEYWORDS])
              }
            >
              取消
            </Button>
            <Button onClick={handleSaveScanKeywords}>儲存關鍵字</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
