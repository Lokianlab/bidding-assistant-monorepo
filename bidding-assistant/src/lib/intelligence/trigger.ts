// ====== 情報觸發器 ======
// 案件匯入後，非阻塞地啟動情報蒐集流程。

import { fetchAgencyHistory, fetchCompetitorAnalysis } from "./pcc-intel";
import { initWinAssessment } from "./win-assessment";
import { generatePrompts } from "./perplexity-prompts";
import { saveIntelCache } from "@/lib/supabase/intel-client";
import { INTEL_CACHE_TTL } from "./constants";
import type { WinAssessmentData, PerplexityPrompt } from "./types";

/**
 * 案件匯入後觸發的情報蒐集流程。
 * 非阻塞執行（fire-and-forget），不會讓匯入流程等待。
 *
 * 執行順序：
 * 1. PCC 機關歷史查詢
 * 2. 競爭對手分析（依賴步驟 1）
 * 3. 並行執行：得標評估初始化 + Perplexity 提示產生
 * 4. 將結果寫入 Supabase 快取
 */
export async function onCaseImported(
  caseId: string,
  pccUnitId: string,
  pccUnitName: string,
  caseTitle?: string,
  budget?: number | null,
): Promise<void> {
  try {
    // Step 1: 取得機關歷史
    const agencyHistory = await fetchAgencyHistory(
      pccUnitId,
      pccUnitName,
      caseId,
    );

    // Step 2: 競爭對手分析（需要機關歷史結果）
    const competitors = await fetchCompetitorAnalysis(
      agencyHistory,
      caseId,
    );

    // Step 3: 並行執行——得標評估 + Perplexity 提示
    const [winAssessment, perplexityPrompts] = await Promise.all([
      Promise.resolve(initWinAssessment(agencyHistory, competitors)),
      Promise.resolve(
        caseTitle
          ? generatePrompts(
              caseTitle,
              pccUnitName,
              budget ?? null,
              agencyHistory,
              competitors,
            )
          : [],
      ),
    ]);

    // Step 4: 儲存結果到快取
    await Promise.allSettled([
      saveWinAssessment(caseId, pccUnitId, winAssessment),
      savePerplexityPrompts(caseId, pccUnitId, perplexityPrompts),
    ]);
  } catch (error) {
    // 情報蒐集失敗不應阻塞主流程
    // 錯誤會被記錄但不會拋出
    console.error(
      `[intelligence] 案件 ${caseId} 情報蒐集失敗:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ====== 內部儲存函式 ======

async function saveWinAssessment(
  caseId: string,
  unitId: string,
  assessment: WinAssessmentData,
): Promise<void> {
  await saveIntelCache({
    case_id: caseId,
    intel_type: "win_assessment",
    data: assessment as unknown as Record<string, unknown>,
    source: "pcc",
    pcc_unit_id: unitId,
    ttl_days: INTEL_CACHE_TTL.pcc,
  });
}

async function savePerplexityPrompts(
  caseId: string,
  unitId: string,
  prompts: PerplexityPrompt[],
): Promise<void> {
  if (prompts.length === 0) return;

  await saveIntelCache({
    case_id: caseId,
    intel_type: "perplexity",
    data: { prompts } as unknown as Record<string, unknown>,
    source: "pcc",
    pcc_unit_id: unitId,
    ttl_days: INTEL_CACHE_TTL.perplexity,
  });
}
