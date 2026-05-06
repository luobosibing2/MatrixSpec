import fs from "node:fs";
import path from "node:path";

const ANY_DEPTH_IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".matspec-cli",
  "node_modules",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache"
]);

const ROOT_IGNORED_DIRS = new Set([
  "dist",
  "build",
  "coverage",
  "target",
  "vendor"
]);

const WORKSPACE_ARTIFACT_DIRS = new Set([
  ".next",
  "dist",
  "build",
  "coverage",
  "target",
  "vendor"
]);

const SOURCE_DIR_NAMES = new Set(["src", "source", "lib", "app", "server", "cmd", "pkg"]);

const IGNORED_PATHS = new Set(["matspec/changes/archives"]);

const LOCK_FILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "poetry.lock",
  "Pipfile.lock"
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".svgz",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".rar",
  ".7z",
  ".tar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".class",
  ".jar",
  ".wasm",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".mov",
  ".avi"
]);

const ANALYZABLE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".env",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".cs",
  ".php",
  ".rb",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cc",
  ".swift",
  ".sh",
  ".ps1",
  ".sql",
  ".html",
  ".css",
  ".scss",
  ".vue",
  ".svelte",
  ".astro"
]);

const MAX_FILE_SIZE = 256 * 1024;
const MAX_README_FILES = 3;
const MAX_DOC_FILES = 10;
const MAX_DOC_TOTAL_BYTES = 128 * 1024;
const MAX_DOC_FILE_BYTES = 32 * 1024;
const MAX_IGNORED_SAMPLE = 50;

export function scanRepository(root) {
  const includedFiles = [];
  const ignoredSample = [];
  const extensionCounts = {};
  let totalFiles = 0;
  let ignoredCount = 0;

  function ignore(relativePath, reason) {
    ignoredCount += 1;
    if (ignoredSample.length < MAX_IGNORED_SAMPLE) ignoredSample.push({ path: relativePath, reason });
  }

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relativePath = normalizePath(path.relative(root, absolute));
      if (!relativePath) continue;

      if (entry.isDirectory()) {
        const reason = ignoredDirectoryReason(relativePath, entry.name);
        if (reason) {
          ignore(relativePath, reason);
          continue;
        }
        walk(absolute);
        continue;
      }

      if (!entry.isFile()) continue;
      totalFiles += 1;
      const reason = ignoredFileReason(absolute, relativePath, entry.name);
      if (reason) {
        ignore(relativePath, reason);
        continue;
      }
      includedFiles.push(relativePath);
      const extension = path.extname(entry.name).toLowerCase() || "[no-extension]";
      extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
    }
  }

  walk(root);
  includedFiles.sort();

  const readmeFiles = readProjectDocs(root, includedFiles.filter(isReadme), MAX_README_FILES);
  const docsFiles = readProjectDocs(
    root,
    includedFiles.filter((file) => file.startsWith("docs/") && /\.mdx?$/i.test(file)),
    MAX_DOC_FILES
  );

  return {
    totalFiles,
    includedFiles,
    ignoredFiles: {
      count: ignoredCount,
      sample: ignoredSample
    },
    readmeFiles,
    docsFiles,
    fileTree: buildFileTree(includedFiles),
    extensionCounts,
    primaryExtension: primaryExtension(extensionCounts)
  };
}

export function normalizePath(input) {
  return String(input).replaceAll(path.sep, "/").replace(/^\.\//, "");
}

function ignoredDirectoryReason(relativePath, name) {
  const isRootDirectory = !relativePath.includes("/");
  if (ANY_DEPTH_IGNORED_DIRS.has(name)) return `ignored directory: ${name}`;
  if (isRootDirectory && ROOT_IGNORED_DIRS.has(name)) return `ignored root directory: ${name}`;
  if (isWorkspaceArtifactDirectory(relativePath, name)) return `ignored workspace artifact directory: ${relativePath}`;
  if (IGNORED_PATHS.has(relativePath)) return `ignored path: ${relativePath}`;
  return null;
}

function isWorkspaceArtifactDirectory(relativePath, name) {
  const parts = relativePath.split("/");
  if (!WORKSPACE_ARTIFACT_DIRS.has(name)) return false;
  if (parts[0] === "packages") {
    if (parts[1]?.startsWith("@")) return parts.length === 4;
    return parts.length === 3;
  }
  if (parts[0] === "apps") {
    if (parts.length === 3) return true;
    return parts.length === 4 && !SOURCE_DIR_NAMES.has(parts[2]);
  }
  return false;
}

function ignoredFileReason(absolute, relativePath, name) {
  if (LOCK_FILES.has(name)) return "lock file";
  const extension = path.extname(name).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) return "binary or media file";
  const size = fs.statSync(absolute).size;
  if (size > MAX_FILE_SIZE) return "large file";
  if (!ANALYZABLE_EXTENSIONS.has(extension) && !isReadme(relativePath) && !isKnownConfig(name)) return "unsupported extension";
  if (looksBinary(absolute)) return "binary file";
  return null;
}

function isReadme(file) {
  return /^readme(?:[.\-_][\w-]+)?(?:\.md)?$/i.test(path.basename(file));
}

function isKnownConfig(name) {
  return [
    "Dockerfile",
    "Makefile",
    "Rakefile",
    "Procfile",
    ".gitignore",
    ".npmrc",
    ".nvmrc",
    ".editorconfig",
    "tsconfig",
    "package.json"
  ].some((prefix) => name === prefix || name.startsWith(`${prefix}.`));
}

function looksBinary(file) {
  const buffer = Buffer.alloc(512);
  const fd = fs.openSync(file, "r");
  try {
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytes).includes(0);
  } finally {
    fs.closeSync(fd);
  }
}

function readProjectDocs(root, files, limit) {
  const results = [];
  let totalBytes = 0;
  for (const file of files.slice(0, limit)) {
    const absolute = path.join(root, file);
    const size = fs.statSync(absolute).size;
    if (totalBytes >= MAX_DOC_TOTAL_BYTES) break;
    const bytesToRead = Math.min(size, MAX_DOC_FILE_BYTES, MAX_DOC_TOTAL_BYTES - totalBytes);
    const fd = fs.openSync(absolute, "r");
    const buffer = Buffer.alloc(bytesToRead);
    try {
      fs.readSync(fd, buffer, 0, bytesToRead, 0);
    } finally {
      fs.closeSync(fd);
    }
    totalBytes += bytesToRead;
    results.push({
      path: file,
      size,
      truncated: bytesToRead < size,
      content: buffer.toString("utf8")
    });
  }
  return results;
}

function buildFileTree(files) {
  const tree = {};
  for (const file of files) {
    let cursor = tree;
    for (const part of file.split("/")) {
      cursor[part] ??= {};
      cursor = cursor[part];
    }
  }
  const lines = [];
  renderTree(tree, 0, lines);
  return lines.join("\n");
}

function renderTree(node, depth, lines) {
  for (const name of Object.keys(node).sort((a, b) => a.localeCompare(b))) {
    const isDirectory = Object.keys(node[name]).length > 0;
    lines.push(`${"  ".repeat(depth)}${name}${isDirectory ? "/" : ""}`);
    if (isDirectory) renderTree(node[name], depth + 1, lines);
  }
}

function primaryExtension(extensionCounts) {
  const entries = Object.entries(extensionCounts).filter(([extension]) => extension !== ".md" && extension !== ".json");
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0]?.[0] || Object.entries(extensionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
