/**
 * 取得 Google OAuth2 Refresh Token（手動貼授權碼版）
 *
 * 使用方式：
 * 1. 執行：npx tsx scripts/get-google-token.ts
 * 2. 瀏覽器打開授權頁面，登入 Google 帳號並同意
 * 3. Google 會導回一個頁面（可能顯示錯誤頁面沒關係），看瀏覽器網址列
 * 4. 從 URL 複製 code=XXXXX 的部分，貼回 terminal
 * 5. 腳本會換成 refresh_token 印出來
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { exec } from 'child_process';
import { createInterface } from 'readline';

// 載入 .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// redirect_uri 必須跟 Cloud Console 設定的一致
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('錯誤：請先在 .env.local 填入 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

// Step 1: 產生授權 URL 並打開瀏覽器
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== Google OAuth2 授權 ===\n');
console.log('正在打開瀏覽器...');
console.log('登入 Google 並同意後，瀏覽器會跳到一個頁面（可能顯示錯誤，沒關係）。\n');
console.log('看瀏覽器的網址列，會像這樣：');
console.log('http://localhost:3000/api/auth/callback/google?code=4/0AXXXX...&scope=...\n');
console.log('把整個網址貼回這裡：\n');

const openCmd = process.platform === 'win32' ? 'start' :
                process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${openCmd} "${authUrl.toString()}"`);

// Step 2: 等用戶貼回 URL 或 code
const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('> ', async (input) => {
  rl.close();

  // 從 URL 或純 code 中提取 authorization code
  let code = input.trim();
  if (code.includes('code=')) {
    const url = new URL(code);
    code = url.searchParams.get('code') ?? '';
  }

  if (!code) {
    console.error('\n找不到授權碼。請確認你貼的是完整網址。');
    process.exit(1);
  }

  // Step 3: 用 code 換 tokens
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await res.json() as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokens.error) {
      console.error(`\n換 token 失敗：${tokens.error_description}`);
      process.exit(1);
    }

    console.log('\n✅ 授權成功！\n');
    console.log('=== 請把以下值貼進 .env.local ===\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n錯誤：', err);
    process.exit(1);
  }
});
