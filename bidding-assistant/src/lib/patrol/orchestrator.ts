/**
 * P0 巡標 Layer C：一鍵上新編排
 *
 * 協調 Layer A/B 的所有操作
 * 當使用者按「要」時，編排整個建檔流程
 */

import {
  PatrolItem,
  PccTenderDetail,
  AcceptResult,
  NotionCaseCreateResult,
  DriveCreateFolderResult,
  NotionCaseCreateInput,
} from './types';

/**
 * 模擬 Layer A 的取得單筆完整公告
 * 實際應用中會呼叫真正的 API
 */
export async function fetchTenderDetail(
  _unitId: string,
  _jobNumber: string
): Promise<PccTenderDetail> {
  // TODO: Layer A 會實作這個
  throw new Error('fetchTenderDetail 未實作（待 Layer A）');
}

/**
 * 模擬 Layer B 的 Notion 建檔
 */
export async function createNotionCase(
  _input: NotionCaseCreateInput
): Promise<NotionCaseCreateResult> {
  // TODO: Layer B 會實作這個
  throw new Error('createNotionCase 未實作（待 Layer B）');
}

/**
 * 模擬 Layer B 的 Drive 建資料夾
 */
export async function createDriveFolder(
  _caseUniqueId: string,
  _publishDate: string,
  _title: string
): Promise<DriveCreateFolderResult> {
  // TODO: Layer B 會實作這個
  throw new Error('createDriveFolder 未實作（待 Layer B）');
}

/**
 * 模擬現有摘要產出模組
 */
export async function generateSummary(_title: string): Promise<string> {
  // TODO: 串接現有分析模組
  return '[摘要待實作]';
}

/**
 * 模擬現有情蒐產出模組
 */
export async function generateIntelligenceReport(_agency: string): Promise<string> {
  // TODO: 串接現有機關情報、競爭分析等模組
  return '[情蒐待實作]';
}

/**
 * 編排：一鍵上新的完整流程
 *
 * 步驟：
 * 1. 從 Layer A 取得完整公告
 * 2. Layer C 進行轉換
 * 3. Layer B 建 Notion 檔案
 * 4. Layer B 建 Drive 資料夾
 * 5. 串接分析模組產出摘要和情蒐
 * 6. 回寫 Notion
 *
 * @param item - 使用者選擇的公告
 * @returns 所有操作結果
 */
export async function orchestrateAccept(item: PatrolItem): Promise<AcceptResult> {
  try {
    // Step 1：取得完整公告詳情
    const detail = await fetchTenderDetail(item.unitId, item.jobNumber);

    // Step 2：Layer C 轉換欄位（這個模組會提供）
    // 實際應用中會呼叫 convertToNotionInput
    const notionInput: NotionCaseCreateInput = {
      title: item.title,
      jobNumber: item.jobNumber,
      agency: item.agency,
      budget: item.budget,
      publishDate: item.publishDate,
      deadline: item.deadline,
      // ... 其他轉換邏輯
    };

    // Step 3：建 Notion 檔案
    const notionResult = await createNotionCase(notionInput);

    if (!notionResult.success || !notionResult.caseUniqueId) {
      return {
        notion: notionResult,
        drive: { success: false, error: 'Notion 建檔失敗，中止流程' },
        summary: '',
        intelligence: '',
      };
    }

    // Step 4：建 Drive 資料夾（並行執行 Step 5）
    const [driveResult, summary, intelligence] = await Promise.all([
      createDriveFolder(notionResult.caseUniqueId, item.publishDate, item.title),
      generateSummary(item.title),
      generateIntelligenceReport(item.agency),
    ]);

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
