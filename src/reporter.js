import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectPaths } from "./project.js";
import { VERSION } from "./constants.js";

export async function reportUsage(command, options, result, durationMs) {
  if (process.env.MATSPEC_NO_REPORT || options.noReport) return;
  const endpoint = process.env.MATSPEC_REPORT_URL;
  if (!endpoint) return;
  const paths = projectPaths(options);
  const event = {
    operationType: `${String(command).toUpperCase().replaceAll("-", "_")}_${result?.ok === false ? "FAILED" : "SUCCESS"}`,
    command,
    success: result?.ok !== false,
    durationMs,
    error: result?.ok === false ? { code: result.code, message: result.message } : null,
    change: result?.change,
    flowId: result?.flowId,
    stage: result?.stage?.key || result?.acceptedStage,
    runId: result?.runId,
    runner: result?.runner || result?.summary?.runner,
    model: result?.model || result?.summary?.model,
    version: VERSION,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    gitUrl: gitRemote(paths.root),
    user: identity(),
    options: redact(options),
    timestamp: new Date().toISOString()
  };
  try {
    await flushQueue(paths.runtime, endpoint);
    await post(endpoint, event);
  } catch (error) {
    queue(paths.runtime, event, error);
  }
}

export function redact(value, key = "") {
  if (/token|password|secret|(?:api.?key)|\bkey\b/i.test(key)) return "***REDACTED***";
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redact(item, name)]));
  return value;
}

async function flushQueue(runtime, endpoint) {
  const dir = path.join(runtime, "report-queue");
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).filter((item) => item.endsWith(".json")).sort().slice(0, 10)) {
    const file = path.join(dir, name);
    let record;
    try { record = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fs.rmSync(file, { force: true }); continue; }
    if (record.attempts >= 3) { fs.rmSync(file, { force: true }); continue; }
    try {
      await post(endpoint, record.event);
      fs.rmSync(file, { force: true });
    } catch (error) {
      record.attempts += 1;
      record.lastAttemptAt = new Date().toISOString();
      record.lastError = error.message;
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    }
  }
}

async function post(endpoint, event) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`report HTTP ${response.status}`);
}

function queue(runtime, event, error) {
  const dir = path.join(runtime, "report-queue");
  fs.mkdirSync(dir, { recursive: true });
  const record = { attempts: 0, createdAt: new Date().toISOString(), lastAttemptAt: null, lastError: error.message, event };
  const file = path.join(dir, `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  files.slice(0, Math.max(0, files.length - 100)).forEach((name) => fs.rmSync(path.join(dir, name), { force: true }));
}

function identity() {
  try { return os.userInfo().username; } catch {}
  return crypto.createHash("sha256").update(`${os.homedir()}|${os.hostname()}`).digest("hex").slice(0, 16);
}

function gitRemote(root) {
  const result = spawnSync("git", ["-C", root, "remote", "get-url", "origin"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  return result.stdout.trim().replace(/\/\/[^/@]+:[^/@]+@/, "//<redacted>@");
}
