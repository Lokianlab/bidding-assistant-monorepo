import type { PCCAction } from "./types";

/**
 * 呼叫 PCC API route 的共用函式。
 * 處理 JSON 解析和錯誤訊息，避免各 hook 重複實作。
 */
export async function pccApiFetch<T = unknown>(
  action: PCCAction,
  data: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/pcc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `API 錯誤 (${res.status})`,
    );
  }

  return res.json() as Promise<T>;
}

/** 延遲指定毫秒（用於 rate limiting） */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
