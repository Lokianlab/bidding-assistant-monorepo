# Z1FV 工作包：M08 評選簡報 + M10 履約管理

> **分派者**：JDNE | **優先序**：🔴 最高 | **截止日期**：2026-02-26

---

## 任務概覽

- **M08 評選簡報** — 完成規格（427 行），需要實裝 API + UI。**目標完成**：2026-02-26
- **M10 履約管理** — 完成規格（185 行），新接手，全新實裝。**目標完成**：2026-02-24

**工作量估計**：M08 約 2.5 天 / M10 約 2 天，可並行推進。

---

## 一、M08 評選簡報（基於 M06 排版模組擴展）

### 1.1 代碼結構

```
src/lib/m08/
  ├── types.ts              ← 介面定義
  ├── constants.ts          ← 規格常數（簡報模板、樣式、欄位）
  ├── helpers.ts            ← 內容組裝邏輯
  ├── useM08Presentation.ts ← Hook（資料取得 + 生成）
  └── __tests__/
      ├── helpers.test.ts
      ├── useM08Presentation.test.ts
      └── integration.test.ts

src/components/m08/
  ├── PresentationTemplates.tsx  ← 模板選擇器
  ├── PPTXBuilder.tsx             ← PPT 組裝引擎（調用 M06 基礎）
  ├── SpeakerNotesEditor.tsx      ← 講稿編輯
  └── PreviewPane.tsx             ← 預覽面板

src/app/api/m08/
  ├── route.ts               ← 統一路由
  ├── generate-presentation/ ← POST /api/m08/generate-presentation
  ├── templates/             ← GET /api/m08/templates
  └── export/                ← POST /api/m08/export

src/data/config/
  └── m08-templates.ts       ← 簡報模板庫（120+ 行）
```

### 1.2 API 設計

#### POST /api/m08/generate-presentation
**功能**：根據案件資料 + 評分結果，生成簡報初版

**請求**：
```typescript
{
  bidId: string;              // 案件 ID（Notion）
  templateId: "standard" | "executive" | "technical"; // 模板選擇
  includeFinancial: boolean;  // 是否含成本分析
  includeTechnical: boolean;  // 是否含技術細節
  targetAudience: "internal" | "client" | "review"; // 目標聽眾
  m03Score?: {                // M03 評分結果（可選）
    fitScore: number;
    riskScore: number;
    // ... 其他 M03 欄位
  };
  m04Rules?: {                // M04 品質閘門結果（可選）
    compliancePass: boolean;
    riskFlags: string[];
  };
}
```

**回應**：
```typescript
{
  success: boolean;
  presentationId: string;     // 簡報記錄 ID
  slides: {
    id: string;
    title: string;
    content: string;          // Markdown
    speakerNotes: string;
    thumbnailUrl?: string;
  }[];
  metadata: {
    generatedAt: ISO8601;
    version: string;
  };
  downloadUrl?: string;       // PPT 下載連結（async job）
}
```

#### GET /api/m08/templates
**功能**：列出可用簡報模板

**回應**：
```typescript
[
  {
    id: "standard";
    name: "標準評選簡報";
    description: "適合一般評選";
    slideCount: 12;
    icon: "📊";
  },
  {
    id: "executive";
    name: "行政高層簡報";
    slideCount: 8;
  },
  // ...
]
```

#### POST /api/m08/export
**功能**：導出簡報為 PPTX / PDF / 講稿

**請求**：
```typescript
{
  presentationId: string;
  format: "pptx" | "pdf" | "md";  // 格式
  includeNotes: boolean;          // 含講稿
}
```

**回應**：
```typescript
{
  success: boolean;
  downloadUrl: string;
  expiresIn: number; // 秒數（e.g. 3600）
}
```

### 1.3 型別定義（types.ts）

```typescript
// src/lib/m08/types.ts

export interface M08PresentationTemplate {
  id: string;
  name: string;
  description: string;
  slideCount: number;
  defaultStyle: "minimal" | "corporate" | "creative";
}

export interface M08Slide {
  id: string;
  index: number;
  title: string;
  content: string;           // Markdown
  speakerNotes: string;
  layout: "title" | "content" | "two-column" | "blank";
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    imageUrl?: string;
  };
}

export interface M08Presentation {
  id: string;
  bidId: string;
  templateId: string;
  slides: M08Slide[];
  metadata: {
    title: string;
    audience: "internal" | "client" | "review";
    generatedAt: string;
    version: string;
    m03IntegrationEnabled: boolean;
    m04IntegrationEnabled: boolean;
  };
}

export interface M08GenerateRequest {
  bidId: string;
  templateId: string;
  includeFinancial: boolean;
  includeTechnical: boolean;
  targetAudience: "internal" | "client" | "review";
  m03Score?: any;
  m04Rules?: any;
}

export interface M08ExportRequest {
  presentationId: string;
  format: "pptx" | "pdf" | "md";
  includeNotes: boolean;
}
```

### 1.4 核心邏輯（helpers.ts）

```typescript
// src/lib/m08/helpers.ts

/**
 * 根據案件資料 + 評分 + 模板，組裝簡報架構
 * @returns Slide 陣列
 */
export function assembleSlides(
  bid: BidData,
  template: M08PresentationTemplate,
  options: {
    m03Score?: M03Score;
    m04Rules?: M04Result;
    includeFinancial: boolean;
    includeTechnical: boolean;
  }
): M08Slide[] {
  // 固定框架（所有模板共通）
  const baseSlides: M08Slide[] = [
    createTitleSlide(bid),
    createExecutiveSummarySlide(bid, options.m03Score),
    // ...
  ];

  // 條件添加（根據選項）
  if (options.includeFinancial) {
    baseSlides.push(createFinancialSlide(bid));
  }

  if (options.includeTechnical) {
    baseSlides.push(createTechnicalSlide(bid));
  }

  // M03 集成（如果提供）
  if (options.m03Score) {
    baseSlides.push(createM03RadarSlide(options.m03Score));
  }

  // M04 集成（如果提供）
  if (options.m04Rules) {
    baseSlides.push(createM04ComplianceSlide(options.m04Rules));
  }

  return baseSlides;
}

/** 生成標題頁投影片 */
export function createTitleSlide(bid: BidData): M08Slide {
  return {
    id: nanoid(),
    index: 0,
    title: bid.title || "未命名案件",
    content: `${bid.agency || ""}\n${bid.projectCategory || ""}`,
    speakerNotes: "開場詞：感謝各位蒞臨...",
    layout: "title",
    styling: {
      backgroundColor: "#1e293b",
      textColor: "#ffffff",
    },
  };
}

// ... 其他 slide 生成函式
```

### 1.5 React Hook（useM08Presentation.ts）

```typescript
// src/lib/m08/useM08Presentation.ts

export function useM08Presentation(bidId: string) {
  const [presentation, setPresentation] = useState<M08Presentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePresentation = useCallback(
    async (request: M08GenerateRequest) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/m08/generate-presentation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        setPresentation(data.presentation);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知錯誤");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const exportPresentation = useCallback(
    async (request: M08ExportRequest) => {
      try {
        const res = await fetch("/api/m08/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error(`導出失敗`);

        const { downloadUrl } = await res.json();
        window.open(downloadUrl, "_blank");
      } catch (err) {
        setError(err instanceof Error ? err.message : "導出失敗");
      }
    },
    []
  );

  return {
    presentation,
    loading,
    error,
    generatePresentation,
    exportPresentation,
  };
}
```

### 1.6 UI 元件（PresentationTemplates.tsx）

```typescript
// src/components/m08/PresentationTemplates.tsx

export function PresentationTemplates({
  onSelect,
}: {
  onSelect: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<M08PresentationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/m08/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>載入中...</div>;

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="cursor-pointer hover:shadow-lg"
          onClick={() => onSelect(template.id)}
        >
          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>{template.slideCount} 張投影片</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{template.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 1.7 測試清單（目標：90+ tests）

**helpers.test.ts**：
- [ ] `createTitleSlide` 正確生成標題投影片
- [ ] `assembleSlides` 根據選項添加條件投影片
- [ ] M03 評分與簡報關聯（雷達圖集成）
- [ ] M04 品質結果與簡報關聯（合規檢查清單）
- [ ] 邊界條件：空案件、無評分、多語言標題

**useM08Presentation.test.ts**：
- [ ] `generatePresentation` API 調用成功
- [ ] 錯誤處理（API 500、網路斷連）
- [ ] `exportPresentation` 導出 PPTX/PDF/MD
- [ ] 並行請求（多個簡報同時生成）

**integration.test.ts**：
- [ ] 完整流程：選模板 → 生成簡報 → 預覽 → 導出
- [ ] M03/M04 資料整合是否正確
- [ ] 講稿編輯後是否保存

---

## 二、M10 履約管理（新模組）

### 2.1 代碼結構

```
src/lib/m10/
  ├── types.ts                    ← 介面定義
  ├── constants.ts                ← 契約狀態、里程碑類型
  ├── helpers.ts                  ← 契約生成、進度計算
  ├── useM10ContractManagement.ts ← Hook
  └── __tests__/
      ├── helpers.test.ts
      ├── useM10ContractManagement.test.ts
      └── integration.test.ts

src/components/m10/
  ├── ContractWorksheet.tsx    ← 契約簽署工作表
  ├── MilestoneTracker.tsx     ← 里程碑追蹤
  ├── ProgressReport.tsx       ← 進度報告（月度/季度）
  └── PaymentSchedule.tsx      ← 付款排程視覺化

src/app/api/m10/
  ├── route.ts
  ├── create-contract/         ← POST /api/m10/create-contract
  ├── list-milestones/         ← GET /api/m10/list-milestones/{contractId}
  ├── update-progress/         ← PATCH /api/m10/update-progress/{milestoneId}
  ├── generate-report/         ← POST /api/m10/generate-report
  └── export/                  ← POST /api/m10/export

src/data/config/
  └── m10-templates.ts         ← 契約模板、里程碑預設值
```

### 2.2 API 設計

#### POST /api/m10/create-contract
**功能**：根據案件資料建立履約契約與里程碑

**請求**：
```typescript
{
  bidId: string;
  projectDuration: number;          // 月數
  totalAmount: number;              // 總金額
  paymentTerms: "monthly" | "milestone" | "lump-sum";
  milestoneTemplate?: "standard" | "custom";
  customMilestones?: {
    name: string;
    dueDate: ISO8601;
    weight: number;                 // 0-1
    deliverable: string;
  }[];
}
```

**回應**：
```typescript
{
  success: boolean;
  contract: {
    id: string;
    bidId: string;
    startDate: ISO8601;
    endDate: ISO8601;
    totalAmount: number;
    paymentSchedule: {
      milestone: string;
      amount: number;
      dueDate: ISO8601;
    }[];
    milestones: M10Milestone[];
  };
}
```

#### GET /api/m10/list-milestones/{contractId}
**功能**：列出契約的所有里程碑及其進度

**回應**：
```typescript
[
  {
    id: string;
    contractId: string;
    name: string;
    dueDate: ISO8601;
    status: "pending" | "in-progress" | "completed" | "overdue" | "at-risk";
    progress: number;              // 0-100
    deliverable: string;
    weight: number;
    completedDate?: ISO8601;
    notes: string;
  }
]
```

#### PATCH /api/m10/update-progress/{milestoneId}
**功能**：更新里程碑進度

**請求**：
```typescript
{
  progress: number;                // 0-100
  status?: "in-progress" | "completed" | "at-risk";
  notes?: string;
  completedDate?: ISO8601;         // 如果 status=completed
}
```

#### POST /api/m10/generate-report
**功能**：生成定期進度報告（月度、季度、年度）

**請求**：
```typescript
{
  contractId: string;
  reportType: "monthly" | "quarterly" | "annual";
  period: {
    startDate: ISO8601;
    endDate: ISO8601;
  };
  includeFinancial: boolean;
}
```

**回應**：
```typescript
{
  success: boolean;
  reportId: string;
  report: {
    title: string;
    generatedAt: ISO8601;
    period: { startDate; endDate };
    milestonesSummary: {
      total: number;
      completed: number;
      inProgress: number;
      atRisk: number;
      overdue: number;
    };
    financialSummary?: {
      totalContract: number;
      billedToDate: number;
      pending: number;
      remaining: number;
    };
    content: string;                // Markdown
  };
  downloadUrl?: string;
}
```

### 2.3 型別定義（types.ts）

```typescript
// src/lib/m10/types.ts

export type MilestoneStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "overdue"
  | "at-risk";

export interface M10Milestone {
  id: string;
  contractId: string;
  name: string;
  dueDate: string;              // ISO8601
  status: MilestoneStatus;
  progress: number;             // 0-100
  deliverable: string;
  weight: number;               // 0-1（影響整體進度）
  completedDate?: string;
  notes: string;
  riskFactors?: string[];       // 風險因素清單
}

export interface M10Contract {
  id: string;
  bidId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paymentTerms: "monthly" | "milestone" | "lump-sum";
  paymentSchedule: {
    milestone: string;
    amount: number;
    dueDate: string;
    status: "pending" | "billed" | "paid";
  }[];
  milestones: M10Milestone[];
  status: "draft" | "active" | "completed" | "on-hold";
  createdAt: string;
  updatedAt: string;
}

export interface M10ProgressReport {
  id: string;
  contractId: string;
  reportType: "monthly" | "quarterly" | "annual";
  period: { startDate: string; endDate: string };
  generatedAt: string;
  milestonesSummary: {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
    overdue: number;
  };
  overallProgress: number;       // 0-100（加權平均）
  financialSummary?: {
    totalContract: number;
    billedToDate: number;
    pending: number;
    remaining: number;
  };
  content: string;               // Markdown
}
```

### 2.4 核心邏輯（helpers.ts）

```typescript
// src/lib/m10/helpers.ts

/**
 * 根據專案時長 + 總金額，生成標準里程碑範本
 * @returns Milestone 陣列
 */
export function generateStandardMilestones(
  projectDuration: number,       // 月數
  totalAmount: number,
  startDate: Date
): M10Milestone[] {
  // 標準範本：30% phase 1 / 50% phase 2 / 20% phase 3
  const milestones: M10Milestone[] = [];

  const phase1End = new Date(startDate);
  phase1End.setMonth(phase1End.getMonth() + Math.ceil(projectDuration * 0.3));
  milestones.push({
    id: nanoid(),
    contractId: "", // 待設定
    name: "Phase 1：系統設計與規劃",
    dueDate: phase1End.toISOString(),
    status: "pending",
    progress: 0,
    deliverable: "設計文件、系統規格書",
    weight: 0.3,
    notes: "",
  });

  // Phase 2, Phase 3...

  return milestones;
}

/**
 * 計算合約的加權進度（0-100）
 */
export function calculateOverallProgress(milestones: M10Milestone[]): number {
  if (milestones.length === 0) return 0;

  const weighted = milestones.reduce((sum, m) => {
    return sum + m.progress * m.weight;
  }, 0);

  return Math.round(weighted * 100) / 100;
}

/**
 * 判定里程碑狀態（pending/in-progress/completed/overdue/at-risk）
 */
export function determineMilestoneStatus(
  milestone: M10Milestone,
  today: Date = new Date()
): MilestoneStatus {
  if (milestone.progress === 100) return "completed";

  const dueDate = new Date(milestone.dueDate);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue < 7 && milestone.progress < 80) return "at-risk";
  if (milestone.progress > 0) return "in-progress";

  return "pending";
}
```

### 2.5 React Hook（useM10ContractManagement.ts）

```typescript
// src/lib/m10/useM10ContractManagement.ts

export function useM10ContractManagement(contractId?: string) {
  const [contract, setContract] = useState<M10Contract | null>(null);
  const [milestones, setMilestones] = useState<M10Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContract = useCallback(
    async (request: CreateContractRequest) => {
      setLoading(true);
      try {
        const res = await fetch("/api/m10/create-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error("契約建立失敗");

        const { contract: newContract } = await res.json();
        setContract(newContract);
        setMilestones(newContract.milestones);
        return newContract;
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知錯誤");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateMilestoneProgress = useCallback(
    async (milestoneId: string, progress: number, status?: MilestoneStatus) => {
      try {
        const res = await fetch(`/api/m10/update-progress/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress, status }),
        });

        if (!res.ok) throw new Error("更新失敗");

        const { milestone } = await res.json();
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? milestone : m))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新失敗");
      }
    },
    []
  );

  const generateReport = useCallback(
    async (request: GenerateReportRequest) => {
      try {
        const res = await fetch("/api/m10/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error("報告生成失敗");

        return await res.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "生成失敗");
        throw err;
      }
    },
    []
  );

  return {
    contract,
    milestones,
    loading,
    error,
    createContract,
    updateMilestoneProgress,
    generateReport,
  };
}
```

### 2.6 UI 元件（MilestoneTracker.tsx）

```typescript
// src/components/m10/MilestoneTracker.tsx

export function MilestoneTracker({ milestones }: { milestones: M10Milestone[] }) {
  return (
    <div className="space-y-4">
      {milestones.map((milestone) => (
        <Card key={milestone.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{milestone.name}</CardTitle>
                <CardDescription>
                  截止日期：{new Date(milestone.dueDate).toLocaleDateString("zh-TW")}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(milestone.status)}>
                {getMilestoneStatusLabel(milestone.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">進度</span>
                <span className="text-sm text-gray-600">{milestone.progress}%</span>
              </div>
              <Progress value={milestone.progress} className="h-2" />
            </div>
            <div className="text-sm text-gray-600">
              <strong>交付物：</strong>{milestone.deliverable}
            </div>
            {milestone.notes && (
              <div className="text-sm bg-blue-50 p-2 rounded">
                <strong>備註：</strong> {milestone.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 2.7 測試清單（目標：80+ tests）

**helpers.test.ts**：
- [ ] `generateStandardMilestones` 生成符合比例的里程碑
- [ ] `calculateOverallProgress` 加權進度計算正確
- [ ] `determineMilestoneStatus` 狀態判定（逾期、風險、完成）
- [ ] 邊界條件：0 月數、負金額、日期計算

**useM10ContractManagement.test.ts**：
- [ ] `createContract` API 調用成功
- [ ] `updateMilestoneProgress` 更新進度
- [ ] `generateReport` 生成月/季/年度報告
- [ ] 錯誤處理

**integration.test.ts**：
- [ ] 完整流程：建立契約 → 更新里程碑 → 生成報告
- [ ] 付款排程與里程碑同步
- [ ] 多個契約並存管理

---

## 三、分派指示

### 📋 檢查清單（開始前）

- [ ] 讀完本工作包
- [ ] 確認 M08 規格文檔位置（docs/dev-plan/M08-...md）
- [ ] 確認 M10 規格文檔位置（docs/dev-plan/M10-...md）
- [ ] 確認 M06 排版模組已完成（複用PPT導出邏輯）
- [ ] npm install && npm run build（驗證環境）

### ⏱️ 時間線

| 日期 | M08 進度 | M10 進度 |
|------|---------|---------|
| 今日（0223） | 確認規格、設計 API | 設計 API contract |
| 0224 09:00 | API routes 完成 | API routes 完成 |
| 0224 17:00 | Hook + UI 框架 | Hook + UI 框架 |
| 0225 09:00 | 集成 M06 邏輯 | 里程碑追蹤 UI 完成 |
| 0225 17:00 | 測試 50+/90 | 測試 50+/80 |
| 0226 09:00 | 測試 90+ 通過 | 測試 80+ 通過 |
| 0226 17:00 | merge ready | merge ready |

### 🚨 注意事項

1. **M08 複用 M06**：不要重寫 PPTX 導出邏輯，調用 `src/lib/output/pptx-builder.ts`
2. **M10 多租戶隔離**：所有 API routes 必須檢查 `req.user` 確保資料隔離
3. **測試優先**：先寫測試，再寫功能（TDD）
4. **無硬編碼路徑**：所有檔案路徑使用 `@/` 別名
5. **實時通知 JDNE**：遇到阻塞立即報 Slack/OP

### 📞 支援

- **規格問題**：查 `docs/dev-plan/{M08|M10}-*.md`
- **API 整合**：參考 `src/lib/output/` 或 `src/app/api/docgen/`
- **測試寫法**：參考 `src/lib/strategy/__tests__/` 或 `src/lib/quality/__tests__/`
- **型別問題**：查 `src/lib/{feature}/types.ts`

---

**開始日期**：2026-02-23 16:00
**預計完成**：2026-02-26 18:00
**目標分支**：`feature/m08-m10-impl`
