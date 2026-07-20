import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../bin/matspec.js");
  fs.chmodSync(file, 0o755);
}
