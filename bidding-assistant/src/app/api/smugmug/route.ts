// ====== SmugMug API 路由 ======
// 代理前端對 SmugMug API v2 的請求（需要 server-side OAuth 1.0a 簽名）

import { NextRequest, NextResponse } from "next/server";
import OAuth from "oauth-1.0a";
import CryptoJS from "crypto-js";

const SMUGMUG_API_BASE = "https://api.smugmug.com";

/** 建立 OAuth 1.0a 簽名器 */
function createOAuth(apiKey: string, apiSecret: string) {
  return new OAuth({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
    },
  });
}

/** 帶 OAuth 簽名的 GET 請求 */
async function smugmugGet(
  url: string,
  oauth: OAuth,
  token: { key: string; secret: string }
) {
  const requestData = { url, method: "GET" };
  const oauthHeader = oauth.toHeader(oauth.authorize(requestData, token));
  const headers: Record<string, string> = {
    Authorization: oauthHeader.Authorization,
    Accept: "application/json",
  };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SmugMug API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, apiKey, apiSecret, accessToken, tokenSecret } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "缺少 SmugMug API Key 或 Secret" },
        { status: 400 }
      );
    }

    const oauth = createOAuth(apiKey, apiSecret);
    const token = { key: accessToken || "", secret: tokenSecret || "" };

    // ====== 動作分流 ======

    switch (action) {
      // 1. 測試連線：取得登入使用者資訊
      case "test": {
        if (!accessToken || !tokenSecret) {
          return NextResponse.json(
            { error: "缺少 Access Token，請先完成 OAuth 授權" },
            { status: 400 }
          );
        }
        const data = await smugmugGet(
          `${SMUGMUG_API_BASE}/api/v2!authuser`,
          oauth,
          token
        );
        const user = data?.Response?.User;
        return NextResponse.json({
          success: true,
          nickname: user?.NickName || "",
          displayName: user?.Name || "",
          webUri: user?.WebUri || "",
        });
      }

      // 2. 列出使用者的相簿
      case "listAlbums": {
        const nickname = body.nickname;
        if (!nickname) {
          return NextResponse.json({ error: "缺少 nickname" }, { status: 400 });
        }
        const pageSize = body.pageSize || 50;
        const start = body.start || 1;
        const url = `${SMUGMUG_API_BASE}/api/v2/user/${nickname}!albums?count=${pageSize}&start=${start}&_verbosity=1`;
        const data = await smugmugGet(url, oauth, token);
        const albums =
          data?.Response?.Album?.map((a: Record<string, unknown>) => ({
            albumKey: a.AlbumKey,
            title: a.Title || a.Name,
            imageCount: a.ImageCount,
            webUri: a.WebUri,
            urlPath: a.UrlPath,
          })) || [];
        const pages = data?.Response?.Pages || {};
        return NextResponse.json({
          success: true,
          albums,
          total: pages.Total || 0,
          start: pages.Start || 1,
          count: pages.Count || 0,
        });
      }

      // 3. 列出相簿中的照片
      case "listPhotos": {
        const albumKey = body.albumKey;
        if (!albumKey) {
          return NextResponse.json({ error: "缺少 albumKey" }, { status: 400 });
        }
        const count = body.count || 50;
        const start = body.start || 1;
        const url = `${SMUGMUG_API_BASE}/api/v2/album/${albumKey}!images?count=${count}&start=${start}&_verbosity=1`;
        const data = await smugmugGet(url, oauth, token);
        const images =
          data?.Response?.AlbumImage?.map((img: Record<string, unknown>) => ({
            imageKey: img.ImageKey,
            title: img.Title || "",
            caption: img.Caption || "",
            webUri: img.WebUri,
            thumbnailUrl: img.ThumbnailUrl,
            archivedUri: img.ArchivedUri,
            fileName: img.FileName,
          })) || [];
        const pages = data?.Response?.Pages || {};
        return NextResponse.json({
          success: true,
          images,
          total: pages.Total || 0,
          start: pages.Start || 1,
          count: pages.Count || 0,
        });
      }

      // 4. 取得單張照片的各尺寸 URL
      case "imageSizes": {
        const imageKey = body.imageKey;
        if (!imageKey) {
          return NextResponse.json({ error: "缺少 imageKey" }, { status: 400 });
        }
        const url = `${SMUGMUG_API_BASE}/api/v2/image/${imageKey}!sizedetails`;
        const data = await smugmugGet(url, oauth, token);
        const sizes = data?.Response?.ImageSizeDetails || {};
        return NextResponse.json({ success: true, sizes });
      }

      // 5. 以 API Key 匿名讀取公開相簿（不需要 OAuth access token）
      case "publicAlbum": {
        const albumKey = body.albumKey;
        if (!albumKey) {
          return NextResponse.json({ error: "缺少 albumKey" }, { status: 400 });
        }
        // 匿名存取只需要 consumer key
        const anonUrl = `${SMUGMUG_API_BASE}/api/v2/album/${albumKey}!images?count=100&APIKey=${apiKey}&_verbosity=1`;
        const res = await fetch(anonUrl, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: `SmugMug 回應 ${res.status}` },
            { status: res.status }
          );
        }
        const data = await res.json();
        const images =
          data?.Response?.AlbumImage?.map((img: Record<string, unknown>) => ({
            imageKey: img.ImageKey,
            title: img.Title || "",
            caption: img.Caption || "",
            webUri: img.WebUri,
            thumbnailUrl: img.ThumbnailUrl,
            archivedUri: img.ArchivedUri,
            fileName: img.FileName,
          })) || [];
        return NextResponse.json({
          success: true,
          images,
          total: data?.Response?.Pages?.Total || images.length,
        });
      }

      default:
        return NextResponse.json(
          { error: `未知的 action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SmugMug API Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
