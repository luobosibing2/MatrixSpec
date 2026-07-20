#!/usr/bin/env node
import { main } from "../src/cli.js";
import { langOf } from "../src/i18n.js";

const jsonMode = process.argv.includes("--json");

try {
  await main(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error?.code || "CLI_ERROR";
  const details = error && typeof error === "object"
    ? Object.fromEntries(Object.entries(error).filter(([key]) => !["name", "message", "stack", "code"].includes(key)))
    : {};
  if (jsonMode) {
    console.error(JSON.stringify({ ok: false, code, message, ...details }, null, 2));
  } else {
    const lang = langOf({ lang: process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : undefined });
    console.error(`${lang === "zh-CN" ? "错误" : "Error"}: ${message}`);
    for (const key of ["path", "reason", "marker", "line", "excerpt", "stdoutPreview", "diagnostics"]) {
      if (details[key] !== undefined) console.error(`${key}: ${typeof details[key] === "string" ? details[key] : JSON.stringify(details[key])}`);
    }
    for (const next of details.next || []) console.error(`- ${next}`);
  }
  process.exitCode = 1;
}
