import OAuth from "oauth-1.0a";
import crypto from "crypto";

const apiKey = "mDcd2S9sKDLQMMQBSdT6n75dGRjr9VRr";
const apiSecret = "5CSXFFB3hxqJPb7X29xsht5hpwRZfhDDRpkxGcRgDSZHcDW5pt9hvKfxCfrT3754";

const requestToken = "5zgXtZtptB8KSnZF3PZqN2Km24grwr5D";
const requestSecret = "LVFrM6JhcRfsq3QnHkqbjfT46J3PvpHK393khvTjQWrDX33kb7Qq9TLXZ7FspbCb";
const verifier = "130398";

const oauth = new OAuth({
  consumer: { key: apiKey, secret: apiSecret },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  },
});

const accessData = {
  url: "https://api.smugmug.com/services/oauth/1.0a/getAccessToken",
  method: "GET",
  data: { oauth_verifier: verifier },
};

const token = { key: requestToken, secret: requestSecret };
const authHeader = oauth.toHeader(oauth.authorize(accessData, token));

const res = await fetch(
  "https://api.smugmug.com/services/oauth/1.0a/getAccessToken?oauth_verifier=" + verifier,
  { method: "GET", headers: { Authorization: authHeader.Authorization } }
);

if (!res.ok) {
  console.error("失敗:", res.status, await res.text());
  process.exit(1);
}

const text = await res.text();
const params = new URLSearchParams(text);
const accessToken = params.get("oauth_token");
const tokenSecret = params.get("oauth_token_secret");

console.log("========================================");
console.log("  授權成功！");
console.log("========================================");
console.log("");
console.log("  Access Token:  " + accessToken);
console.log("  Token Secret:  " + tokenSecret);
console.log("");
console.log("========================================");
console.log("請到 http://localhost:3000/settings/connections");
console.log("把以上兩個值填入 SmugMug 設定欄位中。");
