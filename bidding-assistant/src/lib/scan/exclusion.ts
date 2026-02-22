// ====== 巡標自動化：掃描記憶 ======
// 用 localStorage 記住「不要」和「已建案」的標案

import type { ScanResult } from "./types";

const STORAGE_KEY = "scan-excluded";
const CREATED_KEY = "scan-created";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage 不可用時靜默失敗
  }
}

/** 標記某案號為「不要」 */
export function addExclusion(jobNumber: string): void {
  const set = readSet();
  set.add(jobNumber);
  writeSet(set);
}

/** 撤銷某案號的「不要」 */
export function removeExclusion(jobNumber: string): void {
  const set = readSet();
  set.delete(jobNumber);
  writeSet(set);
}

/** 檢查某案號是否被排除 */
export function isExcluded(jobNumber: string): boolean {
  return readSet().has(jobNumber);
}

/** 過濾掉排除清單中的結果 */
export function filterExcluded(results: ScanResult[]): ScanResult[] {
  const set = readSet();
  return results.filter((r) => !set.has(r.tender.jobNumber));
}

/** 清空所有排除記憶 */
export function clearExclusions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

/** 讀取所有排除的案號（供 UI 顯示） */
export function getExcludedJobNumbers(): string[] {
  return [...readSet()];
}

// ── 建案記憶（防重複建案） ──

function readCreatedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CREATED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeCreatedSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CREATED_KEY, JSON.stringify([...set]));
  } catch {
    // silent
  }
}

/** 標記某案號已建案 */
export function addCreatedCase(jobNumber: string): void {
  const set = readCreatedSet();
  set.add(jobNumber);
  writeCreatedSet(set);
}

/** 讀取所有已建案的案號 */
export function getCreatedJobNumbers(): string[] {
  return [...readCreatedSet()];
}

/** 清空建案記憶 */
export function clearCreatedCases(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CREATED_KEY);
  } catch {
    // silent
  }
}
