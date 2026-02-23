import type {
  CostBase,
  NegotiationConfig,
  NegotiationAnalysis,
  QuoteScenario,
  QuoteStatus,
} from "./types";

/**
 * 計算底線報價（成本 + 最小利潤）
 * @param costBase 成本基礎
 * @param config 議價設定
 * @returns 底線報價金額
 */
export function calculateBaseline(costBase: CostBase, config: NegotiationConfig): number {
  if (!costBase || !config) return 0;
  const profitAmount = Math.round(costBase.subtotal * config.minMargin);
  return costBase.subtotal + profitAmount;
}

/**
 * 計算報價方案細節
 * @param quoteAmount 報價金額
 * @param costBase 成本基礎
 * @param name 方案名稱
 * @returns QuoteScenario
 */
function createScenario(
  quoteAmount: number,
  costBase: CostBase,
  name: string,
  config: NegotiationConfig
): QuoteScenario {
  const profitAmount = quoteAmount - costBase.subtotal;
  const profitRate = costBase.subtotal > 0 ? profitAmount / costBase.subtotal : 0;
  const status = getQuoteStatus(profitRate, config);

  return {
    name,
    quoteAmount: Math.max(0, quoteAmount),
    profitAmount: Math.max(0, profitAmount),
    profitRate,
    status,
  };
}

/**
 * 計算完整議價分析
 * @param costBase 成本基礎
 * @param config 議價設定
 * @returns 議價分析結果
 */
export function analyzeNegotiation(
  costBase: CostBase,
  config: NegotiationConfig
): NegotiationAnalysis {
  if (!costBase || !config) {
    return {
      costBased: { name: "底線", quoteAmount: 0, profitAmount: 0, profitRate: 0, status: "danger" },
      proposed: { name: "預案", quoteAmount: 0, profitAmount: 0, profitRate: 0, status: "warning" },
      target: { name: "目標", quoteAmount: 0, profitAmount: 0, profitRate: 0, status: "safe" },
      ceiling: { name: "天花板", quoteAmount: 0, profitAmount: 0, profitRate: 0, status: "dream" },
      scenarios: [],
      allowanceAmount: 0,
    };
  }

  const baseline = calculateBaseline(costBase, config);
  const costBased = createScenario(baseline, costBase, "底線", config);

  const proposedAmount = Math.round(costBase.subtotal * (1 + config.expectedMargin));
  const proposed = createScenario(proposedAmount, costBase, "預案", config);

  const targetAmount = Math.round(costBase.subtotal * (1 + config.idealMargin));
  const target = createScenario(targetAmount, costBase, "目標", config);

  const ceilingAmount = Math.round(costBase.subtotal * (1 + config.maxMargin));
  const ceiling = createScenario(ceilingAmount, costBase, "天花板", config);

  const allowanceAmount = Math.max(0, proposedAmount - baseline);

  return {
    costBased,
    proposed,
    target,
    ceiling,
    scenarios: [],
    allowanceAmount,
  };
}

/**
 * 模擬單一讓步方案
 * @param costBase 成本基礎
 * @param config 議價設定
 * @param proposedAmount 新報價
 * @returns QuoteScenario
 */
export function simulateCompromise(
  costBase: CostBase,
  config: NegotiationConfig,
  proposedAmount: number
): QuoteScenario {
  return createScenario(proposedAmount, costBase, `讓步至 ${formatAmount(proposedAmount)}`, config);
}

/**
 * 批量模擬多個讓步方案
 * @param costBase 成本基礎
 * @param config 議價設定
 * @param concessions 讓步額度陣列（相對於預案的讓步額）
 * @returns QuoteScenario 陣列
 */
export function simulateMultiple(
  costBase: CostBase,
  config: NegotiationConfig,
  concessions: number[]
): QuoteScenario[] {
  if (!costBase || !config || !concessions || concessions.length === 0) {
    return [];
  }

  const proposedAmount = Math.round(costBase.subtotal * (1 + config.expectedMargin));

  return concessions.map((concession) => {
    const newAmount = proposedAmount - concession;
    const scenarioName =
      concession > 0
        ? `讓步 ${formatAmount(concession)}`
        : concession === 0
          ? "保持預案"
          : `加價 ${formatAmount(-concession)}`;

    return createScenario(newAmount, costBase, scenarioName, config);
  });
}

/**
 * 判斷報價安全性
 * @param profitRate 利潤率（0.15 = 15%）
 * @param config 議價設定
 * @returns 安全性狀態
 */
export function getQuoteStatus(profitRate: number, config: NegotiationConfig): QuoteStatus {
  if (profitRate <= config.minMargin) return "danger";
  if (profitRate < config.expectedMargin) return "warning";
  if (profitRate <= config.idealMargin) return "safe";
  return "dream";
}

/**
 * 格式化金額（加千分位）
 * @param n 金額
 * @returns 格式化後的字串
 */
export function formatAmount(n: number): string {
  return Math.round(n).toLocaleString("zh-TW");
}

/**
 * 計算讓步百分比
 * @param originalAmount 原報價
 * @param newAmount 新報價
 * @returns 讓步百分比（0.05 = 5%）
 */
export function calculateConcessionRate(originalAmount: number, newAmount: number): number {
  if (originalAmount <= 0) return 0;
  return (originalAmount - newAmount) / originalAmount;
}

/**
 * 從 PricingSummary 轉換為 CostBase
 * @param summary PricingSummary（來自計價模組）
 * @returns CostBase
 */
export function costBaseFromPricingSummary(summary: {
  directCost: number;
  managementFee: number;
  tax: number;
  subtotal: number;
}): CostBase {
  return {
    directCost: summary.directCost,
    managementFee: summary.managementFee,
    tax: summary.tax,
    subtotal: summary.subtotal,
  };
}

/**
 * 建立預設成本基礎（用於案件初始估算）
 * 假設：直接成本 = 預算 × 60%, 管理費率 = 10%, 營業稅率 = 5%
 * @param budget 案件預算
 * @returns CostBase
 */
export function createDefaultCostBase(budget?: number): CostBase {
  if (!budget || budget <= 0) {
    return {
      directCost: 0,
      managementFee: 0,
      tax: 0,
      subtotal: 0,
    };
  }

  const directCost = Math.round(budget * 0.6);
  const managementFee = Math.round(directCost * 0.1);
  const subtotal = directCost + managementFee;
  const tax = Math.round(subtotal * 0.05);

  return {
    directCost,
    managementFee,
    tax,
    subtotal,
  };
}
