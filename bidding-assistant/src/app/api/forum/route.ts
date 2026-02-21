import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  parseThreadsIndex,
  parseForumFile,
  attachPostsToThreads,
  sortThreads,
  computeForumStats,
} from "@/lib/forum/helpers";

function getForumDir() {
  return path.resolve(process.cwd(), "..", "docs", "records", "forum");
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
 *
 * Body: { content: string, threadId?: string, threadTitle?: string, type?: "discuss" | "reply", priority?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, threadId, threadTitle, type, priority } = body as {
      content?: string;
      threadId?: string;
      threadTitle?: string;
      type?: string;
      priority?: string;
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

    return NextResponse.json({
      success: true,
      timestamp,
      fileName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "發帖失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
