/** M01 案件建立模組 — 範本預填 */

import { addQuickDataBlock } from './notion-setup';
import type { CaseSetupInput } from './types';

/**
 * 預填 Notion 頁面快速資料
 *
 * 在已建立的 Notion 案件頁面中附加可複製的資料區塊，
 * 方便使用者在編輯服務建議書時快速取用案件基本資料。
 *
 * 此函式為 orchestrator 專用的薄包裝，
 * 實際邏輯委託給 notion-setup 的 addQuickDataBlock。
 *
 * @param notionPageId - Notion page ID
 * @param data - 案件建立輸入資料
 */
export async function prefillNotionPage(
  notionPageId: string,
  data: CaseSetupInput,
): Promise<void> {
  await addQuickDataBlock(notionPageId, data);
}
