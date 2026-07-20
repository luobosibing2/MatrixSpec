import path from "node:path";

const CORE_DIRS = ["src", "lib", "pkg", "packages", "app", "server", "cmd"];
const COMPONENT_ROOTS = ["component", "components", "services", "plugins", "modules", "tools", "cmd"];
const OPENHARMONY_MODULE_PATTERN_GROUPS = [
  [
    {
      prefix: ["frameworks", "core", "components_v2"],
      depth: 4,
      description: "OpenHarmony component module discovered under frameworks/core/components_v2."
    }
  ],
  [
    {
      prefix: ["frameworks", "core", "components_ng", "pattern"],
      depth: 5,
      description: "OpenHarmony NG pattern module discovered under frameworks/core/components_ng/pattern."
    }
  ],
  [
    {
      prefix: ["frameworks", "core", "interfaces", "native"],
      depth: 5,
      description: "OpenHarmony native interface module discovered under frameworks/core/interfaces/native."
    },
    {
      prefix: ["frameworks", "bridge"],
      depth: 3,
      description: "OpenHarmony bridge subsystem discovered under frameworks/bridge."
    },
    {
      prefix: ["adapter"],
      depth: 2,
      description: "OpenHarmony adapter subsystem discovered under adapter."
    },
    {
      prefix: ["interfaces"],
      depth: 2,
      description: "OpenHarmony interface surface discovered under interfaces."
    }
  ]
];
const OPENHARMONY_WEBVIEW_MODULE_PATTERNS = [
  {
    prefix: ["ohos_nweb"],
    depth: 1,
    description: "OpenHarmony WebView NWeb runtime module discovered under ohos_nweb."
  },
  {
    prefix: ["ohos_interface"],
    depth: 1,
    description: "OpenHarmony WebView OHOS interface glue discovered under ohos_interface."
  },
  {
    prefix: ["interfaces", "inner_api"],
    depth: 2,
    description: "OpenHarmony WebView inner API surface discovered under interfaces/inner_api."
  },
  {
    prefix: ["interfaces", "kits"],
    depth: 2,
    description: "OpenHarmony WebView public kit surface discovered under interfaces/kits."
  }
];
const SDK_TRAINING_SURFACE_PATTERNS = [
  {
    prefix: ["training"],
    depth: 2,
    description: "SDK training framework module discovered under training."
  }
];
const SDK_RUNTIME_SURFACE_PATTERNS = [
  {
    prefix: ["mxrec"],
    depth: 1,
    description: "SDK mxrec API/runtime surface discovered under mxrec."
  },
  {
    prefix: ["dynamic_emb"],
    depth: 1,
    description: "SDK dynamic embedding surface discovered under dynamic_emb."
  },
  {
    prefix: ["hybrid_torchrec"],
    depth: 1,
    description: "SDK hybrid TorchRec surface discovered under hybrid_torchrec."
  },
  {
    prefix: ["validators"],
    depth: 1,
    description: "SDK validator surface discovered under validators."
  }
];
const SDK_CUSTOM_OP_SURFACE_PATTERNS = [
  {
    prefix: ["cust_op"],
    depth: 2,
    description: "SDK custom operator module discovered under cust_op."
  }
];
const SKIP_MODULE_DIRS = new Set(["__tests__", "__mocks__", "test", "tests", "spec", "fixtures", "fixture", "demo", "demos", "examples"]);
const LARGE_FILE_LINES = 2000;
const LARGE_REPOSITORY_FILES = 300;
const MAX_COMPONENT_MODULES = 8;
const MAX_SDK_TRAINING_MODULES = 12;
const MAX_SDK_RUNTIME_MODULES = 8;
const MAX_SDK_CUSTOM_OP_MODULES = 8;
const MAX_SDK_SUPPORT_PER_KIND = 4;
const MAX_SOURCE_HEAVY_MODULES = 8;
const MIN_SOURCE_HEAVY_FILES = 10;
const SOURCE_HEAVY_OVERRIDE_RATIO = 3;

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

export function planModules(root, scan, options = {}) {
  const modules = validateAndFixModules(discoverModules(scan.includedFiles || [], scan.primaryExtension || null, scan.sourceFileStats || null), scan);
  const primaryExtension = scan.primaryExtension || null;
  const focused = validateFocusedTarget(modules, options.focusedTarget, plannerFileStats(scan));
  const base = {
    projectName: path.basename(root),
    language: LANGUAGE_BY_EXTENSION[primaryExtension] || null,
    primaryExtension
  };
  if (!focused.ok) {
    return {
      ...base,
      ok: false,
      code: focused.code,
      message: focused.message,
      focusedTarget: focused.focusedTarget,
      modules: focused.modules
    };
  }
  return {
    ...base,
    ...(focused.focusedTarget ? { focusedTarget: focused.focusedTarget } : {}),
    modules: focused.modules.length ? focused.modules : [fallbackModule(scan)]
  };
}

export function validateAndFixModules(modules, scan) {
  const sourceStats = plannerFileStats(scan);
  const sourceFiles = sourceStats.map((file) => file.path);
  const result = [];
  const seen = new Set();

  for (const module of modules) {
    if (isSkippedModulePath(module.path) && !module.allowSkipped) continue;
    const fixedPath = fixModulePath(module.path, module.name, sourceFiles);
    if (!fixedPath || (isSkippedModulePath(fixedPath) && !module.allowSkipped)) continue;
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
  const sourceFiles = sourceFileStats || files.map((file) => ({ path: file, lines: 0 }));
  const patternFiles = withPlannerSurfaceFiles(sourceFiles, files);

  const javaModules = primaryExtension === ".java" ? discoverJavaModules(files) : [];
  for (const module of javaModules) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  if (modules.length >= 2) return modules;

  if (hasWebViewSignal(patternFiles)) {
    for (const module of discoverPatternModules(patternFiles, OPENHARMONY_WEBVIEW_MODULE_PATTERNS)) {
      addModule(modules, seen, module.path, module.name, module.description);
    }
  }
  if (modules.length) return modules;

  for (const patternGroup of OPENHARMONY_MODULE_PATTERN_GROUPS) {
    for (const module of discoverPatternModules(patternFiles, patternGroup)) {
      addModule(modules, seen, module.path, module.name, module.description);
    }
    if (modules.length) {
      preferLargeRepositorySourceHeavyModules(modules, seen, sourceFiles, files, sourceFileStats);
      return modules;
    }
  }

  if (hasSdkSignal(patternFiles)) {
    for (const module of discoverSdkSurfaceModules(patternFiles)) {
      addModule(modules, seen, module.path, module.name, module.description, { allowSkipped: module.allowSkipped });
    }
    if (isLargeRepository({ includedFiles: files, sourceFileStats })) {
      addLargeRepositorySourceHeavyModules(modules, seen, sourceFiles);
    }
  }
  if (modules.length) return modules;

  for (const module of discoverComponentModules(sourceFiles)) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  preferLargeRepositorySourceHeavyModules(modules, seen, sourceFiles, files, sourceFileStats);
  if (isLargeRepository({ includedFiles: files, sourceFileStats })) {
    addLargeRepositorySourceHeavyModules(modules, seen, sourceFiles);
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

  if (!modules.length && isLargeRepository({ includedFiles: files, sourceFileStats })) {
    addLargeRepositorySourceHeavyModules(modules, seen, sourceFiles);
  }

  return modules;
}

function discoverPatternModules(sourceFiles, patterns, limit = MAX_COMPONENT_MODULES) {
  const candidates = new Map();
  for (const file of sourceFiles) {
    const parts = file.path.split("/");
    for (const pattern of patterns) {
      if (parts.length <= pattern.depth - 1 || !matchesPrefix(parts, pattern.prefix)) continue;
      const segment = parts[pattern.depth - 1];
      if (!segment || SKIP_MODULE_DIRS.has(segment.toLowerCase())) continue;
      const modulePath = parts.slice(0, pattern.depth).join("/");
      const current = candidates.get(modulePath) || {
        path: modulePath,
        files: 0,
        lines: 0,
        description: pattern.description
      };
      current.files += 1;
      current.lines += file.lines || 0;
      candidates.set(modulePath, current);
    }
  }

  return rankedModuleCandidates(candidates, limit).map((candidate) => ({
    path: candidate.path,
    name: moduleName(candidate.path),
    description: candidate.description
  }));
}

function discoverSdkSurfaceModules(sourceFiles) {
  return [
    ...discoverSdkTrainingModules(sourceFiles),
    ...discoverPatternModules(sourceFiles, SDK_RUNTIME_SURFACE_PATTERNS, MAX_SDK_RUNTIME_MODULES),
    ...discoverSdkCustomOpModules(sourceFiles),
    ...discoverSdkSupportModules(sourceFiles)
  ];
}

function discoverSdkTrainingModules(sourceFiles) {
  return discoverPatternModules(sourceFiles, SDK_TRAINING_SURFACE_PATTERNS, Number.MAX_SAFE_INTEGER)
    .sort((a, b) => sdkTrainingPriority(a.path) - sdkTrainingPriority(b.path) || a.path.localeCompare(b.path))
    .slice(0, MAX_SDK_TRAINING_MODULES);
}

function sdkTrainingPriority(modulePath) {
  const known = ["training/common", "training/tf_rec_v1", "training/tf_rec_v2", "training/torch_rec_v1", "training/torch_rec_v2"];
  const index = known.indexOf(modulePath);
  return index >= 0 ? index : known.length;
}

function discoverSdkCustomOpModules(sourceFiles) {
  return discoverPatternModules(sourceFiles, SDK_CUSTOM_OP_SURFACE_PATTERNS, Number.MAX_SAFE_INTEGER)
    .sort((a, b) => sdkCustomOpPriority(a.path) - sdkCustomOpPriority(b.path) || a.path.localeCompare(b.path))
    .slice(0, MAX_SDK_CUSTOM_OP_MODULES);
}

function sdkCustomOpPriority(modulePath) {
  const known = ["cust_op/ascendc_op", "cust_op/tf_cpu_op", "cust_op/tf_gpu_op"];
  const index = known.indexOf(modulePath);
  return index >= 0 ? index : known.length;
}

function discoverSdkSupportModules(sourceFiles) {
  const byKind = new Map();
  for (const file of sourceFiles) {
    const module = sdkSupportModuleForFile(file.path);
    if (!module) continue;
    const candidates = byKind.get(module.kind) || new Map();
    const current = candidates.get(module.path) || { ...module, files: 0, lines: 0 };
    current.files += 1;
    current.lines += file.lines || 0;
    candidates.set(module.path, current);
    byKind.set(module.kind, candidates);
  }

  const result = [];
  for (const candidates of byKind.values()) {
    result.push(
      ...[...candidates.values()]
        .sort((a, b) => b.files - a.files || b.lines - a.lines || a.path.localeCompare(b.path))
        .slice(0, MAX_SDK_SUPPORT_PER_KIND)
        .map((candidate) => ({
          name: moduleName(candidate.path),
          path: candidate.path,
          description: candidate.description,
          allowSkipped: candidate.allowSkipped
        }))
    );
  }
  return result;
}

function sdkSupportModuleForFile(filePath) {
  const parts = filePath.split("/");
  const name = parts.at(-1);
  if (name === "setup.py" || name === "pyproject.toml") {
    return { kind: "packaging", path: name, description: `SDK packaging surface discovered from ${name}.` };
  }
  if (name === "CMakeLists.txt") {
    return { kind: "native_build", path: filePath === name ? name : parts.slice(0, -1).join("/"), description: "SDK native build surface discovered from CMakeLists.txt." };
  }
  if (parts[0] === "docs") {
    const markerIndex = parts.findIndex((part) => ["api", "release", "releases", "package", "packages"].includes(part.toLowerCase()));
    if (markerIndex > 0 && markerIndex < parts.length - 1) {
      const marker = parts[markerIndex].toLowerCase().replace(/s$/, "");
      return { kind: `docs_${marker}`, path: parts.slice(0, markerIndex + 1).join("/"), description: "SDK API, package, or release documentation surface discovered under docs/." };
    }
  }
  if (["release", "releases", "package"].includes(parts[0]?.toLowerCase())) {
    return { kind: "release", path: parts[0], description: `SDK ${parts[0]} surface discovered at repository root.` };
  }
  if (isSdkCppTestPath(parts)) {
    return { kind: "cpp_tests", path: parts.slice(0, 2).join("/"), description: "SDK C++ test surface discovered under tests/.", allowSkipped: true };
  }
  return null;
}

function isSdkCppTestPath(parts) {
  if (parts.length < 3) return false;
  if (!["test", "tests"].includes(parts[0]?.toLowerCase())) return false;
  return ["cpp", "cxx", "cc", "native"].includes(parts[1]?.toLowerCase());
}

function hasWebViewSignal(sourceFiles) {
  return sourceFiles.some((file) => file.path === "ohos_nweb" || file.path.startsWith("ohos_nweb/"));
}

function hasSdkSignal(sourceFiles) {
  const firstSegments = new Set(sourceFiles.map((file) => file.path.split("/")[0]));
  if (["cust_op", "mxrec", "dynamic_emb", "hybrid_torchrec"].some((segment) => firstSegments.has(segment))) return true;
  const knownTrainingDirs = new Set();
  for (const file of sourceFiles) {
    const parts = file.path.split("/");
    if (parts[0] === "training" && ["common", "tf_rec_v1", "tf_rec_v2", "torch_rec_v1", "torch_rec_v2"].includes(parts[1])) {
      knownTrainingDirs.add(parts[1]);
    }
  }
  return knownTrainingDirs.size >= 2;
}

function withPlannerSurfaceFiles(sourceFiles, includedFiles) {
  const seen = new Set(sourceFiles.map((file) => file.path));
  const result = [...sourceFiles];
  for (const file of includedFiles) {
    if (seen.has(file) || !isPlannerSurfaceFile(file)) continue;
    seen.add(file);
    result.push({ path: file, lines: 0 });
  }
  return result;
}

function matchesPrefix(parts, prefix) {
  return prefix.every((part, index) => parts[index] === part);
}

function rankedModuleCandidates(candidates, limit = MAX_COMPONENT_MODULES) {
  return [...candidates.values()]
    .sort((a, b) => b.files - a.files || b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, limit);
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
  return rankedModuleCandidates(candidates).map((candidate) => ({
    path: candidate.path,
    name: moduleName(candidate.path),
    description: `Component source module discovered under ${candidate.path.split("/")[0]}/.`
  }));
}

function discoverSourceHeavyModules(sourceFiles) {
  const candidates = new Map();
  for (const file of sourceFiles) {
    const parts = file.path.split("/");
    if (parts.length < 3) continue;
    if (parts.some((part) => SKIP_MODULE_DIRS.has(part.toLowerCase()))) continue;
    const modulePath = parts.slice(0, 2).join("/");
    const current = candidates.get(modulePath) || { path: modulePath, files: 0, lines: 0 };
    current.files += 1;
    current.lines += file.lines || 0;
    candidates.set(modulePath, current);
  }

  return [...candidates.values()]
    .filter((candidate) => candidate.files >= MIN_SOURCE_HEAVY_FILES)
    .sort((a, b) => b.files - a.files || b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, MAX_SOURCE_HEAVY_MODULES)
    .map((candidate) => ({
      path: candidate.path,
      name: moduleName(candidate.path),
      description: "Source-heavy module inferred for a large repository without a known domain pattern."
    }));
}

function addLargeRepositorySourceHeavyModules(modules, seen, sourceFiles) {
  for (const module of discoverSourceHeavyModules(sourceFiles)) {
    const covered = modules.some((current) => current.path === module.path || module.path.startsWith(`${current.path}/`) || current.path.startsWith(`${module.path}/`));
    if (!covered) addModule(modules, seen, module.path, module.name, module.description);
  }
}

function preferLargeRepositorySourceHeavyModules(modules, seen, sourceFiles, files, sourceFileStats) {
  if (!modules.length || !isLargeRepository({ includedFiles: files, sourceFileStats })) return false;
  const sourceHeavy = discoverSourceHeavyModules(sourceFiles);
  if (!sourceHeavy.length) return false;

  const strongestExisting = Math.max(...modules.map((module) => statsForModule(module.path, sourceFiles).files));
  const strongestSourceHeavy = Math.max(...sourceHeavy.map((module) => statsForModule(module.path, sourceFiles).files));
  if (strongestSourceHeavy < strongestExisting * SOURCE_HEAVY_OVERRIDE_RATIO) return false;

  modules.length = 0;
  seen.clear();
  for (const module of sourceHeavy) {
    addModule(modules, seen, module.path, module.name, module.description);
  }
  return true;
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

function addModule(modules, seen, modulePath, name, description, extra = {}) {
  if (seen.has(modulePath)) return;
  seen.add(modulePath);
  modules.push({ name, path: modulePath, description, ...extra });
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

function validateFocusedTarget(modules, focusedTarget, sourceStats) {
  if (!focusedTarget) return { ok: true, modules };

  const normalized = String(focusedTarget).replaceAll("\\", "/").replace(/\/+/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  const matched = modules.find((module) => module.path === normalized);
  if (matched) {
    return {
      ok: true,
      focusedTarget: normalized,
      modules: [matched, ...modules.filter((module) => module !== matched)]
    };
  }

  const sourceFiles = sourceStats.map((file) => file.path);
  const targetFiles = sourceFiles.filter((file) => matchesFocusedTarget(file, normalized));
  if (!targetFiles.length) {
    return {
      ok: false,
      code: "FOCUSED_TARGET_NOT_PLANNED",
      focusedTarget: normalized,
      modules,
      message: `Focused target was not found in planned source modules: ${normalized}`
    };
  }

  const targetPath = targetFiles.some((file) => file === normalized || file.startsWith(`${normalized}/`))
    ? normalized
    : commonAncestorDir(targetFiles);
  if (targetPath === ".") {
    return {
      ok: false,
      code: "FOCUSED_TARGET_AMBIGUOUS",
      focusedTarget: normalized,
      modules,
      message: `Focused target matched multiple source boundaries: ${normalized}`
    };
  }
  const result = [];
  const seen = new Set();
  addValidatedModule(
    result,
    seen,
    {
      name: moduleName(targetPath),
      path: targetPath,
      description: `Focused target module inferred from ${normalized}.`
    },
    sourceStats
  );
  for (const module of modules) {
    addValidatedModule(result, seen, module, sourceStats);
  }
  if (!result.length || result[0].path !== targetPath) {
    return {
      ok: false,
      code: "FOCUSED_TARGET_NOT_PLANNED",
      focusedTarget: normalized,
      modules,
      message: `Focused target was not found in planned source modules: ${normalized}`
    };
  }

  return {
    ok: true,
    focusedTarget: normalized,
    modules: result
  };
}

function matchesFocusedTarget(file, target) {
  if (file === target || file.startsWith(`${target}/`)) return true;
  if (target.includes("/")) return file.includes(`/${target}/`);
  return file.split("/").includes(target);
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

function fallbackModule(scan) {
  const large = isLargeRepository(scan);
  return {
    name: "Project Root",
    path: ".",
    description: large
      ? "Fallback module because no safe module boundaries were detected for this large repository."
      : "Fallback module for a small project without obvious source module directories."
  };
}

function isLargeRepository(scan) {
  return (scan.includedFiles || []).length >= LARGE_REPOSITORY_FILES || (scan.sourceFileStats || []).length >= LARGE_REPOSITORY_FILES;
}

function plannerFileStats(scan) {
  const stats = scan.sourceFileStats || fallbackSourceStats(scan.includedFiles || []);
  if (!scan.sourceFileStats) return stats;

  const seen = new Set(stats.map((file) => file.path));
  const result = [...stats];
  for (const file of scan.includedFiles || []) {
    if (seen.has(file) || !isPlannerSurfaceFile(file)) continue;
    seen.add(file);
    result.push({ path: file, lines: 0, plannerSurface: true });
  }
  return result;
}

function isPlannerSurfaceFile(file) {
  const name = file.split("/").pop();
  return (
    name === "setup.py" ||
    name === "pyproject.toml" ||
    name === "CMakeLists.txt" ||
    name === "BUILD.gn" ||
    file.endsWith(".gn") ||
    Boolean(sdkSupportModuleForFile(file))
  );
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
