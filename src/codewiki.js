import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { selectToken } from "./auth.js";
import { projectPaths } from "./project.js";

const ZONES = {
  cbg: "https://codewiki.cbg.huawei.com/",
  yellow: "https://codewiki-y.rnd.huawei.com/",
  green: "https://codewiki.rnd.huawei.com/"
};

export async function codewikiCommand(options = {}, args = []) {
  const action = args[0] || "pull";
  if (action !== "pull") return fail("CODEWIKI_COMMAND_USAGE", "用法：matspec codewiki pull");
  return syncFromCodeWiki(options);
}

export async function syncFromCodeWiki(options = {}) {
  const paths = projectPaths(options);
  const auth = await selectToken(options, { allowInteractive: !options.json });
  if (!auth.token) return auth;
  const git = gitContext(paths.root);
  const reference = {
    projectId: options.project_id || options.codewiki_project_id || options.codehub_project_id,
    projectUrl: options.project_url || options.codewiki_project_url || git.remote,
    branch: options.branch || git.branch
  };
  if (!reference.projectId && !reference.projectUrl) return fail("CODEWIKI_PROJECT_NOT_FOUND", "无法从参数或 git origin 定位 CodeWiki 项目。");
  configureNoProxy();
  const zones = zoneCandidates(options, reference.projectUrl, paths.root);
  const matches = [];
  const failures = [];
  for (const [zone, base] of zones) {
    try {
      const project = await resolveProject(base, reference, auth.token, options);
      if (project) matches.push({ zone, base, project });
    } catch (error) {
      failures.push({ zone, message: error.message, status: error.status });
    }
  }
  if (!matches.length) return { ok: false, code: "CODEWIKI_PROJECT_NOT_FOUND", message: "CodeWiki 项目不存在或无权限。", failures };
  if (matches.length > 1 && !options.zone && !options.network_zone) {
    const cached = readCodeWikiCache(paths.root);
    const selected = matches.find((item) => item.zone === cached?.zone);
    if (selected) matches.splice(0, matches.length, selected);
    else return { ok: false, code: "CODEWIKI_ZONE_SELECTION_REQUIRED", message: "项目在多个区域存在，请使用 --zone。", zones: matches.map((item) => item.zone) };
  }
  const selected = matches[0];
  const docs = await fetchDocuments(selected, reference, auth.token, options);
  if (!docs.ok) return docs;
  const targets = {
    spec: path.join(paths.specs, "spec.md"),
    design: path.join(paths.specs, "design.md")
  };
  const existing = Object.values(targets).filter((file) => fs.existsSync(file));
  if (existing.length && !options.force) {
    return { ok: false, code: "MATSPEC_SYNC_OVERWRITE_REQUIRED", message: "本地全量文档已存在；使用 --force 覆盖。", existing };
  }
  fs.mkdirSync(paths.specs, { recursive: true });
  fs.writeFileSync(targets.spec, docs.spec, "utf8");
  fs.writeFileSync(targets.design, docs.design, "utf8");
  writeCodeWikiCache(paths.root, { zone: selected.zone, projectId: selected.project.id, branch: reference.branch, updatedAt: new Date().toISOString() });
  return {
    ok: true,
    provider: "codewiki",
    zone: selected.zone,
    project: selected.project,
    branch: reference.branch,
    lag: docs.lag,
    applied: ["matspec/specs/spec.md", "matspec/specs/design.md"]
  };
}

async function resolveProject(base, reference, token, options) {
  if (reference.projectId) return { id: reference.projectId, url: reference.projectUrl };
  const search = projectName(reference.projectUrl);
  const response = await requestJson(new URL(`/api/projects?search=${encodeURIComponent(search)}&branch=${encodeURIComponent(reference.branch || "")}`, base), token, options);
  const projects = response.projects || response.items || response.data || (Array.isArray(response) ? response : []);
  return projects.find((item) => sameProject(item, reference.projectUrl)) || projects[0] || null;
}

async function fetchDocuments(selected, reference, token, options) {
  const id = selected.project.id || selected.project.projectId;
  const branch = reference.branch || selected.project.branch || "master";
  const query = `?branch=${encodeURIComponent(branch)}`;
  let design;
  try {
    design = await requestJson(new URL(`/api/projects/${encodeURIComponent(id)}/full-design${query}`, selected.base), token, options);
  } catch (error) {
    if (!options.generate) return fail("CODEWIKI_DESIGN_NOT_GENERATED", error.message);
    await requestJson(new URL(`/api/projects/${encodeURIComponent(id)}/full-design/generate${query}`, selected.base), token, { ...options, method: "POST" });
    return { ok: false, code: "CODEWIKI_DESIGN_GENERATING", message: "已提交 full design 生成，请稍后重试。" };
  }
  const designText = markdownOf(design);
  if (!substantial(designText)) return fail("CODEWIKI_DESIGN_NOT_GENERATED", "CodeWiki full design 没有实质内容。");
  const version = design.versionId || design.designVersionId || design.id;
  let spec;
  try {
    spec = await requestJson(new URL(`/api/projects/${encodeURIComponent(id)}/spec${query}${version ? `&designVersionId=${encodeURIComponent(version)}` : ""}`, selected.base), token, options);
  } catch (error) {
    return fail("MATSPEC_SPEC_GENERATING", error.message);
  }
  if (["RUNNING", "PENDING"].includes(spec.status)) return { ok: false, code: "MATSPEC_SPEC_GENERATING", status: spec.status, message: "CodeWiki spec 正在生成。" };
  const specText = markdownOf(spec);
  if (!substantial(specText)) return fail("MATSPEC_SPEC_GENERATING", "CodeWiki spec 尚无实质内容。");
  const lag = Number(design.lag || 0);
  const maxLag = Number(options.max_lag || 20);
  if (options.auto && lag > maxLag) return { ok: false, code: "CODEWIKI_DESIGN_TOO_STALE", lag, maxLag, message: "CodeWiki design 版本过旧。" };
  return { ok: true, design: designText, spec: specText, lag };
}

async function requestJson(url, token, options) {
  if (typeof options.request === "function") return options.request(url, token, options);
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(Number(options.codewiki_timeout_ms || 10000))
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text.slice(0, 500) }; }
  if (!response.ok) {
    const error = Object.assign(new Error(body.message || `CodeWiki HTTP ${response.status}`), { status: response.status, bodyPreview: text.slice(0, 500) });
    throw error;
  }
  return body;
}

function zoneCandidates(options, projectUrl, root) {
  const explicit = options.zone || options.network_zone;
  if (explicit && ZONES[explicit]) return [[explicit, ZONES[explicit]]];
  if (process.env.MATSPEC_CODEWIKI_API_BASE) return [["custom", process.env.MATSPEC_CODEWIKI_API_BASE]];
  const host = safeUrl(projectUrl)?.hostname;
  const inferred = Object.entries(ZONES).find(([, url]) => new URL(url).hostname === host);
  if (inferred) return [inferred];
  const cached = readCodeWikiCache(root);
  const entries = Object.entries(ZONES);
  return cached?.zone ? [...entries.filter(([name]) => name === cached.zone), ...entries.filter(([name]) => name !== cached.zone)] : entries;
}

function gitContext(root) {
  const run = (args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
    return result.status === 0 ? result.stdout.trim() : "";
  };
  return { remote: sanitizeGitUrl(run(["remote", "get-url", "origin"])), branch: run(["branch", "--show-current"]) };
}

export function sanitizeGitUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[^@\s]+@[^:\s]+:/.test(text)) return text;
  try {
    const url = new URL(text);
    url.username = "";
    url.password = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return text;
  }
}

function sameProject(project, gitUrl) {
  const expected = projectName(gitUrl).toLowerCase();
  return [project.name, project.path, project.url, project.gitUrl].filter(Boolean).some((value) => String(value).toLowerCase().replace(/\.git$/, "").endsWith(expected));
}

function projectName(value) {
  return String(value || "").replace(/[?#].*$/, "").replace(/\/+$/, "").split(/[/:]/).at(-1)?.replace(/\.git$/, "") || "";
}

function markdownOf(value) {
  return String(value?.markdown || value?.content || value?.document || value?.data?.markdown || "");
}

function substantial(text) {
  return text.trim().length >= 40 && /^#|\n#/m.test(text);
}

function configureNoProxy() {
  const hosts = Object.values(ZONES).map((url) => new URL(url).hostname);
  for (const key of ["NO_PROXY", "no_proxy"]) {
    const values = new Set(String(process.env[key] || "").split(",").map((item) => item.trim()).filter(Boolean));
    hosts.forEach((host) => values.add(host));
    process.env[key] = [...values].join(",");
  }
}

function readCodeWikiCache(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, ".matspec-cli/codewiki.json"), "utf8")); } catch { return null; }
}

function writeCodeWikiCache(root, value) {
  fs.writeFileSync(path.join(root, ".matspec-cli/codewiki.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeUrl(value) {
  try { return new URL(value); } catch { return null; }
}

function fail(code, message) {
  return { ok: false, code, message };
}
