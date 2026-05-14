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
