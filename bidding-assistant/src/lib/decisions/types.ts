export type DecisionType = 'bid' | 'no_bid' | 'conditional';

export interface DecisionRecord {
  id: string;
  case_id: string;
  notion_page_id: string | null;
  decision: DecisionType;
  reason: string | null;
  decided_by: string;
  decided_at: string;
  notion_created: boolean;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
}

export interface CreateDecisionInput {
  case_id: string;
  notion_page_id?: string;
  decision: DecisionType;
  reason?: string;
}

export const DECISION_LABELS: Record<DecisionType, string> = {
  bid: '投標',
  no_bid: '不投標',
  conditional: '有條件投標',
};

export const DECISION_COLORS: Record<DecisionType, string> = {
  bid: 'green',
  no_bid: 'red',
  conditional: 'yellow',
};
