// ====== 論壇解析純函式 ======

import type {
  ForumThread,
  ForumPost,
  ForumStats,
  PostType,
  Priority,
  ThreadStatus,
} from "./types";
import { STATUS_SORT_ORDER, PRIORITY_SORT_ORDER } from "./constants";

const VALID_PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
const PRIORITY_LIKE = new Set(["P0", "P1", "P2", "P3", "-"]);
const VALID_STATUSES = new Set<string>(["進行中", "共識", "已結案", "過期"]);
const VALID_POST_TYPES = new Set<string>([
  "discuss",
  "reply",
  "feedback",
  "score",
  "brief",
  "directive",
  "response",
]);

/**
 * 把投票欄字串拆成機器碼陣列。
 * 空字串、空白、"-" 都回傳空陣列。
 * "JDNE,ITEJ" → ["JDNE", "ITEJ"]
 */
function parseVoteColumn(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-") return [];
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * 解析 _threads.md 的內容，回傳討論串陣列（不含帖子）。
 *
 * 支援四種格式：
 * - 6 欄（舊）：id|狀態|標題|發起人|摘要|日期
 * - 7 欄（舊+優先級）：id|狀態|P2|標題|發起人|摘要|日期
 * - 6 欄（新）：id|狀態|P2/-|標題|發起人|日期（無摘要）
 * - 8 欄（投票）：id|狀態|P2/-|標題|發起人|同意|反對|日期
 */
export function parseThreadsIndex(content: string): ForumThread[] {
  const lines = content.split("\n");
  const threads: ForumThread[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳過空行、標題行、引用行
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">")) {
      continue;
    }

    const parts = trimmed.split("|");
    if (parts.length < 6) continue;

    const col2 = parts[2].trim();
    const isPriorityLike = PRIORITY_LIKE.has(col2);

    let id: string,
      status: string,
      priority: Priority | null,
      title: string,
      initiator: string,
      summary: string,
      lastUpdate: string,
      agree: string[] = [],
      disagree: string[] = [];

    if (isPriorityLike && parts.length >= 8) {
      // 8 欄投票格式：id|狀態|P2/-|標題|發起人|同意|反對|日期
      [id, status, , title, initiator] = parts.map((p) => p.trim());
      agree = parseVoteColumn(parts[5]);
      disagree = parseVoteColumn(parts[6]);
      lastUpdate = parts[7].trim();
      priority = col2 === "-" ? null : (col2 as Priority);
      summary = "";
    } else if (isPriorityLike && parts.length >= 7) {
      // 7 欄舊格式 + 優先級：id|狀態|P2|標題|發起人|摘要|日期
      [id, status, , title, initiator, summary, lastUpdate] = parts.map((p) =>
        p.trim(),
      );
      priority = col2 === "-" ? null : (col2 as Priority);
    } else if (isPriorityLike) {
      // 6 欄新格式：id|狀態|P2/-|標題|發起人|日期（無摘要）
      [id, status, , title, initiator, lastUpdate] = parts.map((p) =>
        p.trim(),
      );
      priority = col2 === "-" ? null : (col2 as Priority);
      summary = "";
    } else {
      // 6 欄舊格式：id|狀態|標題|發起人|摘要|日期
      [id, status, title, initiator, summary, lastUpdate] = parts.map((p) =>
        p.trim(),
      );
      priority = null;
    }

    if (!VALID_STATUSES.has(status)) continue;

    threads.push({
      id,
      status: status as ThreadStatus,
      priority,
      title,
      initiator,
      summary,
      lastUpdate,
      agree,
      disagree,
      posts: [],
    });
  }

  return threads;
}

/**
 * 解析一個 forum 帖子檔案，回傳帖子陣列。
 *
 * 帖子 header 格式自適應：
 * - 前 3 欄固定：type|timestamp|machineCode
 * - 後續欄位掃描：P[0-3] → priority、ref: → ref、thread: → threadId
 * - response 類型視為 reply（舊格式相容）
 */
export function parseForumFile(
  content: string,
  sourceFile: string,
): ForumPost[] {
  const blocks = content.split(/^---\s*$/m);
  const posts: ForumPost[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const headerLine = lines[0].trim();
    const headerParts = headerLine.split("|");

    if (headerParts.length < 3) continue;

    let rawType = headerParts[0].trim();
    const timestamp = headerParts[1].trim();
    const machineCode = headerParts[2].trim();

    // 驗證基本格式
    if (!VALID_POST_TYPES.has(rawType)) continue;
    if (!/^\d{8}-\d{4}$/.test(timestamp)) continue;

    // response → reply（舊格式相容）
    const type: PostType = rawType === "response" ? "reply" : (rawType as PostType);

    // 掃描後續欄位
    let priority: Priority | null = null;
    let ref = "none";
    let threadId: string | null = null;

    for (let i = 3; i < headerParts.length; i++) {
      const field = headerParts[i].trim();
      if (VALID_PRIORITIES.has(field)) {
        priority = field as Priority;
      } else if (field.startsWith("ref:")) {
        ref = field.slice(4);
      } else if (field.startsWith("thread:")) {
        threadId = field.slice(7);
      }
    }

    // 帖子內容 = header 之後的所有行
    const contentLines = lines.slice(1);
    const postContent = contentLines.join("\n").trim();

    posts.push({
      type,
      timestamp,
      machineCode,
      priority,
      ref,
      threadId,
      content: postContent,
      sourceFile,
    });
  }

  return posts;
}

/**
 * 把帖子掛到對應的討論串上。
 * 配對邏輯：帖子的 threadId 對應 thread.id。
 * 沒有 threadId 的帖子不掛（但仍保留在總帖子列表中）。
 */
export function attachPostsToThreads(
  threads: ForumThread[],
  posts: ForumPost[],
): ForumThread[] {
  const threadMap = new Map<string, ForumThread>();
  for (const thread of threads) {
    threadMap.set(thread.id, { ...thread, posts: [] });
  }

  for (const post of posts) {
    if (post.threadId && threadMap.has(post.threadId)) {
      threadMap.get(post.threadId)!.posts.push(post);
    }
  }

  // 每個 thread 內的帖子排序：純按時間升序（最早的在最上面）
  for (const thread of threadMap.values()) {
    thread.posts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return Array.from(threadMap.values());
}

/**
 * 討論串排序：進行中 → 共識 → 過期 → 已結案，同狀態內按 P0→P3、再按日期倒序。
 */
export function sortThreads(threads: ForumThread[]): ForumThread[] {
  return [...threads].sort((a, b) => {
    // 先按狀態
    const statusDiff =
      STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    // 再按優先級（null 排在有優先級的後面）
    const aPri = a.priority ? PRIORITY_SORT_ORDER[a.priority] : 99;
    const bPri = b.priority ? PRIORITY_SORT_ORDER[b.priority] : 99;
    if (aPri !== bPri) return aPri - bPri;

    // 最後按日期倒序
    return b.lastUpdate.localeCompare(a.lastUpdate);
  });
}

/**
 * 計算論壇統計資料。
 */
export function computeForumStats(
  threads: ForumThread[],
  posts: ForumPost[],
): ForumStats {
  const byStatus: Record<ThreadStatus, number> = {
    進行中: 0,
    共識: 0,
    已結案: 0,
    過期: 0,
  };
  for (const t of threads) {
    byStatus[t.status]++;
  }

  const byMachine: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const p of posts) {
    byMachine[p.machineCode] = (byMachine[p.machineCode] || 0) + 1;
    byType[p.type] = (byType[p.type] || 0) + 1;
  }

  // 近期帖子：按時間倒序取前 10
  const recentPosts = [...posts]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);

  return {
    totalThreads: threads.length,
    byStatus,
    byMachine,
    byType,
    totalPosts: posts.length,
    recentPosts,
  };
}

/**
 * 格式化時間戳為可讀格式。
 * 20260223-0345 → 02/23 03:45
 */
export function formatTimestamp(ts: string): string {
  if (ts.length !== 13) return ts;
  const month = ts.slice(4, 6);
  const day = ts.slice(6, 8);
  const hour = ts.slice(9, 11);
  const min = ts.slice(11, 13);
  return `${month}/${day} ${hour}:${min}`;
}
