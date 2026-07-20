import fs from "node:fs";
import path from "node:path";
import { generateModule } from "./runs.js";
import { projectPaths } from "./project.js";
import { slugify, writeJson } from "./util.js";

export async function generateBatch(batchFile, options = {}) {
  const paths = projectPaths(options);
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(path.resolve(paths.root, batchFile), "utf8")); }
  catch (error) { return fail("INVALID_MODULES", `无法读取 batch JSON：${error.message}`); }
  const modules = Array.isArray(parsed) ? parsed : parsed.modules;
  if (!Array.isArray(modules) || !modules.length) return fail("NO_MODULES", "batch 没有 modules。");
  for (const module of modules) {
    if (!String(module.name || "").trim() || !Array.isArray(module.paths) || !module.paths.length) return fail("INVALID_MODULES", "每个 module 必须有非空 name 和 paths。");
    for (const item of module.paths) {
      if (!fs.existsSync(path.resolve(paths.root, item))) return fail("INVALID_MODULES", `模块路径不存在：${item}`);
    }
  }
  const id = `batch-${timestamp()}`;
  const dir = path.join(paths.runtime, "runs", id);
  fs.mkdirSync(path.join(dir, "modules"), { recursive: true });
  const results = Array(modules.length);
  const concurrency = Math.min(modules.length, Math.max(1, Number(options.concurrency || 2)));
  let cursor = 0;
  async function consume() {
    while (cursor < modules.length) {
      const index = cursor++;
      const module = modules[index];
      const result = await generateModule(module.paths, options);
      results[index] = collectModuleResult(module, result, dir, paths);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, consume));
  const failed = results.filter((item) => !item.ok);
  const manifest = {
    runId: id,
    type: "batch",
    status: failed.length ? "partial" : "generated",
    createdAt: new Date().toISOString(),
    concurrency,
    modules: results
  };
  writeJson(path.join(dir, "manifest.json"), manifest);
  writeJson(path.join(paths.runtime, "runs/latest.json"), { runId: id });
  return {
    ok: failed.length === 0,
    ...(failed.length ? { code: "BATCH_PARTIAL" } : {}),
    runId: id,
    status: manifest.status,
    modules: results,
    message: failed.length ? `${failed.length} 个模块生成失败，已保留成功产物。` : "批量生成完成。"
  };
}

function collectModuleResult(module, result, dir, paths) {
    const slug = slugify(module.name);
    const target = path.join(dir, "modules", slug);
    fs.mkdirSync(target, { recursive: true });
    if (result.ok) {
      const sourceRun = path.join(paths.runtime, "runs", result.runId);
      for (const file of ["spec.md", "design.md", "manifest.json", "plan.json"]) {
        if (fs.existsSync(path.join(sourceRun, file))) fs.copyFileSync(path.join(sourceRun, file), path.join(target, file));
      }
    }
  return { name: module.name, paths: module.paths, ok: result.ok !== false, runId: result.runId, code: result.code, message: result.message };
}

function timestamp(date = new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds(), 3)}`;
}

function fail(code, message) {
  return { ok: false, code, message };
}
