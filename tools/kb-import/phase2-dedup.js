#!/usr/bin/env node

/**
 * 知識庫初始化 Phase 2：B 資料夾案件層去重
 *
 * 功能：按案件編號 + 修改時間去重，保留每個案件的最新版本
 * 成本：5-10 分鐘執行時間
 * 預期削減：~15%（~2,700 個檔案）
 *
 * 案件編號模式識別：
 *   (BID-18537) | (148) | (145920) 等
 *
 * 使用：
 *   node phase2-dedup.js --source "H:/path/to/B.備標集中區" --dry-run
 *   node phase2-dedup.js --source "H:/path/to/B.備標集中區" --execute
 */

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

// ────────────────────────────────────────
// 設置與驗證
// ────────────────────────────────────────

const options = {
  source: { type: 'string', short: 's', description: '來源資料夾路徑' },
  'dry-run': { type: 'boolean', description: '試運行模式（預設）' },
  execute: { type: 'boolean', description: '實際執行刪除' },
  output: { type: 'string', short: 'o', description: '日誌輸出檔案' },
  help: { type: 'boolean', short: 'h', description: '顯示說明' },
};

const { values: args, tokens: positionals } = parseArgs({ options, strict: true, allowPositionals: true });

if (args.help) {
  console.log(`
知識庫初始化 Phase 2：B 資料夾案件層去重

用法：
  node phase2-dedup.js --source "H:/path/to/B.備標集中區" [--dry-run | --execute] [--output log.txt]

說明：
  按案件編號分組，每組內只保留修改時間最新的檔案

選項：
  --source, -s <path>    來源資料夾路徑（必要）
  --dry-run              試運行模式，不實際刪除（預設）
  --execute              實際執行刪除操作
  --output, -o <file>    輸出日誌檔案（預設: kb-import-phase2.log）
  --help, -h             顯示此說明

範例：
  # 試運行
  node phase2-dedup.js --source "H:/test" --dry-run

  # 實際執行
  node phase2-dedup.js --source "H:/test" --execute --output result.log
  `);
  process.exit(0);
}

if (!args.source) {
  console.error('❌ 錯誤：必須指定 --source 參數');
  process.exit(1);
}

const MODE = args.execute ? 'EXECUTE' : 'DRY-RUN';
const SOURCE = args.source;
const LOG_FILE = args.output || 'kb-import-phase2.log';
const STOPWATCH = { start: Date.now() };

// 案件編號正則模式
const CASE_ID_PATTERN = /\(([A-Z]+-?\d+|BID-?\d+|\d{5,6})\)/;

// ────────────────────────────────────────
// 工具函式
// ────────────────────────────────────────

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push({
        name: entry.name,
        fullPath,
        mtime: fs.statSync(fullPath).mtime,
        size: fs.statSync(fullPath).size,
      });
    }
  }
  return files;
}

function extractCaseId(filename) {
  const match = filename.match(CASE_ID_PATTERN);
  return match ? match[1] : 'UNKNOWN';
}

function normalizeFileName(name) {
  return name
    .replace(/[-\s]*(複製|副本|copy|v\d+|版本\d+|老闆|草稿|定稿|簽字版|建議書|提案|AI草稿)[-\s]*/gi, '')
    .replace(/\.[^.]+$/, '');
}

// ────────────────────────────────────────
// Phase 2：案件層去重
// ────────────────────────────────────────

function groupByCase(files) {
  const groups = {};

  for (const file of files) {
    const caseId = extractCaseId(file.name);
    const baseName = normalizeFileName(file.name);
    const key = `${caseId}::${baseName}`;

    if (!groups[key]) groups[key] = [];
    groups[key].push(file);
  }

  return groups;
}

// ────────────────────────────────────────
// 主程序
// ────────────────────────────────────────

async function main() {
  try {
    log(`========== 知識庫初始化 Phase 2 開始 ==========`);
    log(`模式：${MODE}`);
    log(`來源：${SOURCE}`);
    log(`日誌：${LOG_FILE}`);

    // Step 1：驗證來源
    if (!fs.existsSync(SOURCE)) {
      throw new Error(`來源資料夾不存在：${SOURCE}`);
    }

    log('✓ 來源資料夾驗證通過');

    // Step 2：掃描檔案
    log('掃描中...');
    const allFiles = walkDir(SOURCE);
    log(`✓ 掃描完成：${allFiles.length} 個檔案`);

    // Step 3：按案件分組
    log('按案件編號分組...');
    const groups = groupByCase(allFiles);
    log(`✓ 分組完成：${Object.keys(groups).length} 個獨立案件`);

    // Step 4：決定刪除清單
    const toDelete = [];
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // 保留最新的，其他全刪
        group.sort((a, b) => b.mtime - a.mtime);
        const kept = group[0];
        const removed = group.slice(1);
        toDelete.push(...removed);

        if (toDelete.length <= 20) {
          log(`  ${key}: 保留 ${kept.name}（${new Date(kept.mtime).toISOString().split('T')[0]}），刪除 ${removed.length} 個舊版本`);
        }
      }
    }

    log(`\n清單準備：${toDelete.length} 個重複版本待刪除`);

    // Step 5：執行或試運行
    if (MODE === 'EXECUTE') {
      log('\n⚠️  開始刪除...');
      let deleted = 0;
      for (const file of toDelete) {
        try {
          fs.unlinkSync(file.fullPath);
          deleted++;
        } catch (err) {
          log(`❌ 刪除失敗：${file.name} - ${err.message}`);
        }
      }
      log(`✓ 刪除完成：${deleted}/${toDelete.length} 成功`);
    } else {
      log('\n[DRY-RUN] 未實際執行刪除操作');
    }

    // Step 6：報告
    const elapsed = ((Date.now() - STOPWATCH.start) / 1000).toFixed(1);
    log(`\n========== 報告 ==========`);
    log(`總檔案數：${allFiles.length}`);
    log(`獨立案件：${Object.keys(groups).length}`);
    log(`有重複版本的案件：${Object.values(groups).filter(g => g.length > 1).length}`);
    log(`待刪除（舊版本）：${toDelete.length}`);
    if (MODE === 'EXECUTE') {
      log(`實際刪除：${toDelete.length}`);
      log(`剩餘檔案：${allFiles.length - toDelete.length}`);
    }
    log(`耗時：${elapsed} 秒`);
    log(`========== 完成 ==========\n`);

  } catch (err) {
    console.error('❌ 錯誤：', err.message);
    log(`❌ 錯誤：${err.message}`);
    process.exit(1);
  }
}

main();
