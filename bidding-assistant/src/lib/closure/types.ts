// M11 結案飛輪 - 型別定義

export interface ClosureScore {
  id: string;
  case_id: string;
  category: ClosureCategory;
  score: number; // 0-100
  notes: string;
  reviewer?: string;
  reviewed_at?: string;
  created_at: string;
}

export type ClosureCategory = 'delivery' | 'quality' | 'client_satisfaction' | 'team_performance' | 'profitability';

export interface SuccessPattern {
  id: string;
  case_id: string;
  pattern_name: string;
  description: string;
  tags: string[];
  replicability_score: number; // 0-100
  created_at: string;
}

export interface KBFeedback {
  id: string;
  case_id: string;
  lessons_learned: string;
  best_practices: string[];
  challenges_faced: string[];
  solutions_applied: string[];
  created_at: string;
}

export interface CaseClosureRequest {
  case_id: string;
  closure_date: string;
  final_status: 'completed' | 'cancelled' | 'suspended';
  scores: {
    category: ClosureCategory;
    score: number;
    notes: string;
  }[];
  success_patterns: {
    pattern_name: string;
    description: string;
    tags: string[];
  }[];
  kb_feedback: {
    lessons_learned: string;
    best_practices: string[];
    challenges_faced: string[];
    solutions_applied: string[];
  };
}

export interface CaseClosureResponse {
  closure_id: string;
  case_id: string;
  closure_date: string;
  final_status: string;
  scores: ClosureScore[];
  patterns: SuccessPattern[];
  kb_entry: KBFeedback;
  created_at: string;
}
