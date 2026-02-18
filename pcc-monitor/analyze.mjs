#!/usr/bin/env node
/**
 * PCC API 更新延遲分析器
 *
 * 讀取 monitor.mjs 產生的 update-log.jsonl，分析更新規律。
 *
 * 用法：node pcc-monitor/analyze.mjs
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, "update-log.jsonl");

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}天${remainHours}時${minutes}分`;
  }
  return `${hours}時${minutes}分`;
}

if (!existsSync(LOG_FILE)) {
  console.log("尚無記錄。請先執行 monitor.mjs 收集資料。");
  process.exit(0);
}

const raw = await readFile(LOG_FILE, "utf-8");
const lines = raw.trim().split("\n").filter(Boolean);
const entries = lines.map((l) => JSON.parse(l));

const updates = entries.filter((e) => e.type === "update_detected");
const errors = entries.filter((e) => e.type === "error");
const checks = entries.filter((e) => e.type !== "error");

console.log("╔═══════════════════════════════════════╗");
console.log("║   PCC API 更新延遲分析報告            ║");
console.log("╚═══════════════════════════════════════╝");
console.log("");
console.log(`總檢查次數: ${checks.length}`);
console.log(`偵測到更新: ${updates.length} 次`);
console.log(`API 錯誤:   ${errors.length} 次`);

if (updates.length === 0) {
  console.log("\n尚未偵測到任何更新，需要更多資料。");
  process.exit(0);
}

console.log("\n── 每次更新的延遲 ──\n");
console.log(
  "偵測時間                  | 資料日期     | 延遲上限       | 新增筆數"
);
console.log(
  "--------------------------|--------------|----------------|--------"
);

const delays = [];
for (const u of updates) {
  const detectTime = new Date(u.time).toLocaleString("zh-TW");
  const dataDate = u.newDataTime.slice(0, 10);
  delays.push(u.delayUpperBoundMs);
  console.log(
    `${detectTime.padEnd(26)}| ${dataDate.padEnd(13)}| ${u.delayUpperBound.padEnd(15)}| +${u.newRecords.toLocaleString()}`
  );
}

console.log("\n── 統計摘要 ──\n");

const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
const minDelay = Math.min(...delays);
const maxDelay = Math.max(...delays);

console.log(`平均延遲上限: ${formatDuration(avgDelay)}`);
console.log(`最短延遲上限: ${formatDuration(minDelay)}`);
console.log(`最長延遲上限: ${formatDuration(maxDelay)}`);
console.log(`樣本數:       ${delays.length}`);

if (updates.length >= 2) {
  console.log("\n── 更新間隔 ──\n");
  for (let i = 1; i < updates.length; i++) {
    const prev = new Date(updates[i - 1].newDataTime);
    const curr = new Date(updates[i].newDataTime);
    const gap = curr.getTime() - prev.getTime();
    console.log(
      `${updates[i - 1].newDataTime.slice(0, 10)} → ${updates[i].newDataTime.slice(0, 10)}: ${formatDuration(gap)}`
    );
  }
}

console.log("\n── 結論 ──\n");
if (delays.length >= 3) {
  console.log(
    `基於 ${delays.length} 次觀測，API 資料延遲上限約為 ${formatDuration(avgDelay)}。`
  );
  console.log("（「延遲上限」= 偵測到更新的時間 − 資料日期，實際延遲可能更短）");
} else {
  console.log("資料點不足，需要持續監控至少 1-2 週才能得出可靠結論。");
}
