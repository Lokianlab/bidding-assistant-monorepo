// ====== 機器論壇常數（SSOT） ======

import type { PostType, Priority, ThreadStatus } from "./types";

/** 用戶代號（位階最高） */
export const USER_CODE = "Jin";

/** 機器代號 → 顏色（Tailwind border-left） */
export const MACHINE_COLORS: Record<string, string> = {
  [USER_CODE]: "border-l-yellow-500",
  A44T: "border-l-blue-500",
  JDNE: "border-l-purple-500",
  ITEJ: "border-l-green-500",
  AINL: "border-l-amber-500",
  Z1FV: "border-l-cyan-500",
  "3O5L": "border-l-rose-500",
};

/** 機器代號 → 背景色（用於小徽章） */
export const MACHINE_BG_COLORS: Record<string, string> = {
  [USER_CODE]: "bg-yellow-400 text-yellow-900 font-bold",
  A44T: "bg-blue-100 text-blue-800",
  JDNE: "bg-purple-100 text-purple-800",
  ITEJ: "bg-green-100 text-green-800",
  AINL: "bg-amber-100 text-amber-800",
  Z1FV: "bg-cyan-100 text-cyan-800",
  "3O5L": "bg-rose-100 text-rose-800",
};

/** 預設機器顏色（未知機器碼） */
export const DEFAULT_MACHINE_COLOR = "border-l-gray-400";
export const DEFAULT_MACHINE_BG = "bg-gray-100 text-gray-800";

/** 帖子類型 → 中文標籤 + Badge 樣式 */
export const POST_TYPE_CONFIG: Record<
  PostType,
  { label: string; className: string }
> = {
  discuss: { label: "討論", className: "bg-blue-100 text-blue-800" },
  reply: { label: "回覆", className: "bg-gray-100 text-gray-700" },
  feedback: { label: "審查", className: "bg-green-100 text-green-800" },
  score: { label: "評分", className: "bg-yellow-100 text-yellow-800" },
  brief: { label: "通知", className: "bg-slate-100 text-slate-600" },
  directive: { label: "指令", className: "bg-red-100 text-red-800" },
  response: { label: "回覆", className: "bg-gray-100 text-gray-700" },
  approval: { label: "申請審核", className: "bg-amber-200 text-amber-900 font-semibold" },
};

/** 優先級 → Badge 樣式 */
export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string }
> = {
  P0: { label: "緊急", className: "bg-red-100 text-red-800" },
  P1: { label: "重要", className: "bg-orange-100 text-orange-800" },
  P2: { label: "一般", className: "bg-blue-100 text-blue-700" },
  P3: { label: "不急", className: "bg-gray-100 text-gray-600" },
};

/** 討論串狀態 → 樣式 */
export const THREAD_STATUS_CONFIG: Record<
  ThreadStatus,
  { label: string; dotColor: string; className: string }
> = {
  進行中: {
    label: "討論中",
    dotColor: "bg-blue-500",
    className: "text-blue-700",
  },
  共識: {
    label: "待你批准",
    dotColor: "bg-yellow-500",
    className: "text-yellow-700",
  },
  已結案: {
    label: "已結案",
    dotColor: "bg-green-500",
    className: "text-green-700",
  },
  過期: {
    label: "沒人理了",
    dotColor: "bg-gray-400",
    className: "text-gray-500",
  },
};

/** 討論串排序權重（數字越小越前面） */
export const STATUS_SORT_ORDER: Record<ThreadStatus, number> = {
  進行中: 0,
  共識: 1,
  過期: 2,
  已結案: 3,
};

/** 優先級排序權重 */
export const PRIORITY_SORT_ORDER: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};
