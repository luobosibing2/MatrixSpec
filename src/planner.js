import path from "node:path";

const CORE_DIRS = ["src", "lib", "packages", "app", "server", "cmd", "pkg"];
const SKIP_MODULE_DIRS = new Set(["__tests__", "__mocks__", "test", "tests", "spec", "fixtures", "fixture", "demo", "examples"]);
const FALLBACK_SKIP_DIRS = new Set([...SKIP_MODULE_DIRS, "docs"]);
const MAX_FALLBACK_MODULES = 8;
const DEFAULT_OVERSIZED_FALLBACK_MODULE_FILES = 800;

function oversizedThreshold() {
  // MATSPEC_FALLBACK_OVERSIZE_THRESHOLD makes the second-level split testable without
  // creating hundreds of files in fixtures. Non-positive / non-numeric values fall back
  // to the default.
  const raw = Number(process.env.MATSPEC_FALLBACK_OVERSIZE_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_OVERSIZED_FALLBACK_MODULE_FILES;
}

const LANGUAGE_BY_EXTENSION = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".cs": "C#",
  ".php": "PHP",
  ".rb": "Ruby",
  ".c": "C/C++",
  ".cc": "C/C++",
  ".cpp": "C/C++",
  ".h": "C/C++",
  ".hpp": "C/C++",
  ".swift": "Swift"
};

export function planModules(root, scan) {
  const files = scan.includedFiles || [];
  const modules = discoverModules(files, scan.primaryExtension || null);
  const fallbackModules = modules.length ? modules : discoverFallbackModules(files, scan.primaryExtension || null);
  const primaryExtension = scan.primaryExtension || null;
  return {
    projectName: path.basename(root),
    language: LANGUAGE_BY_EXTENSION[primaryExtension] || null,
    primaryExtension,
    modules: fallbackModules.length
      ? fallbackModules
      : [
          {
            name: "Project Root",
            path: ".",
            description: "Fallback module for a small project without obvious source module directories."
          }
        ]
  };
}

function discoverFallbackModules(files, primaryExtension) {
  const codeFiles = primaryExtension ? files.filter((file) => path.extname(file).toLowerCase() === primaryExtension) : files;
  const oversize = oversizedThreshold();
  const topLevel = groupBySegment(codeFiles, 1)
    .filter((group) => isFallbackModulePath(group.path))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));
  const modules = [];
  const seen = new Set();

  for (const group of topLevel) {
    // When a top-level dir is oversized we try to expand one level deeper to surface meaningful
    // child modules. If the children collapse to a single entry (e.g. frameworks/ where all files
    // sit under frameworks/core/) we intentionally stop and keep the parent group instead of
    // recursing further — bounded depth is more predictable than chasing the bottom of a chain.
    // TODO: revisit if real OpenHarmony-scale repos prove that 2 levels is insufficient.
    const children =
      group.count > oversize
        ? groupBySegment(codeFiles.filter((file) => file.startsWith(`${group.path}/`)), 2).sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
        : [];
    const selected = children.length > 1 ? children : [group];
    for (const candidate of selected) {
      if (!isFallbackModulePath(candidate.path)) continue;
      addModule(modules, seen, candidate.path, moduleName(candidate.path), "Source module discovered from top-level repository layout.");
      if (modules.length >= MAX_FALLBACK_MODULES) return modules;
    }
  }

  return modules;
}

function groupBySegment(files, depth) {
  const counts = new Map();
  for (const file of files) {
    const parts = file.split("/").filter(Boolean);
    if (parts.length <= depth) continue;
    const key = parts.slice(0, depth).join("/");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([path, count]) => ({ path, count }));
}

function isFallbackModulePath(modulePath) {
  const parts = modulePath.split("/");
  const leaf = parts.at(-1)?.toLowerCase();
  // FALLBACK_SKIP_DIRS holds the exact directory names we never treat as modules (test/, tests/,
  // __tests__/, spec/, docs/, ...). We intentionally avoid substring matching like includes("test")
  // here because that misfires on legitimate module names: latest/, attestation/, testing-utils/.
  return Boolean(leaf && !leaf.startsWith(".") && !FALLBACK_SKIP_DIRS.has(leaf) && !FALLBACK_SKIP_DIRS.has(parts[0]));
}

function discoverModules(files, primaryExtension) {
  const modules = [];
  const seen = new Set();

  const javaModules = primaryExtension === ".java" ? discoverJavaModules(files) : [];
  for (const module of javaModules) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length >= 2) return modules;

  for (const coreDir of CORE_DIRS) {
    const underCore = files.filter((file) => file === coreDir || file.startsWith(`${coreDir}/`));
    if (!underCore.length) continue;

    if (coreDir === "packages") {
      for (const dir of firstLevelDirectories(underCore, "packages")) {
        addModule(modules, seen, dir, moduleName(dir), "Package module discovered under packages/.");
      }
      continue;
    }

    const childDirs = firstLevelDirectories(underCore, coreDir);
    if (childDirs.length) {
      for (const dir of childDirs) {
        addModule(modules, seen, dir, moduleName(dir), `Source module discovered under ${coreDir}/.`);
      }
    } else {
      addModule(modules, seen, coreDir, moduleName(coreDir), `Core project directory ${coreDir}/.`);
    }
  }

  return modules;
}

function discoverJavaModules(files) {
  const javaFiles = files.filter((file) => file.startsWith("src/main/java/") && file.endsWith(".java"));
  if (!javaFiles.length) return [];

  const javaPrefix = "src/main/java/";
  const dirs = javaFiles.map((file) => file.slice(javaPrefix.length).split("/").slice(0, -1)).filter((parts) => parts.length);
  const common = commonPrefix(dirs);
  const modules = [];
  const seen = new Set();
  const rootPath = `${javaPrefix}${common.join("/")}`;
  const rootFiles = javaFiles.filter((file) => {
    const dir = file.slice(javaPrefix.length).split("/").slice(0, -1);
    return sameParts(dir, common);
  });

  if (rootFiles.length && common.length) {
    addModule(modules, seen, rootPath, "Application", "Java application entrypoint and shared root package.");
  }

  for (const file of javaFiles) {
    const dir = file.slice(javaPrefix.length).split("/").slice(0, -1);
    if (dir.length <= common.length) continue;
    const segment = dir[common.length];
    if (!segment || SKIP_MODULE_DIRS.has(segment)) continue;
    const modulePath = `${javaPrefix}${[...common, segment].join("/")}`;
    addModule(modules, seen, modulePath, moduleName(segment), "Java package module discovered under src/main/java.");
  }

  if (files.some((file) => file.startsWith("src/main/resources/"))) {
    addModule(modules, seen, "src/main/resources", "Resources", "Spring or JVM runtime resources discovered under src/main/resources.");
  }

  return modules;
}

function commonPrefix(partsList) {
  if (!partsList.length) return [];
  const prefix = [];
  const shortest = Math.min(...partsList.map((parts) => parts.length));
  for (let index = 0; index < shortest; index += 1) {
    const value = partsList[0][index];
    if (partsList.every((parts) => parts[index] === value)) prefix.push(value);
    else break;
  }
  return prefix;
}

function sameParts(left, right) {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function firstLevelDirectories(files, parent) {
  const dirs = new Set();
  for (const file of files) {
    const rest = file.slice(parent.length).replace(/^\//, "");
    if (!rest || !rest.includes("/")) continue;
    const name = rest.split("/")[0];
    if (!name || SKIP_MODULE_DIRS.has(name)) continue;
    dirs.add(`${parent}/${name}`);
  }
  return [...dirs].sort();
}

function addModule(modules, seen, modulePath, name, description) {
  if (seen.has(modulePath)) return;
  seen.add(modulePath);
  modules.push({ name, path: modulePath, description });
}

function moduleName(modulePath) {
  const base = modulePath.split("/").pop();
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
