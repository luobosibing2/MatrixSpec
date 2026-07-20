import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const AUTH_FILE = path.join(os.homedir(), ".matspec/auth.json");
const FIVE_MINUTES = 5 * 60 * 1000;

export async function authCommand(options = {}, args = []) {
  const action = args[0] || "status";
  if (action === "logout") {
    fs.rmSync(AUTH_FILE, { force: true });
    return { ok: true, message: "已退出 MatSpec 云龙登录。" };
  }
  if (action === "status") {
    const auth = readAuth();
    return auth
      ? { ok: true, authenticated: !expired(auth), provider: auth.provider, accountId: auth.accountId, userName: auth.userName, expiresAt: auth.expiresAt }
      : { ok: true, authenticated: false, message: "尚未登录。" };
  }
  if (action !== "login") return fail("AUTH_COMMAND_USAGE", "用法：matspec auth login|status|logout");
  if (options.token) {
    const auth = saveTokens({ accessToken: options.token, refreshToken: "", expiresIn: 3600 * 24 * 30 });
    return { ok: true, authenticated: true, userName: auth.userName, expiresAt: auth.expiresAt };
  }
  return browserLogin(options);
}

export async function selectToken(options = {}, { allowInteractive = false } = {}) {
  if (options.token) return { token: options.token, source: "cli" };
  const auth = readAuth();
  if (auth && !expired(auth)) return { token: decryptToken(auth.access), source: "local", auth };
  if (process.env.MATSPEC_CODEWIKI_TOKEN) return { token: process.env.MATSPEC_CODEWIKI_TOKEN, source: "env" };
  if (auth?.refresh) {
    const refreshed = await refreshAccessToken(auth, options);
    if (refreshed.ok) return { token: refreshed.token, source: "refresh", auth: refreshed.auth };
  }
  if (allowInteractive && process.stdin.isTTY && !options.json) {
    const login = await browserLogin(options);
    if (login.ok) return { token: decryptToken(readAuth().access), source: "login", auth: readAuth() };
  }
  return fail("AUTH_REQUIRED", "需要 CodeWiki token；执行 matspec auth login。");
}

export function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", localKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(value) {
  if (!String(value || "").startsWith("v1:")) return String(value || "");
  const [, iv, tag, encrypted] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", localKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export function readAuth() {
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8")); } catch { return null; }
}

export function saveTokens({ accessToken, refreshToken, expiresIn = 3600, accountId, userName }) {
  const auth = {
    version: 1,
    provider: "yunlong-codewiki",
    ...(accountId ? { accountId } : {}),
    userName: userName || os.userInfo().username,
    access: encryptToken(accessToken),
    refresh: encryptToken(refreshToken || ""),
    expiresAt: Date.now() + Number(expiresIn) * 1000,
    updatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, `${JSON.stringify(auth, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try { fs.chmodSync(AUTH_FILE, 0o600); } catch {}
  return auth;
}

async function browserLogin(options) {
  const apiBase = process.env.MATSPEC_YUNLONG_API_BASE || "https://codeagentcli.rnd.huawei.com/codeAgentPro";
  const authBase = process.env.MATSPEC_YUNLONG_AUTH_BASE || apiBase;
  const state = crypto.randomBytes(16).toString("hex");
  const loginUrl = `${authBase.replace(/\/$/, "")}/oauth/authorize?client_id=${encodeURIComponent(process.env.MATSPEC_YUNLONG_CLIENT_ID || "com.huawei.devmind.codebot.apibot")}&scope=${encodeURIComponent(process.env.MATSPEC_YUNLONG_SCOPE || "1000:1002")}&resource=${encodeURIComponent(process.env.MATSPEC_YUNLONG_RESOURCE || "devuc")}&state=${state}`;
  if (!options.no_open) openBrowser(loginUrl);
  if (options.json && !options.auth_poll_attempts) {
    return { ok: false, code: "AUTH_LOGIN_PENDING", loginUrl, state, message: "请在浏览器完成登录后重试。" };
  }
  const attempts = Number(options.auth_poll_attempts || 1800);
  const interval = Number(options.auth_poll_interval_ms || 1000);
  const endpoint = process.env.MATSPEC_YUNLONG_POLL_URL || `${apiBase.replace(/\/$/, "")}/oauth/poll`;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.access_token || data.accessToken) {
          const auth = saveTokens({
            accessToken: data.access_token || data.accessToken,
            refreshToken: data.refresh_token || data.refreshToken,
            expiresIn: data.expires_in || data.expiresIn,
            accountId: data.account_id || data.accountId,
            userName: data.user_name || data.userName
          });
          return { ok: true, authenticated: true, userName: auth.userName, expiresAt: auth.expiresAt };
        }
      }
    } catch {}
    if (attempt + 1 < attempts) await delay(interval);
  }
  return { ok: false, code: "AUTH_LOGIN_TIMEOUT", loginUrl, message: "登录轮询超时。" };
}

async function refreshAccessToken(auth, options) {
  const refreshToken = decryptToken(auth.refresh);
  if (!refreshToken) return fail("AUTH_REFRESH_UNAVAILABLE", "没有 refresh token。");
  const endpoint = process.env.MATSPEC_YUNLONG_REFRESH_URL;
  if (!endpoint) return fail("AUTH_REFRESH_UNAVAILABLE", "未配置 token 刷新端点。");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(Number(options.codewiki_timeout_ms || 10000))
    });
    if (!response.ok) return fail("AUTH_REFRESH_FAILED", `token 刷新失败：HTTP ${response.status}`);
    const data = await response.json();
    const saved = saveTokens({
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || data.refreshToken || refreshToken,
      expiresIn: data.expires_in || data.expiresIn,
      accountId: auth.accountId,
      userName: auth.userName
    });
    return { ok: true, token: decryptToken(saved.access), auth: saved };
  } catch (error) {
    return fail("AUTH_REFRESH_FAILED", error.message);
  }
}

function localKey() {
  return crypto.createHash("sha256").update(`${os.userInfo().username}|${os.homedir()}|${os.hostname()}|matspec-yunlong-codewiki`).digest();
}

function expired(auth) {
  return Number(auth.expiresAt || 0) <= Date.now() + FIVE_MINUTES;
}

function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try { spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref(); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(code, message) {
  return { ok: false, code, message };
}
