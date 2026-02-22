// ====== 情報探索（Entity Explorer）型別定義 ======

/** 可鑽探的實體類型 */
export type EntityType = "search" | "tender" | "company" | "agency";

/** 導航堆疊的一筆記錄 */
export interface StackEntry {
  type: EntityType;
  /** 實體 ID：tender = `${unitId}/${jobNumber}`, company = 公司名, agency = unitId */
  id: string;
  /** 麵包屑顯示文字 */
  label: string;
}

/** 搜尋實體的 payload */
export interface SearchPayload {
  query: string;
  mode: "title" | "company";
}

/** 案件實體的 payload */
export interface TenderPayload {
  unitId: string;
  jobNumber: string;
  title: string;
  unitName: string;
}

/** 廠商實體的 payload */
export interface CompanyPayload {
  name: string;
}

/** 機關實體的 payload */
export interface AgencyPayload {
  unitId: string;
  unitName: string;
}

/** 導航事件：從任何 View 觸發，告訴 ExplorerPage 要鑽到哪 */
export type NavigateEvent =
  | { type: "tender"; payload: TenderPayload }
  | { type: "company"; payload: CompanyPayload }
  | { type: "agency"; payload: AgencyPayload }
  | { type: "search"; payload: SearchPayload };
