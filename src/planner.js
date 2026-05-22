import path from "node:path";

const CORE_DIRS = ["src", "lib", "pkg", "packages", "app", "server", "cmd"];
const COMPONENT_ROOTS = ["component", "components", "services", "plugins", "modules", "tools", "cmd"];
const SKIP_MODULE_DIRS = new Set(["__tests__", "__mocks__", "test", "tests", "spec", "fixtures", "fixture", "demo", "demos", "examples"]);
const LARGE_FILE_LINES = 2000;
const MAX_COMPONENT_MODULES = 8;

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
  const modules = validateAndFixModules(discoverModules(scan.includedFiles || [], scan.primaryExtension || null, scan.sourceFileStats || null), scan);
  const primaryExtension = scan.primaryExtension || null;
  return {
    projectName: path.basename(root),
    language: LANGUAGE_BY_EXTENSION[primaryExtension] || null,
    primaryExtension,
    modules: modules.length
      ? modules
      : [
          {
            name: "Project Root",
            path: ".",
            description: "Fallback module for a small project without obvious source module directories."
          }
        ]
  };
}

export function validateAndFixModules(modules, scan) {
  const sourceStats = scan.sourceFileStats || fallbackSourceStats(scan.includedFiles || []);
  const sourceFiles = sourceStats.map((file) => file.path);
  const result = [];
  const seen = new Set();

  for (const module of modules) {
    if (isSkippedModulePath(module.path)) continue;
    const fixedPath = fixModulePath(module.path, module.name, sourceFiles);
    if (!fixedPath || isSkippedModulePath(fixedPath)) continue;
    addValidatedModule(result, seen, { ...module, path: fixedPath }, sourceStats);
  }

  const allSkipped = result.length > 0 && result.every((module) => isSkippedModulePath(module.path));
  if (allSkipped) result.length = 0;

  for (const coreDir of CORE_DIRS) {
    const coreFiles = sourceFiles.filter((file) => file === coreDir || file.startsWith(`${coreDir}/`));
    if (!coreFiles.length || isCoreCovered(coreDir, result)) continue;
    const childDirs = firstLevelDirectories(coreFiles, coreDir);
    if (coreDir === "packages" && childDirs.length) {
      for (const dir of childDirs) {
        addValidatedModule(result, seen, { name: moduleName(dir), path: dir, description: `Core package source code in ${dir}/.` }, sourceStats);
      }
    } else if (childDirs.length === 1) {
      const dir = childDirs[0];
      addValidatedModule(result, seen, { name: moduleName(dir), path: dir, description: `Core source code in ${dir}/.` }, sourceStats);
    } else {
      addValidatedModule(result, seen, { name: moduleName(coreDir), path: coreDir, description: `Core source code in ${coreDir}/.` }, sourceStats);
    }
  }

  return result;
}

function discoverModules(files, primaryExtension, sourceFileStats = null) {
  const modules = [];
  const seen = new Set();

  const javaModules = primaryExtension === ".java" ? discoverJavaModules(files) : [];
  for (const module of javaModules) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length >= 2) return modules;

  for (const module of discoverComponentModules(sourceFileStats || files.map((file) => ({ path: file, lines: 0 })))) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length) return modules;

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

function discoverComponentModules(sourceFiles) {
  const candidates = new Map();
  for (const file of sourceFiles) {
    const parts = file.path.split("/");
    if (parts.length < 3 || !COMPONENT_ROOTS.includes(parts[0])) continue;
    if (SKIP_MODULE_DIRS.has(parts[1]?.toLowerCase()) || parts[1]?.toLowerCase() === "example") continue;
    const modulePath = `${parts[0]}/${parts[1]}`;
    const current = candidates.get(modulePath) || { path: modulePath, files: 0, lines: 0 };
    current.files += 1;
    current.lines += file.lines || 0;
    candidates.set(modulePath, current);
  }
  return [...candidates.values()]
    .sort((a, b) => b.files - a.files || b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, MAX_COMPONENT_MODULES)
    .map((candidate) => ({
      path: candidate.path,
      name: moduleName(candidate.path),
      description: `Component source module discovered under ${candidate.path.split("/")[0]}/.`
    }));
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

function addValidatedModule(modules, seen, module, sourceStats) {
  if (seen.has(module.path)) return;
  const stats = statsForModule(module.path, sourceStats);
  if (!stats.files) return;
  seen.add(module.path);
  modules.push({
    ...module,
    sourceFiles: stats.files,
    sourceLines: stats.lines,
    largeFile: stats.files <= 3 && stats.lines > LARGE_FILE_LINES
  });
}

function fixModulePath(modulePath, name, sourceFiles) {
  if (moduleHasSource(modulePath, sourceFiles)) return modulePath;
  const parent = parentPath(modulePath);
  if (parent && moduleHasSource(parent, sourceFiles)) return parent;
  const keywords = extractKeywords(name);
  if (keywords.length) {
    const matched = sourceFiles.filter((file) => {
      const lower = file.toLowerCase();
      return keywords.some((keyword) => lower.includes(keyword));
    });
    if (matched.length) return commonAncestorDir(matched);
  }
  return null;
}

function moduleHasSource(modulePath, sourceFiles) {
  return sourceFiles.some((file) => file === modulePath || file.startsWith(`${modulePath}/`));
}

function parentPath(modulePath) {
  const normalized = String(modulePath || "").replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : null;
}

function extractKeywords(name) {
  return String(name || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length > 2);
}

function commonAncestorDir(files) {
  const split = files.map((file) => file.split("/"));
  const first = split[0] || [];
  const common = [];
  for (let index = 0; index < first.length - 1; index += 1) {
    if (split.every((parts) => parts[index] === first[index])) common.push(first[index]);
    else break;
  }
  return common.join("/") || ".";
}

function isSkippedModulePath(modulePath) {
  return String(modulePath || "")
    .split("/")
    .some((part) => SKIP_MODULE_DIRS.has(part.toLowerCase()));
}

function isCoreCovered(coreDir, modules) {
  return modules.some((module) => module.path === coreDir || module.path.startsWith(`${coreDir}/`) || coreDir.startsWith(`${module.path}/`));
}

function statsForModule(modulePath, sourceStats) {
  const files = sourceStats.filter((file) => file.path === modulePath || file.path.startsWith(`${modulePath}/`));
  return {
    files: files.length,
    lines: files.reduce((total, file) => total + (file.lines || 0), 0)
  };
}

function fallbackSourceStats(files) {
  return files
    .filter((file) => !isSkippedModulePath(file))
    .map((file) => ({ path: file, lines: 0 }));
}

function moduleName(modulePath) {
  const base = modulePath.split("/").pop();
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
