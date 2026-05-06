#!/usr/bin/env node
import { main } from "../src/cli.js";
import { langOf } from "../src/i18n.js";

const jsonMode = process.argv.includes("--json");

try {
  await main(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error?.code || "CLI_ERROR";
  if (jsonMode) {
    console.error(JSON.stringify({ ok: false, code, message }, null, 2));
  } else {
    const lang = langOf({ lang: process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : undefined });
    console.error(`${lang === "zh-CN" ? "错误" : "Error"}: ${message}`);
  }
  process.exitCode = 1;
}
