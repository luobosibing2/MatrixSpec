import path from "node:path";

const CORE_DIRS = ["src", "lib", "packages", "app", "server", "cmd", "pkg"];
const SKIP_MODULE_DIRS = new Set(["__tests__", "__mocks__", "test", "tests", "spec", "fixtures", "fixture", "demo", "examples"]);

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
  const modules = discoverModules(scan.includedFiles || [], scan.primaryExtension || null);
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
