/**
 * 取得 Google OAuth2 Refresh Token
 *
 * 自動在 localhost:8080 開一個臨時 server 接收 Google 的 redirect，
 * 不需要手動複製 URL。
 *
 * 使用前：
 * 1. .env.local 填好 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET
 * 2. Google Cloud Console 加 redirect URI：http://localhost:8080
 *
 * 執行：npx tsx scripts/get-google-token.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { exec } from 'child_process';
import { createServer } from 'http';

// 載入 .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8080';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('錯誤：請先在 .env.local 填入 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

// Step 1: 開臨時 server 等 Google redirect
const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:8080`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>授權失敗</h1><p>${error}</p><p>請關閉此頁面。</p>`);
    console.error(`\n授權失敗：${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>找不到授權碼</h1>');
    return;
  }

  // Step 3: 用 code 換 tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

    const tokenText = await tokenRes.text();
    console.log(`\nToken endpoint HTTP ${tokenRes.status}`);
    console.log(`Response: ${tokenText}\n`);

    const tokens = JSON.parse(tokenText) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokens.error) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>換 token 失敗</h1><p>${tokens.error_description}</p>`);
      console.error(`換 token 失敗：${tokens.error} — ${tokens.error_description}`);
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>授權成功！</h1><p>可以關閉此頁面了。</p>');

    console.log('\n✅ 授權成功！\n');
    console.log('=== 請把以下值貼進 .env.local ===\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('================================\n');

    server.close();
    process.exit(0);

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>錯誤</h1>');
    console.error('\n錯誤：', err);
    server.close();
    process.exit(1);
  }
});

server.listen(8080, () => {
  // Step 2: 產生授權 URL 並打開瀏覽器
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\n=== Google OAuth2 授權 ===\n');
  console.log('瀏覽器打開後，登入 Google 並同意授權。');
  console.log('授權完成後這裡會自動顯示結果。\n');
  console.log('如果瀏覽器沒有自動打開，手動打開這個連結：');
  console.log(authUrl.toString());
  console.log('');

  const openCmd = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${openCmd} "${authUrl.toString()}"`);
});
