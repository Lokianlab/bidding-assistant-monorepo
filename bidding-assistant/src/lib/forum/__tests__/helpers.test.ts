import { describe, it, expect } from "vitest";
import {
  parseThreadsIndex,
  parseForumFile,
  attachPostsToThreads,
  sortThreads,
  computeForumStats,
  formatTimestamp,
} from "../helpers";

// ====== parseThreadsIndex ======

describe("parseThreadsIndex", () => {
  it("解析 6 欄舊格式", () => {
    const content = `# 論壇討論串索引

> 格式說明

quality-tiers|共識|三級品質制度|A44T|三方共識|0222
claude-md-boundary|已結案|CLAUDE.md 邊界|JDNE|用戶核准|0221`;

    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(2);

    expect(threads[0]).toEqual({
      id: "quality-tiers",
      status: "共識",
      priority: null,
      title: "三級品質制度",
      initiator: "A44T",
      summary: "三方共識",
      lastUpdate: "0222",
      posts: [],
    });

    expect(threads[1].status).toBe("已結案");
  });

  it("解析 7 欄格式（含優先級和摘要）", () => {
    const content = `governance|已結案|P2|團隊治理|A44T|用戶核准|0221
efficiency-calibration|進行中|P0|效率校準|Jin（用戶）|待裁決|0222`;

    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(2);

    expect(threads[0].priority).toBe("P2");
    expect(threads[0].title).toBe("團隊治理");
    expect(threads[0].summary).toBe("用戶核准");

    expect(threads[1].priority).toBe("P0");
    expect(threads[1].status).toBe("進行中");
  });

  it("解析 6 欄新格式（含優先級，無摘要）", () => {
    const content = `quality-tiers|共識|-|三級品質制度|A44T|0222
methodology-ownership|共識|P2|方法論分工認領|JDNE|0222
efficiency-calibration|進行中|P0|效率校準|Jin（用戶）|0222`;

    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(3);

    // - 表示無優先級
    expect(threads[0].id).toBe("quality-tiers");
    expect(threads[0].priority).toBeNull();
    expect(threads[0].title).toBe("三級品質制度");
    expect(threads[0].summary).toBe("");

    // P2
    expect(threads[1].priority).toBe("P2");
    expect(threads[1].title).toBe("方法論分工認領");
    expect(threads[1].summary).toBe("");

    // P0
    expect(threads[2].priority).toBe("P0");
    expect(threads[2].initiator).toBe("Jin（用戶）");
  });

  it("混合新舊格式", () => {
    const content = `quality-tiers|共識|三級品質制度|A44T|三方共識|0222
governance|已結案|P2|團隊治理|A44T|用戶核准|0221
rebase-standard|共識|P2|git rebase 標準化|Z1FV|0223`;

    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(3);
    expect(threads[0].priority).toBeNull(); // 舊 6 欄
    expect(threads[0].summary).toBe("三方共識");
    expect(threads[1].priority).toBe("P2"); // 舊 7 欄
    expect(threads[1].summary).toBe("用戶核准");
    expect(threads[2].priority).toBe("P2"); // 新 6 欄
    expect(threads[2].summary).toBe("");
  });

  it("跳過空行和標題行", () => {
    const content = `# 標題

> 說明

quality-tiers|共識|三級品質制度|A44T|摘要|0222

`;
    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(1);
  });

  it("跳過欄位不足的行", () => {
    const content = `quality-tiers|共識|三級`;
    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(0);
  });

  it("跳過無效狀態", () => {
    const content = `quality-tiers|無效狀態|三級品質制度|A44T|摘要|0222`;
    const threads = parseThreadsIndex(content);
    expect(threads).toHaveLength(0);
  });

  it("空字串回傳空陣列", () => {
    expect(parseThreadsIndex("")).toEqual([]);
  });
});

// ====== parseForumFile ======

describe("parseForumFile", () => {
  it("解析新格式帖子（含 priority + thread）", () => {
    const content = `reply|20260223-0345|Z1FV|P2|ref:A44T:20260222-0320|thread:scoring-architecture
立場：同意 A44T 提案方向。
---`;

    const posts = parseForumFile(content, "20260223-Z1FV.md");
    expect(posts).toHaveLength(1);

    const post = posts[0];
    expect(post.type).toBe("reply");
    expect(post.timestamp).toBe("20260223-0345");
    expect(post.machineCode).toBe("Z1FV");
    expect(post.priority).toBe("P2");
    expect(post.ref).toBe("A44T:20260222-0320");
    expect(post.threadId).toBe("scoring-architecture");
    expect(post.content).toBe("立場：同意 A44T 提案方向。");
    expect(post.sourceFile).toBe("20260223-Z1FV.md");
  });

  it("解析舊格式帖子（無 priority 無 thread）", () => {
    const content = `brief|20260222-1845|A44T|ref:none
三級品質制度已寫入 CLAUDE.md。
---`;

    const posts = parseForumFile(content, "20260222-A44T.md");
    expect(posts).toHaveLength(1);

    const post = posts[0];
    expect(post.type).toBe("brief");
    expect(post.priority).toBeNull();
    expect(post.threadId).toBeNull();
    expect(post.ref).toBe("none");
  });

  it("response 類型自動轉為 reply", () => {
    const content = `response|20260222-1730|A44T|ref:20260222-JDNE#1710
回覆內容
---`;

    const posts = parseForumFile(content, "20260222-A44T.md");
    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe("reply");
  });

  it("解析多則帖子", () => {
    const content = `discuss|20260223-0415|Z1FV|P2|ref:none|thread:rebase-standard
提案內容
---
reply|20260223-0435|Z1FV|P2|ref:3O5L:20260223-0100|thread:optimize-add-cut-add
回覆內容
---`;

    const posts = parseForumFile(content, "20260223-Z1FV.md");
    expect(posts).toHaveLength(2);
    expect(posts[0].type).toBe("discuss");
    expect(posts[1].type).toBe("reply");
  });

  it("帖子只有 priority 沒有 ref 和 thread", () => {
    const content = `brief|20260223-0330|Z1FV|P2|ref:none
通知內容
---`;

    const posts = parseForumFile(content, "test.md");
    expect(posts).toHaveLength(1);
    expect(posts[0].priority).toBe("P2");
    expect(posts[0].threadId).toBeNull();
  });

  it("跳過格式不正確的區塊", () => {
    const content = `這不是帖子
---
discuss|20260223-0415|Z1FV|P2|ref:none|thread:test
正確的帖子
---
只有一行的區塊
---`;

    const posts = parseForumFile(content, "test.md");
    expect(posts).toHaveLength(1);
  });

  it("多行帖子內容", () => {
    const content = `discuss|20260223-0415|Z1FV|P2|ref:none|thread:test
第一行

第三行
- 列表項
---`;

    const posts = parseForumFile(content, "test.md");
    expect(posts).toHaveLength(1);
    expect(posts[0].content).toContain("第一行");
    expect(posts[0].content).toContain("第三行");
    expect(posts[0].content).toContain("- 列表項");
  });

  it("空字串回傳空陣列", () => {
    expect(parseForumFile("", "test.md")).toEqual([]);
  });
});

// ====== attachPostsToThreads ======

describe("attachPostsToThreads", () => {
  it("把帖子正確掛到討論串", () => {
    const threads = [
      {
        id: "test-thread",
        status: "進行中" as const,
        priority: null,
        title: "測試",
        initiator: "A44T",
        summary: "測試摘要",
        lastUpdate: "0222",
        posts: [],
      },
    ];

    const posts = [
      {
        type: "discuss" as const,
        timestamp: "20260222-1000",
        machineCode: "A44T",
        priority: null,
        ref: "none",
        threadId: "test-thread",
        content: "帖子一",
        sourceFile: "test.md",
      },
      {
        type: "reply" as const,
        timestamp: "20260222-1100",
        machineCode: "JDNE",
        priority: null,
        ref: "none",
        threadId: "test-thread",
        content: "帖子二",
        sourceFile: "test.md",
      },
      {
        type: "brief" as const,
        timestamp: "20260222-1200",
        machineCode: "ITEJ",
        priority: null,
        ref: "none",
        threadId: null,
        content: "無歸屬帖子",
        sourceFile: "test.md",
      },
    ];

    const result = attachPostsToThreads(threads, posts);
    expect(result[0].posts).toHaveLength(2);
    expect(result[0].posts[0].timestamp).toBe("20260222-1000");
    expect(result[0].posts[1].timestamp).toBe("20260222-1100");
  });

  it("帖子按時間排序", () => {
    const threads = [
      {
        id: "t1",
        status: "進行中" as const,
        priority: null,
        title: "",
        initiator: "",
        summary: "",
        lastUpdate: "",
        posts: [],
      },
    ];

    const posts = [
      {
        type: "reply" as const,
        timestamp: "20260222-1200",
        machineCode: "A44T",
        priority: null,
        ref: "none",
        threadId: "t1",
        content: "後",
        sourceFile: "test.md",
      },
      {
        type: "discuss" as const,
        timestamp: "20260222-1000",
        machineCode: "JDNE",
        priority: null,
        ref: "none",
        threadId: "t1",
        content: "先",
        sourceFile: "test.md",
      },
    ];

    const result = attachPostsToThreads(threads, posts);
    expect(result[0].posts[0].content).toBe("先");
    expect(result[0].posts[1].content).toBe("後");
  });
});

// ====== sortThreads ======

describe("sortThreads", () => {
  const makeThread = (
    status: "進行中" | "共識" | "已結案" | "過期",
    priority: "P0" | "P1" | "P2" | "P3" | null,
    lastUpdate: string,
  ) => ({
    id: `${status}-${priority}-${lastUpdate}`,
    status,
    priority,
    title: "",
    initiator: "",
    summary: "",
    lastUpdate,
    posts: [],
  });

  it("進行中排在共識前面", () => {
    const threads = [makeThread("共識", null, "0222"), makeThread("進行中", null, "0222")];
    const sorted = sortThreads(threads);
    expect(sorted[0].status).toBe("進行中");
    expect(sorted[1].status).toBe("共識");
  });

  it("同狀態內 P0 排在 P2 前面", () => {
    const threads = [
      makeThread("進行中", "P2", "0222"),
      makeThread("進行中", "P0", "0222"),
    ];
    const sorted = sortThreads(threads);
    expect(sorted[0].priority).toBe("P0");
  });

  it("已結案排最後", () => {
    const threads = [
      makeThread("已結案", null, "0223"),
      makeThread("進行中", null, "0221"),
    ];
    const sorted = sortThreads(threads);
    expect(sorted[0].status).toBe("進行中");
    expect(sorted[1].status).toBe("已結案");
  });
});

// ====== computeForumStats ======

describe("computeForumStats", () => {
  it("正確統計各項數據", () => {
    const threads = [
      {
        id: "t1",
        status: "進行中" as const,
        priority: null,
        title: "",
        initiator: "",
        summary: "",
        lastUpdate: "",
        posts: [],
      },
      {
        id: "t2",
        status: "進行中" as const,
        priority: null,
        title: "",
        initiator: "",
        summary: "",
        lastUpdate: "",
        posts: [],
      },
      {
        id: "t3",
        status: "共識" as const,
        priority: null,
        title: "",
        initiator: "",
        summary: "",
        lastUpdate: "",
        posts: [],
      },
    ];

    const posts = [
      {
        type: "discuss" as const,
        timestamp: "20260223-0100",
        machineCode: "A44T",
        priority: null,
        ref: "none",
        threadId: null,
        content: "",
        sourceFile: "",
      },
      {
        type: "reply" as const,
        timestamp: "20260223-0200",
        machineCode: "A44T",
        priority: null,
        ref: "none",
        threadId: null,
        content: "",
        sourceFile: "",
      },
      {
        type: "discuss" as const,
        timestamp: "20260223-0300",
        machineCode: "JDNE",
        priority: null,
        ref: "none",
        threadId: null,
        content: "",
        sourceFile: "",
      },
    ];

    const stats = computeForumStats(threads, posts);

    expect(stats.totalThreads).toBe(3);
    expect(stats.byStatus["進行中"]).toBe(2);
    expect(stats.byStatus["共識"]).toBe(1);
    expect(stats.byStatus["已結案"]).toBe(0);
    expect(stats.totalPosts).toBe(3);
    expect(stats.byMachine["A44T"]).toBe(2);
    expect(stats.byMachine["JDNE"]).toBe(1);
    expect(stats.byType["discuss"]).toBe(2);
    expect(stats.byType["reply"]).toBe(1);
    expect(stats.recentPosts).toHaveLength(3);
    // 近期帖子按時間倒序
    expect(stats.recentPosts[0].timestamp).toBe("20260223-0300");
  });
});

// ====== formatTimestamp ======

describe("formatTimestamp", () => {
  it("格式化正確時間戳", () => {
    expect(formatTimestamp("20260223-0345")).toBe("02/23 03:45");
  });

  it("不正確長度原樣回傳", () => {
    expect(formatTimestamp("abc")).toBe("abc");
  });
});
