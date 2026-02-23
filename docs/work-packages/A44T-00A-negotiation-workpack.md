# A44T 工作包：00A 外部資源整合 + 議價補強

> **分派者**：JDNE | **優先序**：🟠 高 | **截止日期**：2026-02-26

---

## 任務概覽

- **00A 外部資源整合** — 第 3 階段缺口，團隊選人推薦系統。需要設計 + 規範 + 實裝。
- **議價補強** — 第 10 階段擴展，成本底線分析 + 議價區間建議。

**工作量估計**：00A 約 2-3 天 / 議價 約 1 天（可部分並行）

---

## 一、00A 外部資源整合

### 目標

第 3 階段「外部資源整合」：根據案件需求 + 團隊技能矩陣，自動推薦合適的團隊成員。

### 1.1 代碼結構

```
src/lib/external-resources/
  ├── types.ts                  ← 介面定義
  ├── constants.ts              ← 技能矩陣、職級定義
  ├── matcher.ts                ← 核心推薦引擎
  ├── useResourceMatcher.ts     ← Hook
  └── __tests__/
      ├── matcher.test.ts
      ├── useResourceMatcher.test.ts
      └── integration.test.ts

src/components/external-resources/
  ├── TeamResourcePanel.tsx     ← 選人推薦界面
  ├── ResourceMatcher.tsx       ← 推薦引擎互動
  ├── TeamMemberCard.tsx        ← 成員卡片
  └── SkillMatrixView.tsx       ← 技能矩陣視覺化

src/app/api/external-resources/
  ├── route.ts
  ├── match-resources/          ← POST /api/external-resources/match
  ├── team-members/             ← GET /api/external-resources/team-members
  ├── skill-matrix/             ← GET /api/external-resources/skill-matrix
  └── history/                  ← GET /api/external-resources/history

docs/dev-plan/
  └── 00A-team-resources.md     ← 規範文檔（A44T 需要寫）
```

### 1.2 核心概念

#### 技能矩陣（Skill Matrix）

```
技能維度（維度範例）：
- 軟體開發：前端、後端、DevOps、QA
- 工程與建築：結構、機械、電氣、土木、水利
- 顧問服務：策略、財務、營運、法律、人資
- 專案管理：進度管理、成本控制、風險管理、客戶溝通
```

#### 推薦算法

1. **需求分析**：從案件描述 + 類別提取所需技能集合
2. **技能匹配**：與團隊成員技能對齊，計算適配度分數
3. **經驗加權**：考慮歷史合作記錄（成功案例權重更高）
4. **排序推薦**：按適配度 → 可用度 → 過往成功率排序

### 1.3 型別定義（types.ts）

```typescript
// src/lib/external-resources/types.ts

export interface TeamMember {
  id: string;
  name: string;
  title: string;                  // 職級（如：資深工程師、專案經理）
  department?: string;
  skills: string[];               // 技能 ID 陣列
  skillLevels: Record<string, 1 | 2 | 3 | 4 | 5>; // 每個技能的熟練度 1-5
  certifications?: string[];      // 認證列表
  availability: "available" | "busy" | "on-leave";
  workHistory: WorkHistoryEntry[];
  successRate?: number;           // 0-1
}

export interface WorkHistoryEntry {
  bidId: string;
  role: string;
  startDate: ISO8601;
  endDate?: ISO8601;
  outcome: "success" | "partial" | "failed";
  clientFeedback?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;               // 軟體開發、工程、顧問等
  description?: string;
}

export interface ResourceMatchRequest {
  bidId: string;
  projectCategory: string;
  requiredSkills: string[];      // 需要的技能 ID
  teamSize: number;              // 預計需要的人數
  skillWeights?: Record<string, number>; // 技能權重（0-1）
}

export interface ResourceMatchResult {
  matches: {
    member: TeamMember;
    fitScore: number;             // 0-1
    skillMatchDetails: {
      skill: string;
      memberLevel: number;        // 1-5
      required: boolean;
    }[];
    successHistory?: {
      successCount: number;
      totalProjects: number;
    };
    notes?: string;
  }[];
  unmetSkills: string[];          // 未能覆蓋的技能
  totalFitness: number;           // 0-1（整體適配度）
}
```

### 1.4 推薦引擎（matcher.ts）

```typescript
// src/lib/external-resources/matcher.ts

/**
 * 主推薦函式：根據案件需求匹配團隊成員
 */
export function matchResources(
  request: ResourceMatchRequest,
  teamMembers: TeamMember[],
  availableOnly = true
): ResourceMatchResult {
  // 篩選可用成員
  let candidates = availableOnly
    ? teamMembers.filter((m) => m.availability === "available")
    : teamMembers;

  // 計算每個成員的適配度分數
  const matches = candidates
    .map((member) => {
      const fitScore = calculateFitScore(member, request);
      return {
        member,
        fitScore,
        skillMatchDetails: getSkillMatchDetails(member, request),
        successHistory: getSuccessHistory(member),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, request.teamSize); // 只返回前 N 名

  // 識別未覆蓋的技能
  const coveredSkills = new Set<string>();
  matches.forEach((m) => {
    m.skillMatchDetails
      .filter((s) => s.memberLevel >= 3) // 熟練度 3+ 視為可覆蓋
      .forEach((s) => coveredSkills.add(s.skill));
  });

  const unmetSkills = request.requiredSkills.filter(
    (s) => !coveredSkills.has(s)
  );

  // 計算整體適配度
  const totalFitness = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.fitScore, 0) / matches.length
    : 0;

  return {
    matches,
    unmetSkills,
    totalFitness,
  };
}

/**
 * 計算單個成員的適配度分數（0-1）
 */
function calculateFitScore(
  member: TeamMember,
  request: ResourceMatchRequest
): number {
  let score = 0;
  let weightSum = 0;

  const weights = request.skillWeights || {};

  request.requiredSkills.forEach((skillId) => {
    const weight = weights[skillId] || 1; // 預設權重 1
    const memberLevel = member.skillLevels[skillId] || 0; // 0 表示無此技能

    // 熟練度 → 0-1 分數
    const skillScore = memberLevel / 5;
    score += skillScore * weight;
    weightSum += weight;
  });

  // 基礎分 = 技能匹配度
  let baseScore = weightSum > 0 ? score / weightSum : 0;

  // 加權歷史成功率（佔 20%）
  const successRate = member.successRate || 0.5;
  const finalScore = baseScore * 0.8 + successRate * 0.2;

  return Math.min(finalScore, 1);
}

/**
 * 獲得詳細的技能匹配情況
 */
function getSkillMatchDetails(
  member: TeamMember,
  request: ResourceMatchRequest
): {
  skill: string;
  memberLevel: number;
  required: boolean;
}[] {
  return request.requiredSkills.map((skillId) => ({
    skill: skillId,
    memberLevel: member.skillLevels[skillId] || 0,
    required: true,
  }));
}

/**
 * 獲得成員的過去成功記錄
 */
function getSuccessHistory(
  member: TeamMember
): { successCount: number; totalProjects: number } {
  const total = member.workHistory.length;
  const successful = member.workHistory.filter(
    (w) => w.outcome === "success"
  ).length;

  return {
    successCount: successful,
    totalProjects: total,
  };
}
```

### 1.5 React Hook（useResourceMatcher.ts）

```typescript
// src/lib/external-resources/useResourceMatcher.ts

export function useResourceMatcher() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [results, setResults] = useState<ResourceMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化：加載團隊成員 + 技能清單
  useEffect(() => {
    const loadData = async () => {
      try {
        const [membersRes, skillsRes] = await Promise.all([
          fetch("/api/external-resources/team-members"),
          fetch("/api/external-resources/skill-matrix"),
        ]);

        if (membersRes.ok && skillsRes.ok) {
          setTeamMembers(await membersRes.json());
          setSkills(await skillsRes.json());
        }
      } catch (err) {
        setError("載入失敗");
      }
    };

    loadData();
  }, []);

  const matchResources = useCallback(
    async (request: ResourceMatchRequest) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/external-resources/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error("推薦失敗");

        const data = await res.json();
        setResults(data);
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

  return {
    teamMembers,
    skills,
    results,
    loading,
    error,
    matchResources,
  };
}
```

### 1.6 UI 元件（TeamResourcePanel.tsx）

```typescript
// src/components/external-resources/TeamResourcePanel.tsx

export function TeamResourcePanel({ bidId, projectCategory }: { bidId: string; projectCategory: string }) {
  const { skills, loading: dataLoading, matchResources, results, loading } = useResourceMatcher();
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState(3);

  const handleMatch = async () => {
    await matchResources({
      bidId,
      projectCategory,
      requiredSkills,
      teamSize,
    });
  };

  return (
    <div className="space-y-6">
      {/* 技能選擇 */}
      <div>
        <Label>所需技能</Label>
        <div className="grid grid-cols-2 gap-2">
          {skills.map((skill) => (
            <label key={skill.id} className="flex items-center gap-2">
              <Checkbox
                checked={requiredSkills.includes(skill.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setRequiredSkills([...requiredSkills, skill.id]);
                  } else {
                    setRequiredSkills(requiredSkills.filter((s) => s !== skill.id));
                  }
                }}
              />
              <span>{skill.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 團隊規模 */}
      <div>
        <Label>預計團隊規模：{teamSize} 人</Label>
        <Slider
          value={[teamSize]}
          onValueChange={([val]) => setTeamSize(val)}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* 推薦按鈕 */}
      <Button onClick={handleMatch} disabled={loading || requiredSkills.length === 0} className="w-full">
        {loading ? "推薦中..." : "推薦團隊成員"}
      </Button>

      {/* 推薦結果 */}
      {results && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">推薦結果</h3>
            <p className="text-sm">
              整體適配度：{Math.round(results.totalFitness * 100)}%
            </p>
            {results.unmetSkills.length > 0 && (
              <p className="text-sm text-red-600">
                未覆蓋技能：{results.unmetSkills.join("、")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {results.matches.map((match) => (
              <TeamMemberCard key={match.member.id} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 1.7 規範文檔（00A-team-resources.md）

**A44T 需要寫**（500-700 行）：

```markdown
# 00A 外部資源整合規範

## 1. 技能矩陣定義

### 1.1 技能分類
- **軟體開發**：前端、後端、DevOps、QA
- **工程與建築**：結構、機械、電氣、土木、水利
- **顧問服務**：策略、財務、營運、法律、人資
- **專案管理**：進度管理、成本控制、風險管理

### 1.2 熟練度等級
1. 初學者
2. 有經驗
3. 熟練
4. 專家
5. 領域頂尖

## 2. 推薦算法

### 2.1 基礎分 = 技能匹配度（80% 權重）

...（含公式、案例分析）

### 2.2 成功率加權（20% 權重）

...

## 3. API 設計

...（含 endpoint 詳細說明）

## 4. 測試清單

...（含 60+ 測試要求）
```

### 1.8 測試清單（目標：60+ tests）

**matcher.test.ts**：
- [ ] `calculateFitScore` 正確計算適配度
- [ ] `matchResources` 排序正確
- [ ] 邊界條件：無技能、無成員、全部不可用
- [ ] 多個成員相同適配度時排序邏輯

**useResourceMatcher.test.ts**：
- [ ] Hook 初始化加載數據
- [ ] `matchResources` API 調用
- [ ] 錯誤處理

**integration.test.ts**：
- [ ] 完整流程：選技能 → 設定規模 → 推薦
- [ ] 未覆蓋技能識別正確
- [ ] 成功記錄計算

---

## 二、議價補強

### 目標

第 10 階段「議價」：基於成本分析，自動生成議價區間建議 + 底線分析。

### 2.1 代碼結構

```
src/lib/pricing/
  ├── negotiation-analysis.ts  ← 新增（議價邏輯）
  ├── __tests__/
      └── negotiation-analysis.test.ts

src/components/pricing/
  └── NegotiationPanel.tsx      ← 補強（UI 擴展）
```

### 2.2 核心邏輯（negotiation-analysis.ts）

```typescript
// src/lib/pricing/negotiation-analysis.ts

export interface NegotiationAnalysis {
  baseCost: number;
  profitMargin: number;           // %
  bottomLine: number;             // 最低可接受價格
  negotiationRange: {
    floor: number;                // 下限（+5% buffer）
    ceiling: number;              // 上限（基礎報價）
    recommended: number;          // 建議出價
  };
  strategy: string;               // "aggressive" | "balanced" | "conservative"
  reasoning: string[];            // 理由列表
}

/**
 * 基於成本分析，生成議價建議
 */
export function generateNegotiationStrategy(
  baseCost: number,
  marketRate: number,            // 市場行情
  riskFactors: string[],          // 風險因素
  clientType: "government" | "private" | "international", // 客戶類型
  strategy: "aggressive" | "balanced" | "conservative" = "balanced"
): NegotiationAnalysis {
  // 計算利潤邊界
  const profitMargin = calculateProfitMargin(baseCost, marketRate);

  // 計算底線（成本 + 最小利潤 + 風險預留）
  const riskBuffer = calculateRiskBuffer(riskFactors); // 0.05-0.20
  const bottomLine = baseCost * (1 + 0.1 + riskBuffer); // 10% 最小利潤 + 風險

  // 議價區間
  const negotiationRange = calculateNegotiationRange(
    bottomLine,
    marketRate,
    strategy,
    clientType
  );

  // 理由列表
  const reasoning = generateReasonings(
    baseCost,
    marketRate,
    riskFactors,
    clientType
  );

  return {
    baseCost,
    profitMargin,
    bottomLine,
    negotiationRange,
    strategy,
    reasoning,
  };
}

/**
 * 計算利潤率
 */
function calculateProfitMargin(baseCost: number, marketRate: number): number {
  return Math.round(((marketRate - baseCost) / baseCost) * 100);
}

/**
 * 計算風險預留比例
 */
function calculateRiskBuffer(riskFactors: string[]): number {
  // 風險因素越多，預留越高
  const bufferPerRisk = 0.03; // 每個風險 +3%
  const maxBuffer = 0.2; // 最高 20%

  return Math.min(riskFactors.length * bufferPerRisk, maxBuffer);
}

/**
 * 計算議價區間
 */
function calculateNegotiationRange(
  bottomLine: number,
  marketRate: number,
  strategy: string,
  clientType: string
): NegotiationAnalysis["negotiationRange"] {
  switch (strategy) {
    case "aggressive":
      // 高客戶類型（政府），取高價
      return {
        floor: bottomLine * 1.05, // 底線 +5%
        ceiling: marketRate * 1.1, // 市場行情 +10%
        recommended: marketRate,
      };

    case "conservative":
      // 低風險客戶，保守報價
      return {
        floor: bottomLine,
        ceiling: marketRate,
        recommended: bottomLine * 1.15,
      };

    case "balanced":
    default:
      return {
        floor: bottomLine * 1.02, // 底線 +2%
        ceiling: marketRate * 1.05,
        recommended: (bottomLine * 1.15 + marketRate) / 2, // 平均
      };
  }
}

/**
 * 生成議價理由
 */
function generateReasonings(
  baseCost: number,
  marketRate: number,
  riskFactors: string[],
  clientType: string
): string[] {
  const reasons: string[] = [];

  // 基於成本
  reasons.push(`基礎成本：${baseCost.toLocaleString("zh-TW")} 元`);

  // 基於市場
  const profitMargin = ((marketRate - baseCost) / baseCost) * 100;
  reasons.push(
    `市場行情建議利潤率：${Math.round(profitMargin)}%`
  );

  // 基於風險
  if (riskFactors.length > 0) {
    reasons.push(`風險因素（${riskFactors.length}）需預留 ${calculateRiskBuffer(riskFactors) * 100}% 的緩衝`);
    reasons.push(`• ${riskFactors.join("\n• ")}`);
  }

  // 基於客戶類型
  if (clientType === "government") {
    reasons.push("政府客戶通常資金穩定，可考慮較高報價");
  } else if (clientType === "private") {
    reasons.push("民間客戶競爭激烈，建議平衡報價");
  }

  return reasons;
}
```

### 2.3 UI 補強（NegotiationPanel.tsx 擴展）

```typescript
// src/components/pricing/NegotiationPanel.tsx

export function NegotiationPanel({ bid }: { bid: BidData }) {
  const [baseCost, setBaseCost] = useState(0);
  const [marketRate, setMarketRate] = useState(0);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<"balanced" | "aggressive" | "conservative">("balanced");
  const [analysis, setAnalysis] = useState<NegotiationAnalysis | null>(null);

  const handleAnalyze = () => {
    const result = generateNegotiationStrategy(
      baseCost,
      marketRate,
      riskFactors,
      bid.clientType || "private",
      strategy
    );
    setAnalysis(result);
  };

  return (
    <Card className="p-6 space-y-4">
      <CardTitle>議價分析</CardTitle>

      {/* 輸入 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>基礎成本</Label>
          <Input
            type="number"
            value={baseCost}
            onChange={(e) => setBaseCost(parseFloat(e.target.value))}
            placeholder="0"
          />
        </div>
        <div>
          <Label>市場行情</Label>
          <Input
            type="number"
            value={marketRate}
            onChange={(e) => setMarketRate(parseFloat(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>

      {/* 風險因素 */}
      <div>
        <Label>風險因素</Label>
        <div className="space-y-2">
          {["技術複雜度高", "時程緊急", "客戶不確定", "資源短缺"].map((factor) => (
            <label key={factor} className="flex items-center gap-2">
              <Checkbox
                checked={riskFactors.includes(factor)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setRiskFactors([...riskFactors, factor]);
                  } else {
                    setRiskFactors(riskFactors.filter((f) => f !== factor));
                  }
                }}
              />
              <span>{factor}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 策略選擇 */}
      <div>
        <Label>議價策略</Label>
        <Select value={strategy} onValueChange={(v) => setStrategy(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aggressive">激進（高價搏殺）</SelectItem>
            <SelectItem value="balanced">平衡（市場行情）</SelectItem>
            <SelectItem value="conservative">保守（穩定降低風險）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 分析按鈕 */}
      <Button onClick={handleAnalyze} className="w-full">
        分析議價策略
      </Button>

      {/* 結果視覺化 */}
      {analysis && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg space-y-4">
          <div>
            <p className="text-sm text-gray-600">建議出價範圍</p>
            <div className="flex justify-between items-center my-2">
              <div>
                <p className="text-xs text-gray-600">底線</p>
                <p className="text-lg font-bold text-red-600">
                  {analysis.negotiationRange.floor.toLocaleString("zh-TW")}
                </p>
              </div>
              <div className="flex-1 mx-4 relative h-1 bg-gray-300">
                <div
                  className="absolute h-full bg-gradient-to-r from-red-500 to-green-500"
                  style={{
                    left: `${((analysis.negotiationRange.floor - analysis.baseCost) / (analysis.negotiationRange.ceiling - analysis.baseCost)) * 100}%`,
                    right: `${100 - ((analysis.negotiationRange.ceiling - analysis.baseCost) / (analysis.negotiationRange.ceiling - analysis.baseCost)) * 100}%`,
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-gray-600">建議</p>
                <p className="text-lg font-bold text-green-600">
                  {analysis.negotiationRange.recommended.toLocaleString("zh-TW")}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              上限：{analysis.negotiationRange.ceiling.toLocaleString("zh-TW")}
            </p>
          </div>

          {/* 理由 */}
          <div>
            <p className="text-sm font-semibold mb-2">分析理由</p>
            <ul className="text-sm space-y-1 text-gray-700">
              {analysis.reasoning.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
```

### 2.4 測試清單（目標：30+ tests）

**negotiation-analysis.test.ts**：
- [ ] `generateNegotiationStrategy` 基礎計算
- [ ] 三種策略差異正確
- [ ] 風險預留計算
- [ ] 理由生成邏輯

---

## 三、分派指示

### 📋 檢查清單（00A）

- [ ] 讀完本工作包
- [ ] 確認 Notion 中團隊成員資料可用（或需要初始化）
- [ ] 規範文檔框架已準備
- [ ] npm install && npm run build

### 📋 檢查清單（議價）

- [ ] 讀完本工作包
- [ ] 理解成本底線邏輯
- [ ] 可參考現有 pricing 模組的結構

### ⏱️ 時間線

| 日期 | 00A 進度 | 議價 進度 |
|------|----------|----------|
| 0223 16:00 | 規範文檔開始寫 | — |
| 0224 09:00 | 規範文檔完成 | — |
| 0224 17:00 | API + Hook 完成 | 邏輯實裝開始 |
| 0225 09:00 | UI 元件完成 | UI 補強 + 測試 |
| 0225 17:00 | 測試 50+/60 | 測試 20+/30 |
| **0226** | **merge ready** | **merge ready** |

### 🚨 注意事項

1. **00A 規範優先**：需要先寫清楚規範文檔，其他人才能理解技能矩陣定義
2. **技能矩陣可硬編碼**：初版可將技能清單硬編碼在 `constants.ts`，後續可遷移至 Supabase
3. **推薦算法簡化**：初版用簡單加權平均，後續可升級至 ML 模型
4. **議價與 M03 協調**：議價邏輯應與 M03 戰略評分相輔相成

---

**開始日期**：2026-02-23 16:00
**預計完成**：2026-02-26 18:00
**目標分支**：`feature/00a-resources-and-negotiation`
