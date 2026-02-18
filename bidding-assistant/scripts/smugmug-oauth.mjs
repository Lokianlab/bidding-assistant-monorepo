/**
 * SmugMug OAuth 1.0a 授權工具
 *
 * 用法：
 *   node scripts/smugmug-oauth.mjs
 *
 * 執行後會引導你完成 OAuth 授權，取得 Access Token 和 Token Secret
 */

import OAuth from "oauth-1.0a";
import crypto from "crypto";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const SMUGMUG_REQUEST_TOKEN_URL = "https://api.smugmug.com/services/oauth/1.0a/getRequestToken";
const SMUGMUG_AUTHORIZE_URL = "https://api.smugmug.com/services/oauth/1.0a/authorize";
const SMUGMUG_ACCESS_TOKEN_URL = "https://api.smugmug.com/services/oauth/1.0a/getAccessToken";

async function main() {
  console.log("\n========================================");
  console.log("  SmugMug OAuth 1.0a 授權工具");
  console.log("========================================\n");

  // Step 1: Get API Key and Secret from user
  const apiKey = (await ask("請輸入你的 API Key (Consumer Key): ")).trim();
  const apiSecret = (await ask("請輸入你的 API Secret (Consumer Secret): ")).trim();

  if (!apiKey || !apiSecret) {
    console.error("\n API Key 和 API Secret 不可為空！");
    rl.close();
    process.exit(1);
  }

  // Create OAuth instance
  const oauth = new OAuth({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  try {
    // Step 2: Get Request Token
    console.log("\n[1/3] 正在取得 Request Token...");

    const requestData = {
      url: SMUGMUG_REQUEST_TOKEN_URL,
      method: "GET",
      data: { oauth_callback: "oob" },
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const reqTokenRes = await fetch(
      `${SMUGMUG_REQUEST_TOKEN_URL}?oauth_callback=oob`,
      {
        method: "GET",
        headers: { Authorization: authHeader.Authorization },
      }
    );

    if (!reqTokenRes.ok) {
      const errText = await reqTokenRes.text();
      throw new Error(`取得 Request Token 失敗 (${reqTokenRes.status}): ${errText}`);
    }

    const reqTokenText = await reqTokenRes.text();
    const reqTokenParams = new URLSearchParams(reqTokenText);
    const oauthToken = reqTokenParams.get("oauth_token");
    const oauthTokenSecret = reqTokenParams.get("oauth_token_secret");

    if (!oauthToken || !oauthTokenSecret) {
      throw new Error(`回應格式異常: ${reqTokenText}`);
    }

    console.log("   Request Token 取得成功！\n");

    // Step 3: User authorizes
    const authorizeUrl = `${SMUGMUG_AUTHORIZE_URL}?oauth_token=${oauthToken}&Access=Full&Permissions=Read`;

    console.log("[2/3] 請在瀏覽器中打開以下網址，登入並授權：");
    console.log("─────────────────────────────────────────");
    console.log(authorizeUrl);
    console.log("─────────────────────────────────────────\n");
    console.log("授權完成後，SmugMug 會顯示一組 6 位數驗證碼。\n");

    const verifier = (await ask("請輸入驗證碼 (6 位數): ")).trim();

    if (!verifier) {
      console.error("\n 驗證碼不可為空！");
      rl.close();
      process.exit(1);
    }

    // Step 4: Exchange for Access Token
    console.log("\n[3/3] 正在交換 Access Token...");

    const accessData = {
      url: SMUGMUG_ACCESS_TOKEN_URL,
      method: "GET",
      data: { oauth_verifier: verifier },
    };

    const token = { key: oauthToken, secret: oauthTokenSecret };
    const accessAuthHeader = oauth.toHeader(
      oauth.authorize(accessData, token)
    );

    const accessRes = await fetch(
      `${SMUGMUG_ACCESS_TOKEN_URL}?oauth_verifier=${verifier}`,
      {
        method: "GET",
        headers: { Authorization: accessAuthHeader.Authorization },
      }
    );

    if (!accessRes.ok) {
      const errText = await accessRes.text();
      throw new Error(`交換 Access Token 失敗 (${accessRes.status}): ${errText}`);
    }

    const accessText = await accessRes.text();
    const accessParams = new URLSearchParams(accessText);
    const accessToken = accessParams.get("oauth_token");
    const tokenSecret = accessParams.get("oauth_token_secret");

    if (!accessToken || !tokenSecret) {
      throw new Error(`回應格式異常: ${accessText}`);
    }

    // Step 5: Display results
    console.log("\n========================================");
    console.log("  授權成功！請複製以下值到系統設定中");
    console.log("========================================\n");
    console.log(`  Access Token:  ${accessToken}`);
    console.log(`  Token Secret:  ${tokenSecret}`);
    console.log("\n========================================");
    console.log("\n請到系統「設定 > 連線管理」頁面，");
    console.log("把以上兩個值填入 SmugMug 設定欄位中。\n");

  } catch (err) {
    console.error(`\n 錯誤：${err.message}\n`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
