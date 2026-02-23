/**
 * Google Apps Script — 巡標自動建資料夾
 *
 * 使用方式：
 * 1. 打開 Google Drive → 新增 → 更多 → Google Apps Script
 * 2. 把這段程式碼貼上去（取代原本的 Code.gs）
 * 3. 修改下方 CONFIG 裡的兩個 ID（看註解說明怎麼找）
 * 4. 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *    - 執行身分：我自己
 *    - 存取權：任何人
 * 5. 複製部署 URL，貼進 bidding-assistant/.env.local 的 GOOGLE_APPS_SCRIPT_URL
 *
 * 安全性：URL 含有不可猜測的部署 ID，加上我們再驗一個 secret token。
 */

// ============================================================
// 你需要改的設定
// ============================================================

const CONFIG = {
  // 「B. 備標集中區」的資料夾 ID
  // 怎麼找：在 Google Drive 打開這個資料夾，看網址列
  // https://drive.google.com/drive/folders/XXXXXX ← 這個 XXXXXX 就是
  PARENT_FOLDER_ID: '請貼上你的資料夾ID',

  // 自訂密碼（隨便打一串，跟 .env.local 裡的 APPS_SCRIPT_SECRET 一樣就好）
  SECRET: '請換成你自己的密碼',

  // 範本子資料夾（新案件資料夾裡會自動建這些）
  TEMPLATE_SUBFOLDERS: [
    '服務建議書',
    '備標評估文件',
  ],
};

// ============================================================
// Webhook 入口（不用改）
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // 驗證密碼
    if (body.secret !== CONFIG.SECRET) {
      return jsonResponse({ success: false, error: '驗證失敗' }, 403);
    }

    const { caseUniqueId, publishDate, title } = body;

    if (!caseUniqueId || !title || !publishDate) {
      return jsonResponse({
        success: false,
        error: '缺少必要欄位（caseUniqueId, title, publishDate）',
      }, 400);
    }

    // 轉換日期為民國年格式
    const rocDate = toROCDate(publishDate);
    const folderName = '(' + caseUniqueId + ')(' + rocDate + ')' + title.trim();

    // 建主資料夾
    const parent = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    const mainFolder = parent.createFolder(folderName);

    // 建子資料夾
    CONFIG.TEMPLATE_SUBFOLDERS.forEach(function(name) {
      mainFolder.createFolder(name);
    });

    return jsonResponse({
      success: true,
      folderId: mainFolder.getId(),
      folderUrl: mainFolder.getUrl(),
      folderName: folderName,
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

// 也支援 GET（測試用）
function doGet() {
  return jsonResponse({ status: 'ok', message: '巡標 Drive 建資料夾服務運行中' });
}

// ============================================================
// 工具函式（不用改）
// ============================================================

function toROCDate(isoDate) {
  // 接受 "2026-02-22" 或 "2026-02-22T08:00:00Z"
  var d = new Date(isoDate);
  var year = d.getFullYear() - 1911;
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return year + '.' + month + '.' + day;
}

function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
