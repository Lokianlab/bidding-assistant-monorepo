/** M01 案件建立模組 — 主編排器 */

import { SETUP_STEPS } from './constants';
import { createCaseFolder, copyScaffoldToCase } from './drive-setup';
import { generateCaseUniqueId } from './helpers';
import { createNotionCase } from './notion-setup';
import { prefillNotionPage } from './prefill';
import type { CaseSetupInput, CaseSetupResult, SetupStep } from './types';

/**
 * 執行案件建立全流程
 *
 * 五個步驟依序執行，每步獨立 try-catch：
 * 1. Notion 建案
 * 2. Drive 資料夾建立
 * 3. 鷹架範本複製（依賴步驟 2）
 * 4. 範本預填（依賴步驟 1）
 * 5. 決策記錄更新
 *
 * 單步失敗不阻塞後續無相依步驟。
 *
 * @param input - 案件建立輸入
 * @param accessToken - Google OAuth2 access token
 * @returns 建案結果（含各步驟明細）
 */
export async function setupCase(
  input: CaseSetupInput,
  accessToken: string,
): Promise<CaseSetupResult> {
  const result: CaseSetupResult = {
    notion_page_id: null,
    drive_folder_id: null,
    drive_folder_url: null,
    steps: [],
  };

  // ── 步驟 1：Notion 建案 ──────────────────────────────────
  const step1 = await executeStep(SETUP_STEPS[0], async () => {
    const pageId = await createNotionCase(input);
    result.notion_page_id = pageId;
  });
  result.steps.push(step1);

  // ── 步驟 2：Drive 資料夾建立 ─────────────────────────────
  const parentFolderId = process.env.GOOGLE_CASES_FOLDER_ID;
  const step2 = await executeStep(SETUP_STEPS[1], async () => {
    if (!parentFolderId) {
      throw new Error('GOOGLE_CASES_FOLDER_ID 環境變數未設定');
    }

    const caseUniqueId = generateCaseUniqueId();
    const folder = await createCaseFolder(
      {
        caseUniqueId,
        deadline: input.deadline,
        title: input.title,
        parentFolderId,
      },
      accessToken,
    );

    result.drive_folder_id = folder.id;
    result.drive_folder_url = folder.url;
  });
  result.steps.push(step2);

  // ── 步驟 3：鷹架範本複製（依賴步驟 2） ────────────────────
  const step3 = await executeStep(SETUP_STEPS[2], async () => {
    if (!result.drive_folder_id) {
      throw new Error('Drive 資料夾未建立，跳過鷹架複製');
    }

    const scaffoldResult = await copyScaffoldToCase(result.drive_folder_id, accessToken);

    if (scaffoldResult.errors.length > 0) {
      // 部分失敗不拋錯，記錄在步驟訊息中
      throw new Error(
        `已複製 ${scaffoldResult.copied} 個檔案，${scaffoldResult.errors.length} 個失敗：${scaffoldResult.errors.join('; ')}`,
      );
    }
  });
  result.steps.push(step3);

  // ── 步驟 4：範本預填（依賴步驟 1） ────────────────────────
  const step4 = await executeStep(SETUP_STEPS[3], async () => {
    if (!result.notion_page_id) {
      throw new Error('Notion 頁面未建立，跳過範本預填');
    }

    await prefillNotionPage(result.notion_page_id, input);
  });
  result.steps.push(step4);

  // ── 步驟 5：決策記錄更新 ─────────────────────────────────
  const step5 = await executeStep(SETUP_STEPS[4], async () => {
    // TODO: 實作決策記錄更新（寫入 Notion decisions 表）
    // 目前為空操作，待 decisions 表 schema 確認後實作
  });
  result.steps.push(step5);

  return result;
}

/**
 * 執行單一步驟，包裝 try-catch 和計時
 *
 * @param stepName - 步驟名稱
 * @param fn - 步驟邏輯
 * @returns 步驟結果
 */
async function executeStep(
  stepName: string,
  fn: () => Promise<void>,
): Promise<SetupStep> {
  const start = Date.now();

  try {
    await fn();
    return {
      step: stepName,
      success: true,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      step: stepName,
      success: false,
      error: message,
      duration_ms: Date.now() - start,
    };
  }
}
