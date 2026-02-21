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
async function gitSyncForumPost(commitMsg: string): Promise<{ synced: boolean; error?: string }> {
  const root = getProjectRoot();
  const opts = { cwd: root };
  try {
    await execAsync("git add docs/records/forum/", opts);
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
 * 讀取 docs/records/forum/ 目錄，解析 _threads.md 和所有帖子檔案，
 * 回傳完整的論壇資料 JSON。
 */
export async function GET() {
  try {
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
 *         updateStatus?: "進行中" | "共識" | "已結案" | "過期" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, threadId, threadTitle, type, priority, updateStatus } = body as {
      content?: string;
      threadId?: string;
      threadTitle?: string;
      type?: string;
      priority?: string;
      updateStatus?: string;
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
    const headerParts = [postType, timestamp, "Jin", postPriority, "ref:none"];
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
      const threadLine = `\n${threadId}|進行中|${pri}|${title}|Jin（用戶）|${monthDay}`;
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
    const { synced, error: syncError } = await gitSyncForumPost(commitMsg);

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

/**
 * PATCH /api/forum
 * 更新討論串狀態（_threads.md）。
 * 用於 Jin 批准/退回後同步狀態。
 *
 * Body: { threadId: string, status: "已結案" | "進行中" | "共識" | "過期" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { threadId, status } = (await request.json()) as {
      threadId?: string;
      status?: string;
    };

    if (!threadId || !status) {
      return NextResponse.json({ error: "缺少 threadId 或 status" }, { status: 400 });
    }

    const validStatuses = new Set(["進行中", "共識", "已結案", "過期"]);
    if (!validStatuses.has(status)) {
      return NextResponse.json({ error: "無效的狀態值" }, { status: 400 });
    }

    const forumDir = getForumDir();
    const threadsPath = path.join(forumDir, "_threads.md");
    const content = await fs.readFile(threadsPath, "utf-8");

    // 找到對應的 thread 行並更新狀態（第二個 | 分隔的欄位）
    const lines = content.split("\n");
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

    // 同步到 git
    const commitMsg = `[admin] Jin 更新 ${threadId} 狀態 → ${status}`;
    const { synced, error: syncError } = await gitSyncForumPost(commitMsg);

    return NextResponse.json({ success: true, synced, syncError: syncError ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
