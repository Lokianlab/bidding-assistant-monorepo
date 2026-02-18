import OAuth from "oauth-1.0a";
import crypto from "crypto";

const apiKey = "mDcd2S9sKDLQMMQBSdT6n75dGRjr9VRr";
const apiSecret = "5CSXFFB3hxqJPb7X29xsht5hpwRZfhDDRpkxGcRgDSZHcDW5pt9hvKfxCfrT3754";

const oauth = new OAuth({
  consumer: { key: apiKey, secret: apiSecret },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  },
});

const requestData = {
  url: "https://api.smugmug.com/services/oauth/1.0a/getRequestToken",
  method: "GET",
  data: { oauth_callback: "oob" },
};

const authHeader = oauth.toHeader(oauth.authorize(requestData));

const res = await fetch(
  "https://api.smugmug.com/services/oauth/1.0a/getRequestToken?oauth_callback=oob",
  { method: "GET", headers: { Authorization: authHeader.Authorization } }
);

if (!res.ok) {
  console.error("失敗:", res.status, await res.text());
  process.exit(1);
}

const text = await res.text();
const params = new URLSearchParams(text);
const oauthToken = params.get("oauth_token");
const oauthTokenSecret = params.get("oauth_token_secret");

console.log("REQUEST_TOKEN=" + oauthToken);
console.log("REQUEST_SECRET=" + oauthTokenSecret);
console.log("");
console.log("請在瀏覽器打開以下網址，登入並授權：");
console.log("https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=" + oauthToken + "&Access=Full&Permissions=Read");
