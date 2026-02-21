import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  parseThreadsIndex,
  parseForumFile,
  attachPostsToThreads,
  sortThreads,
  computeForumStats,
} from "@/lib/forum/helpers";
import { USER_CODE } from "@/lib/forum/constants";

const execAsync = promisify(exec);

function getForumDir() {
  return path.resolve(process.cwd(), "..", "docs", "records", "forum");
}

function getProjectRoot() {
  return path.resolve(process.cwd(), "..");
}

/**
 * 把 Jin 的發帖同步到 git：add → commit → (fetch --rebase) → push。
 * 衝突時自動 rebase 再 push。
 */
async function gitSyncForumPost(commitMsg: string, files: string[]): Promise<{ synced: boolean; error?: string }> {
  const root = getProjectRoot();
  const opts = { cwd: root };
  try {
    // 只 add 實際修改的檔案，避免把含衝突標記的無關檔案一起提交
    const addPaths = files.map((f) => `docs/records/forum/${f}`).join(" ");
    await execAsync(`git add ${addPaths}`, opts);
    await execAsync(`git commit -m ${JSON.stringify(commitMsg)}`, opts);
    try {
      await execAsync("git push origin main", opts);
    } catch {
      // 推送衝突：先 rebase 再推
      await execAsync("git fetch origin && git rebase origin/main", opts);
      await execAsync("git push origin main", opts);
    }
    return { synced: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { synced: false, error: msg };
  }
}

/**
 * GET /api/forum
 * 先從遠端 pull 最新帖子，再讀取 docs/records/forum/ 目錄，
 * 解析 _threads.md 和所有帖子檔案，回傳完整的論壇資料 JSON。
 */
export async function GET() {
  try {
    // 先拉最新帖子，讓 Jin 看到其他機器的回覆
    const root = getProjectRoot();
    try {
      await execAsync("git fetch origin && git rebase origin/main", { cwd: root });
    } catch {
      // pull 失敗不阻塞讀取（可能是衝突或網路問題），繼續用本地資料
    }

    const forumDir = getForumDir();

    // 讀 _threads.md
    const threadsPath = path.join(forumDir, "_threads.md");
    const threadsContent = await fs.readFile(threadsPath, "utf-8");
    const threads = parseThreadsIndex(threadsContent);

    // 讀所有帖子檔案（排除 _threads.md）
    const files = await fs.readdir(forumDir);
    const postFiles = files.filter(
      (f) => f.endsWith(".md") && !f.startsWith("_"),
    );

    const allPosts = [];
    for (const file of postFiles) {
      const filePath = path.join(forumDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const posts = parseForumFile(content, file);
      allPosts.push(...posts);
    }

    // 組裝
    const threadsWithPosts = attachPostsToThreads(threads, allPosts);
    const sortedThreads = sortThreads(threadsWithPosts);
    const stats = computeForumStats(sortedThreads, allPosts);

    return NextResponse.json({
      threads: sortedThreads,
      posts: allPosts,
      stats,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取論壇資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/forum
 * Jin 發帖。寫入 forum 目錄的 Jin 專屬檔案。
 * 新話題（discuss）同時在 _threads.md 建立條目。
 * 帶 updateStatus 時同時更新 _threads.md 的討論串狀態。
 *
 * Body: { content: string, threadId?: string, threadTitle?: string,
 *         type?: "discuss" | "reply", priority?: string,
 *         updateStatus?: "進行中" | "共識" | "已結案" | "過期",
 *         ref?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, threadId, threadTitle, type, priority, updateStatus, ref } = body as {
      content?: string;
      threadId?: string;
      threadTitle?: string;
      type?: string;
      priority?: string;
      updateStatus?: string;
      ref?: string;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "內容不能為空" }, { status: 400 });
    }

    const forumDir = getForumDir();

    // 時間戳（台北時間 UTC+8）
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const dateStr = utc8.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr =
      String(utc8.getUTCHours()).padStart(2, "0") +
      String(utc8.getUTCMinutes()).padStart(2, "0");
    const timestamp = `${dateStr}-${timeStr}`;
    const monthDay = dateStr.slice(4, 8); // MMDD

    const postType = type || (threadId ? "reply" : "discuss");
    const postPriority = priority || "P0";

    // 組裝帖子 header
    const refValue = ref ? `ref:${ref}` : "ref:none";
    const headerParts = [postType, timestamp, "Jin", postPriority, refValue];
    if (threadId) headerParts.push(`thread:${threadId}`);
    const header = headerParts.join("|");
    const postBlock = `${header}\n${content.trim()}\n---\n`;

    // 寫入 Jin 的每日檔案（append-only）
    const fileName = `${dateStr}-Jin.md`;
    const filePath = path.join(forumDir, fileName);
    await fs.appendFile(filePath, postBlock, "utf-8");

    // 新話題：在 _threads.md 建立條目
    if (postType === "discuss" && threadId) {
      const title = threadTitle || threadId;
      const pri = postPriority === "P0" ? "P0" : postPriority;
      const threadLine = `\n${threadId}|進行中|${pri}|${title}|Jin（用戶）|||${monthDay}`;
      const threadsPath = path.join(forumDir, "_threads.md");
      await fs.appendFile(threadsPath, threadLine, "utf-8");
    }

    // 更新 _threads.md 中的討論串狀態（批准/退回時用）
    if (updateStatus && threadId) {
      const threadsPath = path.join(forumDir, "_threads.md");
      const threadsContent = await fs.readFile(threadsPath, "utf-8");
      const updatedContent = threadsContent
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">")) return line;
          const parts = trimmed.split("|");
          if (parts.length >= 6 && parts[0].trim() === threadId) {
            parts[1] = updateStatus;
            return parts.join("|");
          }
          return line;
        })
        .join("\n");
      await fs.writeFile(threadsPath, updatedContent, "utf-8");
    }

    // 同步到 git，讓各機器 git pull 後能看到 Jin 的發帖
    const commitMsg = `[admin] Jin 發帖：${postType} in ${threadId || "新話題"}`;
    const modifiedFiles = [fileName];
    if ((postType === "discuss" && threadId) || (updateStatus && threadId)) {
      modifiedFiles.push("_threads.md");
    }
    const { synced, error: syncError } = await gitSyncForumPost(commitMsg, modifiedFiles);

    return NextResponse.json({
      success: true,
      timestamp,
      fileName,
      synced,
      syncError: syncError ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "發帖失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 解析投票欄字串 */
function parseVoteStr(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-") return [];
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * PATCH /api/forum
 * 兩種操作（根據 body 欄位決定）：
 *
 * 1. 狀態更新：{ threadId: string, status: "已結案" | "進行中" | "共識" | "過期" }
 * 2. 投票：{ threadId: string, vote: "agree" | "disagree" | "withdraw" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId, status, vote } = body as {
      threadId?: string;
      status?: string;
      vote?: string;
    };

    if (!threadId) {
      return NextResponse.json({ error: "缺少 threadId" }, { status: 400 });
    }

    const forumDir = getForumDir();
    const threadsPath = path.join(forumDir, "_threads.md");
    const content = await fs.readFile(threadsPath, "utf-8");
    const lines = content.split("\n");

    // 操作 1：狀態更新
    if (status) {
      const validStatuses = new Set(["進行中", "共識", "已結案", "過期"]);
      if (!validStatuses.has(status)) {
        return NextResponse.json({ error: "無效的狀態值" }, { status: 400 });
      }

      let updated = false;
      const newLines = lines.map((line) => {
        const parts = line.split("|");
        if (parts.length >= 2 && parts[0].trim() === threadId) {
          parts[1] = status;
          updated = true;
          return parts.join("|");
        }
        return line;
      });

      if (!updated) {
        return NextResponse.json({ error: `找不到 thread: ${threadId}` }, { status: 404 });
      }

      await fs.writeFile(threadsPath, newLines.join("\n"), "utf-8");

      const commitMsg = `[admin] Jin 更新 ${threadId} 狀態 → ${status}`;
      const { synced, error: syncError } = await gitSyncForumPost(commitMsg, ["_threads.md"]);

      return NextResponse.json({ success: true, synced, syncError: syncError ?? null });
    }

    // 操作 2：投票
    if (vote) {
      if (!["agree", "disagree", "withdraw"].includes(vote)) {
        return NextResponse.json(
          { error: "vote 必須是 agree、disagree 或 withdraw" },
          { status: 400 },
        );
      }

      let found = false;
      const updatedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">")) {
          return line;
        }

        const parts = trimmed.split("|");
        if (parts.length < 6) return line;
        if (parts[0].trim() !== threadId) return line;

        found = true;

        // 解析現有投票狀態
        const col2 = parts[2].trim();
        const isPriorityLike = ["P0", "P1", "P2", "P3", "-"].includes(col2);

        let id: string, threadStatus: string, priority: string, title: string, initiator: string;
        let agreeList: string[] = [];
        let disagreeList: string[] = [];
        let lastUpdate: string;

        if (isPriorityLike && parts.length >= 8) {
          // 已經是 8 欄
          [id, threadStatus, priority, title, initiator] = parts.map((p) => p.trim());
          agreeList = parseVoteStr(parts[5]);
          disagreeList = parseVoteStr(parts[6]);
          lastUpdate = parts[7].trim();
        } else if (isPriorityLike && parts.length >= 7) {
          // 7 欄→升級為 8 欄（摘要欄棄用）
          [id, threadStatus, priority, title, initiator, , lastUpdate] = parts.map((p) => p.trim());
        } else if (isPriorityLike) {
          // 6 欄新格式→升級為 8 欄
          [id, threadStatus, priority, title, initiator, lastUpdate] = parts.map((p) => p.trim());
        } else {
          // 6 欄舊格式（無優先級）→升級為 8 欄
          [id, threadStatus, title, initiator, , lastUpdate] = parts.map((p) => p.trim());
          priority = "-";
        }

        // 執行投票操作
        const voterCode = USER_CODE;
        // 先從兩邊移除
        agreeList = agreeList.filter((c) => c !== voterCode);
        disagreeList = disagreeList.filter((c) => c !== voterCode);

        if (vote === "agree") {
          agreeList.push(voterCode);
        } else if (vote === "disagree") {
          disagreeList.push(voterCode);
        }
        // withdraw：已經從兩邊移除了

        const agreeStr = agreeList.length > 0 ? agreeList.join(",") : "";
        const disagreeStr = disagreeList.length > 0 ? disagreeList.join(",") : "";

        return `${id}|${threadStatus}|${priority}|${title}|${initiator}|${agreeStr}|${disagreeStr}|${lastUpdate}`;
      });

      if (!found) {
        return NextResponse.json(
          { error: `找不到討論串：${threadId}` },
          { status: 404 },
        );
      }

      await fs.writeFile(threadsPath, updatedLines.join("\n"), "utf-8");

      return NextResponse.json({ success: true, threadId, vote });
    }

    return NextResponse.json(
      { error: "需要 status 或 vote 欄位" },
      { status: 400 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "操作失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
