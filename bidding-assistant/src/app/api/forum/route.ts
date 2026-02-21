import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  parseThreadsIndex,
  parseForumFile,
  attachPostsToThreads,
  sortThreads,
  computeForumStats,
} from "@/lib/forum/helpers";

/**
 * GET /api/forum
 * 讀取 docs/records/forum/ 目錄，解析 _threads.md 和所有帖子檔案，
 * 回傳完整的論壇資料 JSON。
 */
export async function GET() {
  try {
    const forumDir = path.resolve(process.cwd(), "..", "docs", "records", "forum");

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
