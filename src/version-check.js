import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VERSION } from "./constants.js";

const CACHE = path.join(os.homedir(), ".matspec-cli/update-cache.json");

export async function checkForUpdates(options = {}) {
  if (options.json || options.no_update_check || !process.stdout.isTTY) return null;
  const cached = readCache();
  if (cached?.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 24 * 60 * 60 * 1000) {
    return cached.latest && cached.latest !== VERSION ? cached : null;
  }
  const registry = process.env.MATSPEC_NPM_REGISTRY;
  if (!registry) return null;
  try {
    const response = await fetch(`${registry.replace(/\/$/, "")}/matspec-community/latest`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const data = await response.json();
    const value = { checkedAt: new Date().toISOString(), latest: data.version, current: VERSION };
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    return data.version !== VERSION ? value : null;
  } catch {
    return null;
  }
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch { return null; }
}
