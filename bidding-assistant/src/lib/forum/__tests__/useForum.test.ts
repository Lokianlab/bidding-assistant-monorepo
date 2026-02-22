import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ForumData } from "../types";

// ── Mock global fetch ───────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useForum } from "../useForum";

// ── Helpers ─────────────────────────────────────────────────

function makeForumData(partial: Partial<ForumData> = {}): ForumData {
  return {
    threads: [],
    posts: [],
    stats: {
      totalThreads: 0,
      byStatus: { 進行中: 0, 共識: 0, 已結案: 0, 過期: 0 },
      byMachine: {},
      byType: {},
      totalPosts: 0,
      recentPosts: [],
    },
    ...partial,
  };
}

function makeOkResponse(data: ForumData) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

function makeErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: vi.fn(),
  } as unknown as Response;
}

// ── 初次載入 ──────────────────────────────────────────────────

describe("useForum — 初次載入", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始狀態：loading=true，data=null，error=null", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useForum());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("成功後：data 填充，loading=false，error=null", async () => {
    const data = makeForumData();
    mockFetch.mockResolvedValueOnce(makeOkResponse(data));

    const { result } = renderHook(() => useForum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(data);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/forum");
  });

  it("非 ok 回應：error 有訊息，data=null", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(503));

    const { result } = renderHook(() => useForum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain("503");
    expect(result.current.data).toBeNull();
  });

  it("fetch 拋例外：error 設為訊息字串", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"));

    const { result } = renderHook(() => useForum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network down");
    expect(result.current.data).toBeNull();
  });

  it("fetch 拋非 Error 物件：error 設為「未知錯誤」", async () => {
    mockFetch.mockRejectedValueOnce("unknown");

    const { result } = renderHook(() => useForum());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("未知錯誤");
  });
});

// ── 手動刷新 ──────────────────────────────────────────────────

describe("useForum — refresh()", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("呼叫 refresh() 會再次 fetch 並更新 data", async () => {
    const data1 = makeForumData();
    const data2 = makeForumData({ threads: [] });
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(data1))
      .mockResolvedValueOnce(makeOkResponse(data2));

    const { result } = renderHook(() => useForum());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(data2);
  });

  it("refresh() 失敗後顯示新的 error", async () => {
    const data1 = makeForumData();
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(data1))
      .mockRejectedValueOnce(new Error("Refresh failed"));

    const { result } = renderHook(() => useForum());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBe("Refresh failed"));
  });
});

// ── 並發防護 ──────────────────────────────────────────────────

describe("useForum — 並發防護", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetch 進行中時再次 refresh() 不會觸發第二個 fetch", async () => {
    let resolveFirst!: (v: Response) => void;
    mockFetch.mockReturnValueOnce(
      new Promise<Response>((res) => { resolveFirst = res; }),
    );

    const { result } = renderHook(() => useForum());

    // 在第一次 fetch 尚未完成時觸發 refresh
    act(() => {
      result.current.refresh();
    });

    // fetchingRef 防護：只應呼叫一次
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 完成第一次 fetch
    const data = makeForumData();
    act(() => resolveFirst(makeOkResponse(data)));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── 自動輪詢 ──────────────────────────────────────────────────

describe("useForum — 自動輪詢（silent）", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("30 秒後觸發靜默刷新，fetch 再呼叫一次", async () => {
    const data = makeForumData();
    mockFetch.mockResolvedValue(makeOkResponse(data));

    renderHook(() => useForum());

    // 推進微任務讓初次 fetch 完成
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 推進 30 秒，觸發 silent poll
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("unmount 後不再輪詢", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(makeForumData()));

    const { unmount } = renderHook(() => useForum());

    await act(async () => { await Promise.resolve(); });

    const callCountBeforeUnmount = mockFetch.mock.calls.length;
    unmount();

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(mockFetch.mock.calls.length).toBe(callCountBeforeUnmount);
  });
});
