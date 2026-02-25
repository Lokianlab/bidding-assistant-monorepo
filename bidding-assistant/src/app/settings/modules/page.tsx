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
import { DEFAULT_BUDGET_TIERS } from "@/lib/settings/budget-tiers";
import { DEFAULT_CASE_BOARD_FILTER } from "@/lib/settings/case-board-filter";
import type { BudgetTier, CaseBoardFilterSettings } from "@/lib/settings/types";
import { CaseBoardFilterEditor } from "@/components/settings/CaseBoardFilterEditor";
import { Separator } from "@/components/ui/separator";

/** 常用中文字型 */
const COMMON_FONTS = [
  "標楷體", "新細明體", "微軟正黑體", "微軟雅黑",
  "華康中黑體", "華康楷書體", "Noto Sans TC", "Noto Serif TC",
];
const CUSTOM_FONT_VALUE = "__custom__";

function FontSelect({
  label, value, onChange, customFonts,
}: {
  label: string; value: string; onChange: (v: string) => void; customFonts: string[];
}) {
  const allOptions = [...COMMON_FONTS, ...customFonts.filter((f) => !COMMON_FONTS.includes(f))];
  const [customMode, setCustomMode] = useState(!allOptions.includes(value) && value !== "");
  if (customMode) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="輸入字型名稱..." />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setCustomMode(false)}>選單</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={allOptions.includes(value) ? value : CUSTOM_FONT_VALUE} onValueChange={(v) => { if (v === CUSTOM_FONT_VALUE) { setCustomMode(true); } else { onChange(v); } }}>
        <SelectTrigger><SelectValue placeholder="選擇字型" /></SelectTrigger>
        <SelectContent>
          {allOptions.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
          <SelectItem value={CUSTOM_FONT_VALUE}>自訂...</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

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

  // 預算規模級距的 local state
  const [budgetTiers, setBudgetTiers] = useState<BudgetTier[]>(
    settings.budgetTiers ?? DEFAULT_BUDGET_TIERS,
  );

  // 案件看板篩選條件的 local state
  const [caseFilter, setCaseFilter] = useState<CaseBoardFilterSettings>(
    settings.caseBoardFilter ?? DEFAULT_CASE_BOARD_FILTER,
  );

  // 公司資訊的 local state
  const [company, setCompany] = useState(settings.company);

  // 輸出格式的 local state
  const [doc, setDoc] = useState(settings.document);
  const [newFontName, setNewFontName] = useState("");

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) {
      setModules(settings.modules);
      setToggles(settings.featureToggles ?? getDefaultToggles());
      setFieldMapping(settings.fieldMapping ?? {});
      setScanKeywords(settings.scan?.searchKeywords ?? [...DEFAULT_SEARCH_KEYWORDS]);
      setBudgetTiers(settings.budgetTiers ?? DEFAULT_BUDGET_TIERS);
      setCaseFilter(settings.caseBoardFilter ?? DEFAULT_CASE_BOARD_FILTER);
      setCompany(settings.company);
      setDoc(settings.document);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleSaveScanKeywords() {
    updateSettings({ scan: { ...settings.scan, searchKeywords: scanKeywords } });
    toast.success("巡標關鍵字已儲存");
  }

  function handleSaveCompany() {
    updateSection("company", company);
    toast.success("公司資訊已儲存");
  }

  function handleSaveDocument() {
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
    setDoc({ ...doc, fonts: { ...doc.fonts, customFonts: [...doc.fonts.customFonts, { name, filename: "" }] } });
    setNewFontName("");
    toast.success(`已新增自訂字型「${name}」`);
  }

  function removeCustomFont(name: string) {
    setDoc({ ...doc, fonts: { ...doc.fonts, customFonts: doc.fonts.customFonts.filter((f) => f.name !== name) } });
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
  const sectionOrder: FeatureDefinition["section"][] = ["command", "intelligence", "planning", "admin"];

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
          <TabsTrigger value="budget-tiers">預算規模</TabsTrigger>
          <TabsTrigger value="case-filter">看板篩選</TabsTrigger>
          <TabsTrigger value="company">公司資訊</TabsTrigger>
          <TabsTrigger value="output-format">輸出格式</TabsTrigger>
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

        {/* ====== 預算規模 ====== */}
        <TabsContent value="budget-tiers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">預算規模級距</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                系統依預算金額自動分類顯示，不儲存至 Notion。可自由增減級距數量與金額。
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">級距名稱</TableHead>
                    <TableHead>上限金額（萬元）</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetTiers.map((tier, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={tier.name}
                          onChange={(e) => {
                            const next = [...budgetTiers];
                            next[i] = { ...next[i], name: e.target.value };
                            setBudgetTiers(next);
                          }}
                          className="h-7 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        {tier.maxAmount === null ? (
                          <span className="text-sm text-muted-foreground">不設上限（最高級）</span>
                        ) : (
                          <Input
                            type="number"
                            value={Math.round(tier.maxAmount / 10_000)}
                            min={0}
                            onChange={(e) => {
                              const next = [...budgetTiers];
                              next[i] = { ...next[i], maxAmount: Number(e.target.value) * 10_000 };
                              setBudgetTiers(next);
                            }}
                            className="h-7 text-sm w-32"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {budgetTiers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const next = budgetTiers.filter((_, idx) => idx !== i);
                              // 若刪除的是最後一個（null），讓新的最後一個變 null
                              if (tier.maxAmount === null && next.length > 0) {
                                next[next.length - 1] = { ...next[next.length - 1], maxAmount: null };
                              }
                              setBudgetTiers(next);
                            }}
                          >
                            &times;
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  // 插入在最後一個（null）之前
                  const withoutLast = budgetTiers.slice(0, -1);
                  const lastTier = budgetTiers[budgetTiers.length - 1];
                  const prevMax = withoutLast[withoutLast.length - 1]?.maxAmount ?? 0;
                  const newTier: BudgetTier = {
                    name: '新級距',
                    maxAmount: (prevMax ?? 0) + 500_000,
                  };
                  setBudgetTiers([...withoutLast, newTier, lastTier]);
                }}
              >
                + 新增級距
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setBudgetTiers(settings.budgetTiers ?? DEFAULT_BUDGET_TIERS)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                updateSettings({ budgetTiers });
                toast.success("預算規模設定已儲存");
              }}
            >
              儲存設定
            </Button>
          </div>
        </TabsContent>

        {/* ====== 看板篩選 ====== */}
        <TabsContent value="case-filter" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">案件看板篩選條件</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                系統根據這些條件從 Notion 撈案件，像 Notion 的篩選功能一樣可自由設定。
              </p>
            </CardHeader>
            <CardContent>
              <CaseBoardFilterEditor value={caseFilter} onChange={setCaseFilter} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setCaseFilter(settings.caseBoardFilter ?? DEFAULT_CASE_BOARD_FILTER)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                updateSettings({ caseBoardFilter: caseFilter });
                toast.success("看板篩選條件已儲存");
              }}
            >
              儲存設定
            </Button>
          </div>
        </TabsContent>

        {/* ====== 公司資訊 ====== */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mod-company-name">公司名稱</Label>
                <Input
                  id="mod-company-name"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-tax-id">統一編號</Label>
                <Input
                  id="mod-tax-id"
                  value={company.taxId}
                  onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-brand">品牌（用於情報搜尋）</Label>
                <Input
                  id="mod-brand"
                  value={company.brand}
                  onChange={(e) => setCompany({ ...company, brand: e.target.value })}
                  placeholder="例：大員洛川"
                />
                <p className="text-xs text-muted-foreground">
                  情報模組會用這個名稱搜尋你的投標紀錄和競爭分析
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-logo-path">Logo 路徑</Label>
                <Input
                  id="mod-logo-path"
                  placeholder="/images/logo.png"
                  value={company.logoPath ?? ""}
                  onChange={(e) => setCompany({ ...company, logoPath: e.target.value || undefined })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setCompany(settings.company)}>取消</Button>
            <Button onClick={handleSaveCompany}>儲存公司資訊</Button>
          </div>
        </TabsContent>

        {/* ====== 輸出格式 ====== */}
        <TabsContent value="output-format" className="mt-4 space-y-6">
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
                  customFonts={doc.fonts.customFonts.map((f) => f.name)}
                />
                <FontSelect
                  label="標題字型"
                  value={doc.fonts.heading}
                  onChange={(v) => setDoc({ ...doc, fonts: { ...doc.fonts, heading: v } })}
                  customFonts={doc.fonts.customFonts.map((f) => f.name)}
                />
                <FontSelect
                  label="頁首/頁尾字型"
                  value={doc.fonts.headerFooter}
                  onChange={(v) => setDoc({ ...doc, fonts: { ...doc.fonts, headerFooter: v } })}
                  customFonts={doc.fonts.customFonts.map((f) => f.name)}
                />
              </div>

              <Separator />

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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFont(); } }}
                  />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={addCustomFont}>新增字型</Button>
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
                    onChange={(e) => setDoc({ ...doc, fontSize: { ...doc.fontSize, [key]: Number(e.target.value) } })}
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
                    onValueChange={(v) => setDoc({ ...doc, page: { ...doc.page, size: v as "A4" | "Letter" | "custom" } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setDoc({ ...doc, page: { ...doc.page, lineSpacing: Number(e.target.value) } })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["top", "bottom", "left", "right"] as const).map((side) => (
                  <div key={side} className="space-y-2">
                    <Label>{side === "top" ? "上" : side === "bottom" ? "下" : side === "left" ? "左" : "右"}邊距（cm）</Label>
                    <Input
                      type="number"
                      step={0.1}
                      min={0}
                      max={5}
                      value={doc.page.margins[side]}
                      onChange={(e) => setDoc({ ...doc, page: { ...doc.page, margins: { ...doc.page.margins, [side]: Number(e.target.value) } } })}
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
                    onChange={(e) => setDoc({ ...doc, page: { ...doc.page, paragraphSpacing: { ...doc.page.paragraphSpacing, before: Number(e.target.value) } } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>段後間距（pt）</Label>
                  <Input
                    type="number"
                    min={0}
                    max={72}
                    value={doc.page.paragraphSpacing.after}
                    onChange={(e) => setDoc({ ...doc, page: { ...doc.page, paragraphSpacing: { ...doc.page.paragraphSpacing, after: Number(e.target.value) } } })}
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
                <p className="text-xs text-muted-foreground">可用變數：{"{{案名}}"} {"{{章節名}}"} {"{{公司名}}"}</p>
              </div>
              <div className="space-y-2">
                <Label>頁尾範本</Label>
                <Input
                  value={doc.footer.template}
                  onChange={(e) => setDoc({ ...doc, footer: { ...doc.footer, template: e.target.value } })}
                />
                <p className="text-xs text-muted-foreground">可用變數：{"{{公司名}}"} {"{{頁碼}}"} {"{{總頁數}}"}</p>
              </div>
              <div className="space-y-2">
                <Label>雲端硬碟命名規則</Label>
                <Input
                  value={doc.driveNamingRule}
                  onChange={(e) => setDoc({ ...doc, driveNamingRule: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">可用變數：{"{{唯一碼}}"} {"{{民國年}}"} {"{{月}}"} {"{{日}}"} {"{{案名}}"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDoc(settings.document)}>取消</Button>
            <Button onClick={handleSaveDocument}>儲存文件設定</Button>
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
