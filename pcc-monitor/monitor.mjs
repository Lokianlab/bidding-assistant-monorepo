#!/usr/bin/env node
/**
 * PCC API 更新延遲監控器
 *
 * 功能：每隔固定時間檢查 g0v PCC API 的最新資料時間，
 *       當偵測到新資料時，記錄「公告日期」vs「偵測時間」的差距。
 *
 * 用法：
 *   node pcc-monitor/monitor.mjs              # 前台持續執行（每 4 小時檢查一次）
 *   node pcc-monitor/monitor.mjs --once       # 只跑一次就結束
 *   node pcc-monitor/monitor.mjs --interval 2 # 每 2 小時檢查一次
 *
 * 記錄檔：pcc-monitor/update-log.jsonl（每行一筆 JSON）
 */

import { readFile, appendFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, "update-log.jsonl");
const STATE_FILE = join(__dirname, "state.json");
const API_URL = "https://pcc-api.openfun.app/api/getinfo";

// ── 參數解析 ──
const args = process.argv.slice(2);
const once = args.includes("--once");
const intervalIdx = args.indexOf("--interval");
const intervalHours = intervalIdx !== -1 ? Number(args[intervalIdx + 1]) : 4;
const INTERVAL_MS = intervalHours * 60 * 60 * 1000;

// ── 工具函式 ──
function now() {
  return new Date().toISOString();
}

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

async function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function appendLog(entry) {
  await appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

async function fetchInfo() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

// ── 主邏輯 ──
async function check() {
  const checkTime = now();
  console.log(`[${checkTime}] 檢查 PCC API...`);

  let info;
  try {
    info = await fetchInfo();
  } catch (err) {
    console.error(`  ✗ API 請求失敗: ${err.message}`);
    await appendLog({
      type: "error",
      time: checkTime,
      error: err.message,
    });
    return;
  }

  const latestDataTime = info["最新資料時間"];
  const totalRecords = info["公告數"];

  console.log(`  最新資料時間: ${latestDataTime}`);
  console.log(`  總公告數: ${totalRecords.toLocaleString()}`);

  const prev = await loadState();

  if (!prev) {
    // 第一次執行
    console.log("  ℹ 首次執行，建立基準狀態");
    await saveState({ latestDataTime, totalRecords, lastCheckTime: checkTime });
    await appendLog({
      type: "init",
      time: checkTime,
      latestDataTime,
      totalRecords,
    });
    return;
  }

  if (latestDataTime !== prev.latestDataTime) {
    // 偵測到新資料！
    const dataDate = new Date(latestDataTime);
    const detectDate = new Date(checkTime);
    const delayMs = detectDate.getTime() - dataDate.getTime();
    const newRecords = totalRecords - prev.totalRecords;

    console.log(`  ★ 偵測到更新！`);
    console.log(`    舊: ${prev.latestDataTime}`);
    console.log(`    新: ${latestDataTime}`);
    console.log(`    延遲上限: ${formatDuration(delayMs)}`);
    console.log(`    新增公告: ${newRecords.toLocaleString()} 筆`);
    console.log(`    上次檢查: ${prev.lastCheckTime}`);

    await appendLog({
      type: "update_detected",
      time: checkTime,
      previousDataTime: prev.latestDataTime,
      newDataTime: latestDataTime,
      previousCheckTime: prev.lastCheckTime,
      delayUpperBoundMs: delayMs,
      delayUpperBound: formatDuration(delayMs),
      // 精確延遲介於 (上次檢查到現在) 和 (資料日期到現在) 之間
      delayWindowMs: [
        detectDate.getTime() - new Date(prev.lastCheckTime).getTime(),
        delayMs,
      ],
      newRecords,
      totalRecords,
    });

    await saveState({ latestDataTime, totalRecords, lastCheckTime: checkTime });
  } else {
    // 無變化
    console.log(`  — 無更新（與上次相同）`);
    await appendLog({
      type: "no_change",
      time: checkTime,
      latestDataTime,
      totalRecords,
    });
    await saveState({ ...prev, lastCheckTime: checkTime });
  }
}

// ── 執行 ──
console.log("╔═══════════════════════════════════════╗");
console.log("║   PCC API 更新延遲監控器              ║");
console.log("╚═══════════════════════════════════════╝");
console.log(`模式: ${once ? "單次" : `持續（每 ${intervalHours} 小時）`}`);
console.log(`記錄: ${LOG_FILE}`);
console.log("");

await check();

if (!once) {
  console.log(`\n下次檢查: ${new Date(Date.now() + INTERVAL_MS).toLocaleString("zh-TW")}`);
  setInterval(async () => {
    await check();
    console.log(`\n下次檢查: ${new Date(Date.now() + INTERVAL_MS).toLocaleString("zh-TW")}`);
  }, INTERVAL_MS);
}
