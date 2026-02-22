#!/usr/bin/env node

/**
 * 知識庫初始化 Phase 1：B 資料夾快速去重
 *
 * 功能：刪除所有檔名含「複製」的檔案，保留最新版本
 * 成本：1-2 分鐘執行時間
 * 預期削減：~1,318 個檔案（7%）
 *
 * 使用：
 *   node phase1-dedup.js --source "H:/path/to/B.備標集中區" --dry-run
 *   node phase1-dedup.js --source "H:/path/to/B.備標集中區" --execute
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
知識庫初始化 Phase 1：B 資料夾去重

用法：
  node phase1-dedup.js --source "H:/path/to/B.備標集中區" [--dry-run | --execute] [--output log.txt]

選項：
  --source, -s <path>    來源資料夾路徑（必要）
  --dry-run              試運行模式，不實際刪除（預設）
  --execute              實際執行刪除操作
  --output, -o <file>    輸出日誌檔案（預設: kb-import-phase1.log）
  --help, -h             顯示此說明

範例：
  # 試運行
  node phase1-dedup.js --source "H:/test" --dry-run

  # 實際執行
  node phase1-dedup.js --source "H:/test" --execute --output result.log
  `);
  process.exit(0);
}

if (!args.source) {
  console.error('❌ 錯誤：必須指定 --source 參數');
  process.exit(1);
}

const MODE = args.execute ? 'EXECUTE' : 'DRY-RUN';
const SOURCE = args.source;
const LOG_FILE = args.output || 'kb-import-phase1.log';
const STOPWATCH = { start: Date.now() };

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

// ────────────────────────────────────────
// Phase 1：檔名標記去重
// ────────────────────────────────────────

function findDuplicatesByFilename(files) {
  const duplicates = files.filter(f => /複製|副本|copy/i.test(f.name));
  return duplicates;
}

function groupByBaseName(files) {
  const groups = {};

  for (const file of files) {
    // 移除版本標記後的基底檔名
    const baseName = file.name
      .replace(/[-\s]*(複製|副本|copy|v\d+|版本\d+|老闆|草稿|定稿)[-\s]*/gi, '')
      .replace(/\.[^.]+$/, '');

    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(file);
  }

  return groups;
}

// ────────────────────────────────────────
// 主程序
// ────────────────────────────────────────

async function main() {
  try {
    log(`========== 知識庫初始化 Phase 1 開始 ==========`);
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

    // Step 3：找出標記的重複檔案
    log('尋找標記的重複檔案...');
    const markedDuplicates = findDuplicatesByFilename(allFiles);
    log(`找到 ${markedDuplicates.length} 個標記為複製的檔案`);

    // Step 4：按基底名稱分組
    log('按基底檔名分組...');
    const groups = groupByBaseName(allFiles);

    // Step 5：決定刪除清單
    const toDelete = [];
    for (const [baseName, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // 保留最新的，其他全刪
        group.sort((a, b) => b.mtime - a.mtime);
        toDelete.push(...group.slice(1));
      }
    }

    log(`清單準備：${toDelete.length} 個檔案待刪除`);

    // Step 6：顯示預覽
    if (toDelete.length > 0) {
      log('\n將刪除的檔案（前 10 個）：');
      toDelete.slice(0, 10).forEach(f => {
        log(`  - ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
      });
      if (toDelete.length > 10) {
        log(`  ... 及其他 ${toDelete.length - 10} 個檔案`);
      }
    }

    // Step 7：執行或試運行
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

    // Step 8：報告
    const elapsed = ((Date.now() - STOPWATCH.start) / 1000).toFixed(1);
    log(`\n========== 報告 ==========`);
    log(`總檔案數：${allFiles.length}`);
    log(`標記為複製：${markedDuplicates.length}`);
    log(`待刪除（版本舊）：${toDelete.length}`);
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
