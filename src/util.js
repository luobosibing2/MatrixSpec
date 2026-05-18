import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function resolveRoot(options = {}) {
  return path.resolve(options.path || process.cwd());
}

export function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, "/") || ".";
}

export function ensureDir(dir, created, root) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    created?.push(rel(root, dir));
  }
}

export function writeFileIfNeeded(file, content, { force = false, created, skipped, root } = {}) {
  if (fs.existsSync(file) && !force) {
    skipped?.push(rel(root, file));
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  created?.push(rel(root, file));
  return true;
}

export function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function slugify(input) {
  return String(input)
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`;\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * Filesystem-safe slug for module artifact filenames (e.g. `modules/<slug>.md`,
 * `logs/prompts/modules/<slug>.md`). Maps `.`, empty, and whitespace-only inputs to
 * "project-root" so the project-root fallback module has a stable name on disk.
 *
 * Prefer this over `slugify` for any module-derived filename — they have different rules
 * (slugify keeps `.`, retains certain delimiters; moduleSlug strips everything that is not
 * a-z 0-9 down to a single `-`). Use `slugify` for display strings, change-log slugs, etc.
 */
export function moduleSlug(modulePath) {
  const raw = String(modulePath || "").trim();
  if (raw === "" || raw === ".") return "project-root";
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project-root"
  );
}

export function nowStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function today(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function sha256(file) {
  const stats = fs.statSync(file);
  if (stats.size <= 256 * 1024) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  }
  const fd = fs.openSync(file, "r");
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.alloc(256 * 1024);
  try {
    let position = 0;
    while (position < stats.size) {
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, position);
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    return hash.digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}

export function hasError(findings) {
  return findings.some((finding) => finding.level === "error");
}
