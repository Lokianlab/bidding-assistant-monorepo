/**
 * M11 結案飛輪 - 純函式輔助模組
 *
 * 包含：評分計算、標籤提取、成功模式統計、KB 格式轉換
 */

import type {
  CaseSummary,
  CaseAssessment,
  AggregateScore,
  CaseLearning,
  KBItemFromClosing,
  SuccessPattern,
} from "./types";

/**
 * 計算總評分
 * @param assessment 結案評分
 * @returns 聚合分數
 */
export function calculateAggregateScore(assessment: CaseAssessment): AggregateScore {
  const { strategyScore, executionScore, satisfactionScore } = assessment;

  const total = (strategyScore + executionScore + satisfactionScore) / 3;

  return {
    strategy: strategyScore,
    execution: executionScore,
    satisfaction: satisfactionScore,
    total: Math.round(total * 10) / 10,  // 四捨五入到一位小數
  };
}

/**
 * 驗證評分有效範圍（1-10）
 * @param scores 評分物件
 * @returns 是否有效
 */
export function validateScores(scores: {
  strategyScore?: number;
  executionScore?: number;
  satisfactionScore?: number;
}): boolean {
  const { strategyScore, executionScore, satisfactionScore } = scores;

  const isValid = (score: number | undefined): boolean =>
    score === undefined || (Number.isInteger(score) && score >= 1 && score <= 10);

  return isValid(strategyScore) && isValid(executionScore) && isValid(satisfactionScore);
}

/**
 * 從摘要文本中提取潛在標籤（簡易版）
 * 使用關鍵字識別
 * @param text 摘要文本
 * @returns 建議的標籤陣列
 */
export function extractTagsFromText(text: string): string[] {
  const keywords: Record<string, string[]> = {
    "時程管理": ["提前", "延誤", "時程", "加班", "趕工", "里程碑"],
    "客戶溝通": ["溝通", "對接", "反饋", "需求變更", "協商", "滿意度"],
    "技術風險": ["技術", "風險", "難題", "bug", "效能", "相容性"],
    "成本控制": ["成本", "預算", "超支", "節省", "控制"],
    "團隊協作": ["團隊", "協作", "分工", "知識共享", "會議", "文檔"],
    "品質管理": ["品質", "檢驗", "驗收", "測試", "標準"],
  };

  const foundTags = new Set<string>();

  // 逐個關鍵字檢查
  for (const [tag, keywords_list] of Object.entries(keywords)) {
    if (keywords_list.some((kw) => text.includes(kw))) {
      foundTags.add(tag);
    }
  }

  return Array.from(foundTags);
}

/**
 * 轉換為 KB 項目格式
 * @param learning 結案學習記錄
 * @returns KB 項目
 */
export function convertToKBItem(learning: CaseLearning): KBItemFromClosing {
  // 組合三段落摘要
  const content = `
**完成項目：**
${learning.whatWeDid}

**學習重點：**
${learning.whatWeLearned}

**下次注意：**
${learning.nextTimeNotes}

**關鍵標籤：** ${learning.tags.join(", ")}
  `.trim();

  return {
    title: learning.title,
    content,
    caseId: learning.caseId,
    category: "case_closing",
    tags: learning.tags,
    metadata: {
      strategyScore: learning.strategyScore,
      executionScore: learning.executionScore,
      satisfactionScore: learning.satisfactionScore,
    },
  };
}

/**
 * 統計成功模式（簡易版）
 * 找出出現頻率 >= minFrequency 的標籤，計算平均分數
 * @param learnings 所有結案記錄
 * @param minFrequency 最小頻率閾值（預設 3）
 * @returns 成功模式陣列
 */
export function identifySuccessPatterns(
  learnings: CaseLearning[],
  minFrequency: number = 3
): SuccessPattern[] {
  // 統計標籤出現頻率與對應的評分
  const tagStats: Record<
    string,
    {
      count: number;
      strategyScores: number[];
      executionScores: number[];
      satisfactionScores: number[];
    }
  > = {};

  for (const learning of learnings) {
    for (const tag of learning.tags) {
      if (!tagStats[tag]) {
        tagStats[tag] = {
          count: 0,
          strategyScores: [],
          executionScores: [],
          satisfactionScores: [],
        };
      }
      tagStats[tag].count++;
      tagStats[tag].strategyScores.push(learning.strategyScore);
      tagStats[tag].executionScores.push(learning.executionScore);
      tagStats[tag].satisfactionScores.push(learning.satisfactionScore);
    }
  }

  // 過濾高頻標籤並計算平均分數
  const patterns: SuccessPattern[] = Object.entries(tagStats)
    .filter(([_, stats]) => stats.count >= minFrequency)
    .map(([tag, stats]) => ({
      pattern: tag,
      frequency: stats.count,
      avgScores: {
        strategy: Math.round((stats.strategyScores.reduce((a, b) => a + b, 0) / stats.count) * 10) / 10,
        execution: Math.round((stats.executionScores.reduce((a, b) => a + b, 0) / stats.count) * 10) / 10,
        satisfaction: Math.round(
          (stats.satisfactionScores.reduce((a, b) => a + b, 0) / stats.count) * 10
        ) / 10,
      },
    }))
    .sort((a, b) => b.frequency - a.frequency);  // 按頻率降序

  return patterns;
}

/**
 * 檢查結案摘要的完整性
 * @param summary 結案摘要
 * @returns 是否完整
 */
export function validateCaseSummary(summary: CaseSummary): boolean {
  const { sections } = summary;
  return (
    sections.whatWeDid.trim().length > 0 &&
    sections.whatWeLearned.trim().length > 0 &&
    sections.nextTimeNotes.trim().length > 0
  );
}

/**
 * 合併結案摘要與評分為完整的學習記錄（準備寫入 DB）
 * @param summary 結案摘要
 * @param assessment 結案評分
 * @param tags 選定的標籤
 * @returns 結案學習記錄
 */
export function createCaseLearning(
  summary: CaseSummary,
  assessment: CaseAssessment,
  tags: string[]
): Omit<CaseLearning, "id" | "tenantId" | "createdAt" | "updatedAt"> {
  return {
    caseId: summary.caseId,
    title: `${summary.caseName} - 結案經驗`,
    whatWeDid: summary.sections.whatWeDid,
    whatWeLearned: summary.sections.whatWeLearned,
    nextTimeNotes: summary.sections.nextTimeNotes,
    tags,
    strategyScore: assessment.strategyScore,
    executionScore: assessment.executionScore,
    satisfactionScore: assessment.satisfactionScore,
  };
}

/**
 * 格式化結案報告（用於 PDF 導出）
 * @param learning 結案學習記錄
 * @returns 格式化的報告文本
 */
export function formatClosingReport(learning: CaseLearning): string {
  const lines = [
    `案件：${learning.title}`,
    `完成日期：${new Date(learning.createdAt).toLocaleDateString("zh-TW")}`,
    "",
    "## 完成項目",
    learning.whatWeDid,
    "",
    "## 學習重點",
    learning.whatWeLearned,
    "",
    "## 下次注意",
    learning.nextTimeNotes,
    "",
    "## 評分",
    `策略評分：${learning.strategyScore} / 10`,
    `執行評分：${learning.executionScore} / 10`,
    `滿意度：${learning.satisfactionScore} / 10`,
    `平均評分：${(learning.strategyScore + learning.executionScore + learning.satisfactionScore) / 3} / 10`,
    "",
    `標籤：${learning.tags.join(", ")}`,
  ];

  return lines.join("\n");
}
