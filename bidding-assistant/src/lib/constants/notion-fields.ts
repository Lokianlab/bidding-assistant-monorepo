// ====== 各頁面需要的 Notion 欄位清單 ======
// 傳給 API route 的 fields 參數，用來產生 filter_properties
// 只回傳需要的欄位，大幅加速 Notion API 回應

import { DEFAULT_FIELD_MAP } from "./field-mapping";

const F = DEFAULT_FIELD_MAP;

/** 指揮部需要的欄位（16 個，備標期限為 formula 由前端自算） */
export const FIELDS_DASHBOARD = [
  F.名稱, F.進程, F.決策, F.截標, F.預算, F.招標機關,
  F.投遞序位, F.評審方式, F.案號, F.唯一碼, F.電子投標,
  F.確定協作, F.企劃主筆, F.押標金, F.領標費, F.標案類型,
];

/** 績效檢視中心需要的欄位（13 個） */
export const FIELDS_PERFORMANCE = [
  F.進程, F.截標, F.企劃主筆, F.名稱, F.預算, F.招標機關,
  F.押標金, F.領標費, F.投遞序位, F.決策, F.標案類型, F.評審方式, F.唯一碼,
];

/** 指揮部 KPI 歷史統計用的欄位（5 個，極輕量） */
export const FIELDS_DASHBOARD_KPI = [
  F.進程, F.截標, F.預算, F.押標金, F.領標費,
];
