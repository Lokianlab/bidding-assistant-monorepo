/** M01 案件建立模組 — 常數 */

/** 建案步驟名稱（依執行順序） */
export const SETUP_STEPS: string[] = [
  'Notion 建案',
  'Drive 資料夾建立',
  '鷹架範本複製',
  '範本預填',
  '決策記錄更新',
];

/** 預設案件狀態 */
export const DEFAULT_CASE_STATUS = '備標中' as const;

/** 快速資料欄位定義（用於 Notion 頁面的可複製資料區塊） */
export const PREFILL_FIELDS: ReadonlyArray<{ key: keyof PrefillFieldKeys; label: string }> = [
  { key: 'title', label: '案件名稱' },
  { key: 'agency', label: '機關' },
  { key: 'budget', label: '預算' },
  { key: 'deadline', label: '截標日期' },
  { key: 'award_method', label: '決標方式' },
  { key: 'pcc_job_number', label: 'PCC 案號' },
  { key: 'pcc_unit_id', label: 'PCC 單位 ID' },
];

/** PREFILL_FIELDS 的 key 對應型別（輔助用） */
interface PrefillFieldKeys {
  title: string;
  agency: string;
  budget: number | null;
  deadline: string | null;
  award_method: string | null;
  pcc_job_number: string;
  pcc_unit_id: string;
}
