/**
 * PCC API 更新延遲監控 — Google Apps Script 版
 *
 * 設定步驟：
 * 1. 前往 https://script.google.com → 新增專案
 * 2. 把這整段程式碼貼上去（取代原本的 myFunction）
 * 3. 先手動執行一次 checkPccApi()（會要求授權 Google Sheets）
 * 4. 點左側「觸發條件」(鬧鐘圖示) → 新增觸發條件：
 *    - 選擇函式：checkPccApi
 *    - 事件來源：時間驅動
 *    - 類型：每小時
 *    - 間隔：每 4 小時
 * 5. 儲存，完成！
 *
 * 記錄會自動寫到一個叫「PCC API Monitor」的 Google Sheet。
 */

const SHEET_NAME = "PCC API Monitor";
const API_URL = "https://pcc-api.openfun.app/api/getinfo";

/**
 * 主函式 — 由觸發條件自動呼叫
 */
function checkPccApi() {
  const sheet = getOrCreateSheet();
  const now = new Date();
  const nowStr = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  // 呼叫 API
  let info;
  try {
    const response = UrlFetchApp.fetch(API_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      appendRow(sheet, [nowStr, "ERROR", "", "", "", response.getResponseCode()]);
      return;
    }
    info = JSON.parse(response.getContentText());
  } catch (e) {
    appendRow(sheet, [nowStr, "ERROR", "", "", "", e.message]);
    return;
  }

  const latestDataTime = info["最新資料時間"];        // e.g. "2026-02-13T00:00:00+08:00"
  const totalRecords = info["公告數"];

  // 取得上次記錄的最新資料時間
  const lastRow = sheet.getLastRow();
  const prevDataTime = lastRow > 1 ? sheet.getRange(lastRow, 3).getValue() : "";

  // 計算延遲
  const dataDate = new Date(latestDataTime);
  const delayMs = now.getTime() - dataDate.getTime();
  const delayHours = Math.round(delayMs / 3600000 * 10) / 10;

  // 判斷是否有更新
  let status;
  let newRecords = "";
  if (prevDataTime === "") {
    status = "INIT";
  } else if (latestDataTime !== prevDataTime) {
    status = "UPDATE";
    // 嘗試取得上一筆的 totalRecords
    const prevTotal = lastRow > 1 ? sheet.getRange(lastRow, 4).getValue() : 0;
    newRecords = totalRecords - prevTotal;
  } else {
    status = "NO_CHANGE";
  }

  // 寫入記錄
  appendRow(sheet, [
    nowStr,               // A: 檢查時間
    status,               // B: 狀態
    latestDataTime,       // C: API 最新資料時間
    totalRecords,         // D: 總公告數
    delayHours + " hr",   // E: 延遲上限（小時）
    newRecords,           // F: 新增筆數
  ]);

  // 如果偵測到更新，發 email 通知
  if (status === "UPDATE") {
    try {
      const email = Session.getActiveUser().getEmail();
      if (email) {
        MailApp.sendEmail({
          to: email,
          subject: `[PCC Monitor] API 資料更新至 ${latestDataTime.slice(0, 10)}`,
          body: [
            `偵測時間: ${nowStr}`,
            `新資料日期: ${latestDataTime}`,
            `舊資料日期: ${prevDataTime}`,
            `延遲上限: ${delayHours} 小時`,
            `新增公告: ${newRecords} 筆`,
            `總公告數: ${totalRecords.toLocaleString()}`,
            "",
            `查看完整記錄: ${sheet.getParent().getUrl()}`,
          ].join("\n"),
        });
      }
    } catch (e) {
      // email 失敗不影響記錄
    }
  }
}

/**
 * 取得或建立 Google Sheet
 */
function getOrCreateSheet() {
  const files = DriveApp.getFilesByName(SHEET_NAME);
  let ss;

  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    const sheet = ss.getActiveSheet();
    // 建立表頭
    sheet.appendRow([
      "檢查時間",
      "狀態",
      "API 最新資料時間",
      "總公告數",
      "延遲上限",
      "新增筆數",
    ]);
    // 格式化表頭
    const headerRange = sheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
    // 欄寬
    sheet.setColumnWidth(1, 180); // 檢查時間
    sheet.setColumnWidth(2, 100); // 狀態
    sheet.setColumnWidth(3, 260); // API 時間
    sheet.setColumnWidth(4, 120); // 總數
    sheet.setColumnWidth(5, 100); // 延遲
    sheet.setColumnWidth(6, 100); // 新增
  }

  return ss.getActiveSheet();
}

/**
 * 加一行並標色
 */
function appendRow(sheet, values) {
  sheet.appendRow(values);
  const row = sheet.getLastRow();
  const status = values[1];

  // 狀態欄標色
  const statusCell = sheet.getRange(row, 2);
  if (status === "UPDATE") {
    statusCell.setBackground("#d4edda").setFontColor("#155724"); // 綠
  } else if (status === "ERROR") {
    statusCell.setBackground("#f8d7da").setFontColor("#721c24"); // 紅
  } else if (status === "INIT") {
    statusCell.setBackground("#d1ecf1").setFontColor("#0c5460"); // 藍
  }
}

/**
 * 手動分析延遲統計（在 Apps Script 裡執行此函式查看 log）
 */
function analyzeDelays() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  const updates = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === "UPDATE") {
      updates.push({
        time: data[i][0],
        dataTime: data[i][2],
        delay: data[i][4],
        newRecords: data[i][5],
      });
    }
  }

  Logger.log("=== PCC API 更新延遲分析 ===");
  Logger.log(`總檢查次數: ${data.length - 1}`);
  Logger.log(`偵測到更新: ${updates.length} 次`);

  if (updates.length > 0) {
    Logger.log("\n每次更新:");
    updates.forEach((u) => {
      Logger.log(`  ${u.time} | 資料: ${u.dataTime} | 延遲: ${u.delay} | +${u.newRecords} 筆`);
    });
  } else {
    Logger.log("尚未偵測到更新，需要更多資料。");
  }
}
