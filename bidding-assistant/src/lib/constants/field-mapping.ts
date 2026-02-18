// ====== Notion 欄位對照表 ======
// 系統內部 key → Notion 資料庫的欄位名稱
// 可透過設定頁面修改，不用動程式碼

/** 所有系統內部使用的欄位 key */
export const FIELD_KEYS = [
  "名稱", "進程", "決策", "截標", "預算", "進度",
  "企劃主筆", "投遞序位", "評審方式", "招標機關",
  "案號", "標案類型", "決標公告", "評選日期", "歸檔號",
  "押標金", "領標費", "檔案型態", "電子投標", "確定協作",
  "唯一碼", "備標期限",
] as const;

export type FieldMappingKey = (typeof FIELD_KEYS)[number];

/** 預設的欄位對照表（與 Notion 備標評估文件庫的欄位名稱對應） */
export const DEFAULT_FIELD_MAP: Record<FieldMappingKey, string> = {
  名稱: "標案名稱",
  進程: "標案進程",
  決策: "備標決策",
  截標: "截標時間",
  預算: "預算金額",
  進度: "備標進度",
  企劃主筆: "企劃人員",
  投遞序位: "投遞序位",
  評審方式: "評審方式",
  招標機關: "招標機關",
  案號: "案號",
  標案類型: "標案類型",
  決標公告: "決標公告",
  評選日期: "評選日期",
  歸檔號: "歸檔號",
  押標金: "押標金",
  領標費: "領標費",
  檔案型態: "檔案型態",
  電子投標: "電子投標",
  確定協作: "確定協作",
  唯一碼: "案件唯一碼",
  備標期限: "備標期限",
};

/** 每個 key 的中文說明（給設定頁面顯示用） */
export const FIELD_LABELS: Record<FieldMappingKey, string> = {
  名稱: "標案名稱",
  進程: "標案進程（狀態）",
  決策: "備標決策",
  截標: "截標時間",
  預算: "預算金額",
  進度: "備標進度",
  企劃主筆: "企劃人員",
  投遞序位: "投遞序位",
  評審方式: "評審方式",
  招標機關: "招標機關",
  案號: "案號",
  標案類型: "標案類型",
  決標公告: "決標公告",
  評選日期: "評選日期",
  歸檔號: "歸檔號",
  押標金: "押標金",
  領標費: "領標費",
  檔案型態: "檔案型態",
  電子投標: "電子投標",
  確定協作: "確定協作",
  唯一碼: "案件唯一碼",
  備標期限: "備標期限",
};

/**
 * 合併預設值 + 使用者自訂設定，產生完整的欄位對照表
 * @param userOverrides 使用者在設定頁面自訂的對照（只有改過的才會有值）
 */
export function resolveFieldMap(
  userOverrides?: Partial<Record<FieldMappingKey, string>>,
): Record<FieldMappingKey, string> {
  if (!userOverrides || Object.keys(userOverrides).length === 0) {
    return DEFAULT_FIELD_MAP;
  }
  return { ...DEFAULT_FIELD_MAP, ...userOverrides };
}
