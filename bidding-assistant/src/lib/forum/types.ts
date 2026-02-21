// ====== 機器論壇型別定義 ======

/** 帖子類型 */
export type PostType =
  | "discuss"
  | "reply"
  | "feedback"
  | "score"
  | "brief"
  | "directive"
  | "response";

/** 優先級 */
export type Priority = "P0" | "P1" | "P2" | "P3";

/** 討論串狀態 */
export type ThreadStatus = "進行中" | "共識" | "已結案" | "過期";

/** 討論串（來自 _threads.md） */
export interface ForumThread {
  id: string;
  status: ThreadStatus;
  priority: Priority | null;
  title: string;
  initiator: string;
  summary: string; // 新格式無此欄，解析時填空字串
  lastUpdate: string; // MMDD 格式
  agree: string[]; // 投票同意的機器碼
  disagree: string[]; // 投票反對的機器碼
  posts: ForumPost[];
}

/** 單則帖子（來自 forum 檔案） */
export interface ForumPost {
  type: PostType;
  timestamp: string; // YYYYMMDD-HHMM
  machineCode: string;
  priority: Priority | null;
  ref: string;
  threadId: string | null;
  content: string;
  sourceFile: string;
}

/** 論壇統計 */
export interface ForumStats {
  totalThreads: number;
  byStatus: Record<ThreadStatus, number>;
  byMachine: Record<string, number>;
  byType: Record<string, number>;
  totalPosts: number;
  recentPosts: ForumPost[];
}

/** API 回傳的完整論壇資料 */
export interface ForumData {
  threads: ForumThread[];
  posts: ForumPost[];
  stats: ForumStats;
}
