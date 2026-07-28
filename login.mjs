// Self-contained Cloudflare OAuth login + Pages deploy
// Usage: node login.mjs
import http from "http";
import crypto from "crypto";
import { execSync } from "child_process";

const CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const REDIRECT_URI = "http://localhost:8976/oauth/callback";
const PORT = 8976;

const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

const state = crypto.randomBytes(16).toString("hex");
const authUrl = `https://dash.cloudflare.com/oauth2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent("account:read user:read workers:write workers_kv:write workers_routes:write workers_scripts:write workers_tail:read d1:write pages:write zone:read ssl_certs:write ai:write queues:write pipelines:write offline_access")}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

console.log("\n🔐 Cloudflare 授权\n");
console.log("请复制以下链接在浏览器中打开：\n");
console.log(authUrl + "\n");
console.log("等待授权回调...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/oauth/callback") {
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (returnedState !== state) {
      res.writeHead(400);
      res.end("State mismatch");
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end("No code received");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<html><body style='font-family:sans-serif;text-align:center;padding-top:80px'><h1 style='color:green'>✅ 授权成功！</h1><p>可以关闭此页面，回到 Accio Work 继续。</p></body></html>",
    );

    server.close();

    // Exchange code for token
    console.log("📡 交换 token...\n");
    try {
      const tokenResponse = await fetch(
        "https://dash.cloudflare.com/oauth2/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            code,
            code_verifier: codeVerifier,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
          }),
        },
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        console.log("✅ Token 获取成功！\n");
        console.log(`CLOUDFLARE_API_TOKEN=${tokenData.access_token}\n`);

        // Deploy!
        console.log("🚀 开始部署到 Cloudflare Pages...\n");
        const env = { ...process.env };
        env.CLOUDFLARE_API_TOKEN = tokenData.access_token;
        env.CI = "1";

        execSync("npx wrangler pages deploy dist --project-name=sdnfaucet", {
          cwd: new URL(".", import.meta.url).pathname,
          env,
          stdio: "inherit",
        });

        console.log("\n✅ 部署完成！");
        console.log("🔗 https://sdnfaucet.pages.dev");
        process.exit(0);
      } else {
        console.error("❌ Token 交换失败:", JSON.stringify(tokenData));
        process.exit(1);
      }
    } catch (e) {
      console.error("❌ Token 交换出错:", e.message);
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`监听端口 ${PORT}...`);
});

// Timeout after 3 minutes
setTimeout(() => {
  console.error("\n⏰ 超时，请重试。");
  server.close();
  process.exit(1);
}, 180000);
