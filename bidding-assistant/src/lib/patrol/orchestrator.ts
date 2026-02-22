/**
 * P0 巡標 Layer C：一鍵上新編排
 *
 * 協調 Layer A/B 的所有操作
 * 當使用者按「要」時，編排整個建檔流程
 */

import type {
  PatrolItem,
  AcceptResult,
  NotionCaseCreateInput,
  NotionCaseUpdateInput,
  DriveCreateFolderInput,
  DriveCreateFolderResult,
} from './types';
import { convertToNotionInput, validateNotionInput } from './converter';
import {
  apiCreateNotionCase,
  apiUpdateNotionCase,
  apiCreateDriveFolder,
  apiFetchTenderDetail,
} from './api-client';
import { readCachedIntelligence } from '@/lib/strategy/intelligence-bridge';
import { formatBudget } from '@/lib/strategy/helpers';

// ============================================================
// 認證參數（UI 從 settings 傳入）
// ============================================================

/** orchestrateAccept 所需的外部認證和設定 */
export interface AcceptConfig {
  /** Notion Integration Token */
  notionToken: string;
  /** Notion Database ID（沙盒或正式） */
  notionDatabaseId: string;
  /** 公司品牌名稱（用於情報快取查詢，可選） */
  companyBrand?: string;
}

// ============================================================
// 摘要/情蒐（串接現有模組）
// ============================================================

/**
 * 摘要產出：格式化 PCC 公告基本資訊
 * 截標日、預算由 detail API 已取得，直接格式化
 */
function buildSummary(item: PatrolItem): string {
  const deadline = item.deadline
    ? new Date(item.deadline).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '未公告';
  const budget = item.budget ? formatBudget(item.budget) : '未公告';
  return `【PCC 公告摘要】\n標案：${item.title}\n機關：${item.agency}\n截標日：${deadline}\n預算：${budget}`;
}

/**
 * 情蒐產出：從 localStorage 快取讀取已有情報
 * 快取命中 → 格式化輸出；快取未命中 → 提示查詢
 */
function buildIntelligenceReport(item: PatrolItem, companyBrand: string): string {
  const intel = readCachedIntelligence(companyBrand, item.title);

  const lines: string[] = ['【情報快取】'];

  if (intel.marketTrend) {
    const t = intel.marketTrend;
    lines.push(`市場趨勢：${t.keyword} 類案件共 ${t.totalRecords} 筆，競爭${t.competitionLevel}，趨勢${t.trendDirection}`);
  }

  if (intel.selfAnalysis) {
    const s = intel.selfAnalysis;
    lines.push(`競爭分析：${s.wins} 筆得標，歷史得標率 ${Math.round(s.winRate * 100)}%`);
  }

  if (lines.length === 1) {
    // 無快取資料
    lines.push(`尚無 ${item.agency} 情報，可至情報搜尋頁查詢。`);
  }

  return lines.join('\n');
}

// ============================================================
// 核心流程
// ============================================================

/**
 * 編排：一鍵上新的完整流程
 *
 * 步驟：
 * 1. 嘗試取得完整公告詳情（Layer A）
 * 2. Layer C 進行欄位轉換
 * 3. Layer B 建 Notion 檔案
 * 4. Layer B 建 Drive 資料夾（並行 Step 5）
 * 5. 產出摘要和情蒐（並行 Step 4）
 * 6. 回寫摘要和情蒐到 Notion
 *
 * @param item - 使用者選擇的公告
 * @param config - 外部認證和設定
 * @returns 所有操作結果
 */
export async function orchestrateAccept(
  item: PatrolItem,
  config: AcceptConfig,
): Promise<AcceptResult> {
  try {
    // Step 1: 嘗試取得完整公告詳情
    const detail = await apiFetchTenderDetail(item.unitId, item.jobNumber);

    // Step 2: 欄位轉換
    let notionInput: NotionCaseCreateInput;

    if (detail) {
      // 有完整詳情 → 用 converter 做完整轉換
      notionInput = convertToNotionInput(detail);
    } else {
      // 沒有完整詳情 → 從 PatrolItem 已有資料建檔
      notionInput = {
        title: item.title,
        jobNumber: item.jobNumber,
        agency: item.agency,
        budget: item.budget,
        publishDate: item.publishDate,
        deadline: item.deadline,
      };
    }

    // Step 2.5: 驗證轉換結果
    const validation = validateNotionInput(notionInput);
    if (!validation.valid) {
      return {
        notion: { success: false, error: `缺少必填欄位：${validation.missingFields.join('、')}` },
        drive: { success: false, error: '輸入驗證失敗，中止流程' },
        summary: '',
        intelligence: '',
      };
    }

    // Step 3: Notion 建檔
    const notionResult = await apiCreateNotionCase(
      notionInput,
      config.notionToken,
      config.notionDatabaseId,
    );

    if (!notionResult.success || !notionResult.caseUniqueId || !notionResult.notionPageId) {
      return {
        notion: notionResult,
        drive: { success: false, error: 'Notion 建檔失敗，中止 Drive 流程' },
        summary: '',
        intelligence: '',
      };
    }

    // Step 4 & 5: 並行執行 Drive + 摘要 + 情蒐
    const driveInput: DriveCreateFolderInput = {
      caseUniqueId: notionResult.caseUniqueId,
      publishDate: item.publishDate,
      title: item.title,
    };

    const [driveResult, summary, intelligence] = await Promise.all([
      apiCreateDriveFolder(driveInput),
      Promise.resolve(buildSummary(item)),
      Promise.resolve(buildIntelligenceReport(item, config.companyBrand ?? '')),
    ]);

    // Step 6: 回寫摘要/情蒐到 Notion
    if (summary || intelligence) {
      const updateInput: NotionCaseUpdateInput = {
        notionPageId: notionResult.notionPageId!,
        summary: summary || undefined,
        intelligenceReport: intelligence || undefined,
        progressFlags: [
          ...(summary ? ['摘要完成'] : []),
          ...(intelligence ? ['情蒐完成'] : []),
          ...(driveResult.success ? ['Drive 資料夾已建'] : []),
        ],
      };

      await apiUpdateNotionCase(updateInput, config.notionToken);
    }

    return {
      notion: notionResult,
      drive: driveResult,
      summary,
      intelligence,
    };
  } catch (error) {
    return {
      notion: { success: false, error: String(error) },
      drive: { success: false, error: String(error) },
      summary: '',
      intelligence: '',
    };
  }
}

/**
 * 驗證流程結果
 * 檢查哪些步驟成功了
 */
export function validateOrchestrationResult(result: AcceptResult): {
  allSuccess: boolean;
  failedSteps: string[];
} {
  const failedSteps: string[] = [];

  if (!result.notion.success) failedSteps.push('Notion 建檔');
  if (!result.drive.success) failedSteps.push('Drive 資料夾');
  if (!result.summary) failedSteps.push('摘要產出');
  if (!result.intelligence) failedSteps.push('情蒐產出');

  return {
    allSuccess: failedSteps.length === 0,
    failedSteps,
  };
}

/**
 * 產出流程進度（給 UI 顯示）
 */
export interface AcceptProgress {
  step: 'preparing' | 'notion' | 'drive' | 'analysis' | 'complete';
  percent: number;
  message: string;
}

/**
 * 根據結果推導進度狀態
 */
export function getProgressFromResult(result: AcceptResult): AcceptProgress {
  const validation = validateOrchestrationResult(result);

  if (validation.allSuccess) {
    return {
      step: 'complete',
      percent: 100,
      message: '已完成',
    };
  }

  if (result.intelligence) {
    return {
      step: 'analysis',
      percent: 75,
      message: '情蒐中',
    };
  }

  if (result.summary) {
    return {
      step: 'analysis',
      percent: 50,
      message: '分析中',
    };
  }

  if (result.drive.success) {
    return {
      step: 'drive',
      percent: 40,
      message: '建立資料夾中',
    };
  }

  if (result.notion.success) {
    return {
      step: 'notion',
      percent: 25,
      message: '建立 Notion 檔案中',
    };
  }

  return {
    step: 'preparing',
    percent: 5,
    message: '準備中',
  };
}
