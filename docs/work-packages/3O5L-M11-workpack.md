# 3O5L 工作包：M11 結案飛輪

> **分派者**：JDNE | **優先序**：🔴 最高 | **截止日期**：2026-02-25

---

## 任務概覽

- **M11 結案飛輪** — 完成規格（216 行），新接手。實裝結案文件生成 + 知識庫回流 + 成功模式識別。

**工作量估計**：約 2.5 天

**依賴**：M02 知識庫（用於回流資料）

---

## 一、M11 結案飛輪

### 1.1 代碼結構

```
src/lib/m11/
  ├── types.ts                    ← 介面定義
  ├── constants.ts                ← 結案狀態、成功模式分類
  ├── helpers.ts                  ← 結案文件生成、KB 回流邏輯
  ├── useM11Closeout.ts           ← Hook（資料取得 + 生成）
  ├── successPatternMatcher.ts   ← 成功模式識別引擎
  └── __tests__/
      ├── helpers.test.ts
      ├── successPatternMatcher.test.ts
      ├── useM11Closeout.test.ts
      └── integration.test.ts

src/components/m11/
  ├── CloseoutForm.tsx            ← 結案評分表單
  ├── KBReflection.tsx            ← 知識庫回流編輯器
  ├── SuccessPatterns.tsx         ← 成功模式展示
  └── CloseoutReport.tsx          ← 結案報告預覽

src/app/api/m11/
  ├── route.ts
  ├── generate-closeout/          ← POST /api/m11/generate-closeout
  ├── submit-reflection/          ← POST /api/m11/submit-reflection
  ├── identify-patterns/          ← POST /api/m11/identify-patterns
  ├── kb-backflow/                ← POST /api/m11/kb-backflow
  └── export/                     ← POST /api/m11/export

src/data/config/
  └── m11-templates.ts            ← 結案模板、評分維度、成功模式分類
```

### 1.2 API 設計

#### POST /api/m11/generate-closeout
**功能**：根據合約完成、成本實績，生成結案初版

**請求**：
```typescript
{
  bidId: string;
  contractId?: string;            // M10 契約 ID（可選）
  actualCompletion: {
    date: ISO8601;
    performanceScore: number;     // 0-100（履約品質）
    budgetVariance: number;       // % (正=超支)
    scheduleVariance: number;     // % (正=延期)
  };
  clientFeedback?: string;        // 客戶回饋
  internalReview?: string;        // 內部檢討意見
}
```

**回應**：
```typescript
{
  success: boolean;
  closeoutId: string;
  closeoutReport: {
    id: string;
    bidId: string;
    generatedAt: ISO8601;
    sections: {
      summary: string;            // 執行摘要
      achievements: string[];     // 重點成就
      challenges: string[];       // 面臨挑戰
      financialSummary: {
        budgetedAmount: number;
        actualAmount: number;
        variance: number;
      };
      qualityScore: number;       // 0-100
      clientSatisfaction: number; // 0-100
      lessonsLearned: string[];   // 獲得的經驗
      recommendations: string[];  // 後續建議
    };
  };
  successPatterns?: {
    identified: string[];         // 識別出的成功模式
    confidence: number[];         // 信心度 (0-1)
  };
  kbBackflowReady: boolean;       // 是否準備回流 KB
}
```

#### POST /api/m11/identify-patterns
**功能**：基於案件履約結果，自動識別成功模式

**請求**：
```typescript
{
  closeoutId: string;
  kbContext?: {                   // 知識庫上下文
    similarCases?: string[];      // 相似案件 ID
    teamMembers?: string[];       // 參與團隊
  };
}
```

**回應**：
```typescript
{
  success: boolean;
  patterns: {
    name: string;
    category: "process" | "team" | "resource" | "risk-mitigation";
    description: string;
    successMetrics: {
      performanceScore: number;
      costEfficiency: number;
      timelinePredictability: number;
    };
    applicableTo: string[];       // 適用案件類型
    confidence: number;           // 0-1
    evidence: string;             // 來自本案的證據
  }[];
}
```

#### POST /api/m11/kb-backflow
**功能**：將結案資料回流至知識庫（M02）

**請求**：
```typescript
{
  closeoutId: string;
  backflowData: {
    teamReflection?: {            // 回流至 00A（團隊資料庫）
      members: string[];
      certificationsEarned?: string[];
    };
    projectExperience?: {         // 回流至 00B（實績資料庫）
      description: string;
      outcome: string;
      metrics: { key: string; value: string }[];
    };
    processLessons?: {            // 回流至 00C（時程範本庫）
      timeline: string;
      optimizations: string[];
    };
    riskMitigation?: {            // 回流至 00D（應變 SOP 庫）
      risksEncountered: string[];
      mitigationStrategies: string[];
    };
    caseReview?: {                // 回流至 00E（案後檢討庫）
      successFactors: string[];
      improvementAreas: string[];
      recommendations: string[];
    };
  };
}
```

**回應**：
```typescript
{
  success: boolean;
  kbEntries: {
    categoryId: "00A" | "00B" | "00C" | "00D" | "00E";
    entryId: string;
    title: string;
  }[];
  backflowAt: ISO8601;
}
```

#### POST /api/m11/export
**功能**：導出結案報告（PDF / DOCX / Markdown）

**請求**：
```typescript
{
  closeoutId: string;
  format: "pdf" | "docx" | "md";
  includePatterns: boolean;
  includeRecommendations: boolean;
}
```

### 1.3 型別定義（types.ts）

```typescript
// src/lib/m11/types.ts

export type CloseoutStatus = "draft" | "submitted" | "approved" | "archived";

export type SuccessPatternCategory =
  | "process"
  | "team"
  | "resource"
  | "risk-mitigation"
  | "client-engagement";

export interface M11CloseoutReport {
  id: string;
  bidId: string;
  contractId?: string;
  status: CloseoutStatus;
  generatedAt: string;
  submittedAt?: string;

  sections: {
    summary: string;              // 執行摘要
    achievements: string[];       // 重點成就
    challenges: string[];         // 面臨挑戰
    lessonsLearned: string[];     // 經驗教訓
    recommendations: string[];    // 後續建議
  };

  metrics: {
    performanceScore: number;     // 0-100
    clientSatisfaction: number;   // 0-100
    budgetedAmount: number;
    actualAmount: number;
    budgetVariance: number;       // %
    scheduleVariance: number;     // %
  };

  successPatterns: SuccessPattern[];
  kbBackflowStatus: "pending" | "completed";
  kbEntryIds: string[];           // 回流至 KB 的 entry IDs
}

export interface SuccessPattern {
  id: string;
  name: string;
  category: SuccessPatternCategory;
  description: string;
  successMetrics: {
    performanceScore: number;
    costEfficiency: number;
    timelinePredictability: number;
  };
  applicableTo: string[];         // 適用案件類型（e.g., "工程", "顧問", "軟體"）
  confidence: number;             // 0-1
  evidence: string;               // 本案證據
  createdFrom: string;            // 來自哪個結案
}

export interface KBBackflowEntry {
  categoryId: "00A" | "00B" | "00C" | "00D" | "00E";
  content: {
    title: string;
    description: string;
    metadata: Record<string, string>;
  };
  sourceCloseout: string;         // 結案 ID
}

export interface M11SubmitReflectionRequest {
  closeoutId: string;
  clientFeedback: string;
  internalReview: string;
  qualityAssessment: {
    score: number;                // 0-100
    comments: string;
  };
}
```

### 1.4 核心邏輯（helpers.ts）

```typescript
// src/lib/m11/helpers.ts

/**
 * 根據案件資料 + 履約結果，生成結案報告框架
 */
export function generateCloseoutReport(
  bid: BidData,
  contract: M10Contract,
  actualCompletion: {
    date: Date;
    performanceScore: number;
    budgetVariance: number;
    scheduleVariance: number;
  }
): Omit<M11CloseoutReport, "id" | "createdAt"> {
  const report: Omit<M11CloseoutReport, "id" | "createdAt"> = {
    bidId: bid.id,
    contractId: contract.id,
    status: "draft",
    generatedAt: new Date().toISOString(),

    sections: {
      summary: `${bid.title} 專案已於 ${actualCompletion.date.toLocaleDateString("zh-TW")} 完成交付。`,
      achievements: generateAchievements(bid, contract, actualCompletion),
      challenges: generateChallenges(bid, actualCompletion),
      lessonsLearned: [],  // 待用戶補充
      recommendations: [], // 待用戶補充
    },

    metrics: {
      performanceScore: actualCompletion.performanceScore,
      clientSatisfaction: 0,     // 待用戶評分
      budgetedAmount: contract.totalAmount,
      actualAmount: calculateActualAmount(contract),
      budgetVariance: actualCompletion.budgetVariance,
      scheduleVariance: actualCompletion.scheduleVariance,
    },

    successPatterns: [],
    kbBackflowStatus: "pending",
    kbEntryIds: [],
  };

  return report;
}

/** 生成成就列表 */
function generateAchievements(
  bid: BidData,
  contract: M10Contract,
  actualCompletion: any
): string[] {
  const achievements: string[] = [];

  if (actualCompletion.performanceScore >= 90) {
    achievements.push("高品質交付（履約品質 90+）");
  }

  if (Math.abs(actualCompletion.budgetVariance) < 5) {
    achievements.push("精準成本控制（預算偏差 ±5% 內）");
  }

  if (actualCompletion.scheduleVariance < 0) {
    achievements.push(`提前 ${Math.abs(actualCompletion.scheduleVariance)}% 完成`);
  }

  achievements.push(`順利交付 ${bid.title}`);

  return achievements;
}

/** 生成挑戰列表 */
function generateChallenges(bid: BidData, actualCompletion: any): string[] {
  const challenges: string[] = [];

  if (actualCompletion.budgetVariance > 10) {
    challenges.push(`成本超支 ${actualCompletion.budgetVariance}%`);
  }

  if (actualCompletion.scheduleVariance > 10) {
    challenges.push(`進度延期 ${actualCompletion.scheduleVariance}%`);
  }

  if (actualCompletion.performanceScore < 85) {
    challenges.push("品質控制待改進");
  }

  return challenges;
}
```

### 1.5 成功模式識別（successPatternMatcher.ts）

```typescript
// src/lib/m11/successPatternMatcher.ts

/**
 * 自動識別案件中的成功模式
 */
export function identifySuccessPatterns(
  closeoutReport: M11CloseoutReport,
  similarCases?: BidData[]
): SuccessPattern[] {
  const patterns: SuccessPattern[] = [];
  const metrics = closeoutReport.metrics;

  // 模式 1：高效率交付
  if (
    metrics.performanceScore >= 90 &&
    metrics.scheduleVariance <= 0
  ) {
    patterns.push({
      id: nanoid(),
      name: "高效率交付流程",
      category: "process",
      description: "透過嚴密的專案管理與提前規劃，確保高品質且準時交付",
      successMetrics: {
        performanceScore: metrics.performanceScore,
        costEfficiency: 100 - Math.abs(metrics.budgetVariance),
        timelinePredictability: 100,
      },
      applicableTo: extractProjectCategories(similarCases),
      confidence: 0.95,
      evidence: `本案在 ${metrics.performanceScore} 分的高品質下按時完成`,
      createdFrom: closeoutReport.id,
    });
  }

  // 模式 2：精準成本控制
  if (Math.abs(metrics.budgetVariance) < 5) {
    patterns.push({
      id: nanoid(),
      name: "精準成本控制機制",
      category: "resource",
      description: "通過精細的成本估算與追蹤，將預算偏差控制在 ±5% 內",
      successMetrics: {
        performanceScore: metrics.performanceScore,
        costEfficiency: 100,
        timelinePredictability: 100 - Math.abs(metrics.scheduleVariance),
      },
      applicableTo: ["工程", "顧問", "軟體"],
      confidence: 0.9,
      evidence: `成本控制精度達 ${100 - Math.abs(metrics.budgetVariance)}%`,
      createdFrom: closeoutReport.id,
    });
  }

  // 模式 3：風險預防
  if (closeoutReport.sections.challenges.length < 2 && metrics.performanceScore > 85) {
    patterns.push({
      id: nanoid(),
      name: "主動風險預防",
      category: "risk-mitigation",
      description: "透過前期風險識別與應變規劃，有效預防問題發生",
      successMetrics: {
        performanceScore: metrics.performanceScore,
        costEfficiency: 100 - Math.abs(metrics.budgetVariance),
        timelinePredictability: 100 - Math.abs(metrics.scheduleVariance),
      },
      applicableTo: extractProjectCategories(similarCases),
      confidence: 0.85,
      evidence: "執行過程中挑戰較少，品質穩定",
      createdFrom: closeoutReport.id,
    });
  }

  return patterns;
}

function extractProjectCategories(cases?: BidData[]): string[] {
  if (!cases || cases.length === 0) return [];
  return [...new Set(cases.map((c) => c.projectCategory || "").filter(Boolean))];
}
```

### 1.6 React Hook（useM11Closeout.ts）

```typescript
// src/lib/m11/useM11Closeout.ts

export function useM11Closeout(bidId: string) {
  const [closeoutReport, setCloseoutReport] = useState<M11CloseoutReport | null>(
    null
  );
  const [patterns, setPatterns] = useState<SuccessPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCloseout = useCallback(
    async (request: GenerateCloseoutRequest) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/m11/generate-closeout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error("結案報告生成失敗");

        const { closeoutReport: report } = await res.json();
        setCloseoutReport(report);
        return report;
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知錯誤");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const identifyPatterns = useCallback(
    async (closeoutId: string) => {
      try {
        const res = await fetch("/api/m11/identify-patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closeoutId }),
        });

        if (!res.ok) throw new Error("模式識別失敗");

        const { patterns: identified } = await res.json();
        setPatterns(identified);
        return identified;
      } catch (err) {
        setError(err instanceof Error ? err.message : "識別失敗");
      }
    },
    []
  );

  const submitKBBackflow = useCallback(
    async (closeoutId: string, backflowData: KBBackflowData) => {
      try {
        const res = await fetch("/api/m11/kb-backflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closeoutId, backflowData }),
        });

        if (!res.ok) throw new Error("知識庫回流失敗");

        const { kbEntries } = await res.json();
        if (closeoutReport) {
          setCloseoutReport({
            ...closeoutReport,
            kbBackflowStatus: "completed",
            kbEntryIds: kbEntries.map((e) => e.entryId),
          });
        }
        return kbEntries;
      } catch (err) {
        setError(err instanceof Error ? err.message : "回流失敗");
        throw err;
      }
    },
    [closeoutReport]
  );

  return {
    closeoutReport,
    patterns,
    loading,
    error,
    generateCloseout,
    identifyPatterns,
    submitKBBackflow,
  };
}
```

### 1.7 UI 元件（CloseoutForm.tsx）

```typescript
// src/components/m11/CloseoutForm.tsx

export function CloseoutForm({
  onSubmit,
}: {
  onSubmit: (data: GenerateCloseoutRequest) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    actualCompletion: {
      performanceScore: 90,
      budgetVariance: 0,
      scheduleVariance: 0,
    },
    clientFeedback: "",
    internalReview: "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData as any);
      }}
      className="space-y-6"
    >
      <div>
        <Label>履約品質評分</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[formData.actualCompletion.performanceScore]}
            onValueChange={([val]) =>
              setFormData({
                ...formData,
                actualCompletion: {
                  ...formData.actualCompletion,
                  performanceScore: val,
                },
              })
            }
            min={0}
            max={100}
            step={1}
          />
          <span className="text-2xl font-bold">
            {formData.actualCompletion.performanceScore}
          </span>
        </div>
      </div>

      <div>
        <Label>預算偏差 (%)</Label>
        <Input
          type="number"
          value={formData.actualCompletion.budgetVariance}
          onChange={(e) =>
            setFormData({
              ...formData,
              actualCompletion: {
                ...formData.actualCompletion,
                budgetVariance: parseFloat(e.target.value),
              },
            })
          }
          placeholder="0"
        />
      </div>

      <div>
        <Label>進度偏差 (%)</Label>
        <Input
          type="number"
          value={formData.actualCompletion.scheduleVariance}
          onChange={(e) =>
            setFormData({
              ...formData,
              actualCompletion: {
                ...formData.actualCompletion,
                scheduleVariance: parseFloat(e.target.value),
              },
            })
          }
          placeholder="0"
        />
      </div>

      <div>
        <Label>客戶回饋</Label>
        <Textarea
          value={formData.clientFeedback}
          onChange={(e) =>
            setFormData({ ...formData, clientFeedback: e.target.value })
          }
          placeholder="客戶對本案的評價與建議..."
        />
      </div>

      <div>
        <Label>內部檢討</Label>
        <Textarea
          value={formData.internalReview}
          onChange={(e) =>
            setFormData({ ...formData, internalReview: e.target.value })
          }
          placeholder="團隊執行情況、問題與改善..."
        />
      </div>

      <Button type="submit" className="w-full">
        生成結案報告
      </Button>
    </form>
  );
}
```

### 1.8 測試清單（目標：60+ tests）

**helpers.test.ts**：
- [ ] `generateCloseoutReport` 生成完整框架
- [ ] `generateAchievements` 根據指標生成成就
- [ ] `generateChallenges` 識別挑戰

**successPatternMatcher.test.ts**：
- [ ] 高效率交付模式識別
- [ ] 成本控制模式識別
- [ ] 風險預防模式識別
- [ ] 信心度計算正確
- [ ] 適用案件類型提取

**useM11Closeout.test.ts**：
- [ ] `generateCloseout` API 調用成功
- [ ] `identifyPatterns` 模式識別
- [ ] `submitKBBackflow` 知識庫回流
- [ ] 錯誤處理

**integration.test.ts**：
- [ ] 完整流程：生成報告 → 識別模式 → 知識庫回流 → 導出

---

## 二、分派指示

### 📋 檢查清單（開始前）

- [ ] 讀完本工作包
- [ ] 確認 M11 規格文檔位置
- [ ] 查看 M02 知識庫結構（五大類別）
- [ ] npm install && npm run build

### ⏱️ 時間線

| 日期 | 進度 |
|------|------|
| 0223 | 規格確認、API 設計 |
| 0224 09:00 | API routes 完成 |
| 0224 17:00 | Hook + UI 框架 |
| 0225 09:00 | 成功模式識別引擎 + KB 回流邏輯 |
| 0225 17:00 | 測試 50+/60 |
| **0226** | **merge ready** |

### 🚨 注意事項

1. **與 M02 協調**：KB 回流依賴 M02 API 就位，可並行開發
2. **模式識別置信度**：基於統計，置信度應 0.85+ 才推薦
3. **多租戶隔離**：所有 API 必須驗證 `req.user` 與 `bidId` 關聯
4. **Markdown 生成**：結案報告 content 用 Markdown 格式，便於導出

---

**開始日期**：2026-02-23 16:00
**預計完成**：2026-02-25 18:00
**目標分支**：`feature/m11-closeout`
