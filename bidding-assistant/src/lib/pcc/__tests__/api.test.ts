import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pccApiFetch, delay } from "../api";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pccApiFetch", () => {
  it("sends correct request format", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: [] }),
    });

    await pccApiFetch("searchByTitle", { query: "test", page: 1 });

    expect(mockFetch).toHaveBeenCalledWith("/api/pcc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "searchByTitle",
        data: { query: "test", page: 1 },
      }),
    });
  });

  it("returns parsed JSON on success", async () => {
    const data = { records: [{ id: "1" }], total_pages: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    const result = await pccApiFetch("searchByTitle", { query: "test" });
    expect(result).toEqual(data);
  });

  it("throws with API error message on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "伺服器錯誤" }),
    });

    await expect(pccApiFetch("searchByTitle", { query: "test" })).rejects.toThrow(
      "伺服器錯誤",
    );
  });

  it("throws with status code when error response is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError("not JSON")),
    });

    await expect(pccApiFetch("searchByTitle", { query: "test" })).rejects.toThrow(
      "API 錯誤 (502)",
    );
  });

  it("throws with status code when error response has no error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: "forbidden" }),
    });

    await expect(pccApiFetch("searchByTitle", { query: "test" })).rejects.toThrow(
      "API 錯誤 (403)",
    );
  });

  it("propagates network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(pccApiFetch("searchByTitle", { query: "test" })).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("checks res.ok before parsing success body", async () => {
    // Verifies the bug fix: if response body is not JSON but status is ok,
    // we should get a JSON parse error, not silently pass
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(pccApiFetch("searchByTitle", { query: "test" })).rejects.toThrow(
      "Unexpected token",
    );
  });
});

describe("delay", () => {
  it("resolves after specified time", async () => {
    vi.useFakeTimers();

    const promise = delay(300);
    vi.advanceTimersByTime(300);
    await promise;

    vi.useRealTimers();
  });

  it("resolves with undefined", async () => {
    vi.useFakeTimers();

    const promise = delay(100);
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(result).toBeUndefined();

    vi.useRealTimers();
  });
});
