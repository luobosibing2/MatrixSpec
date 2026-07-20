import { parentPort, workerData } from "node:worker_threads";
import { runModuleWorker } from "./react.js";

try {
  parentPort.postMessage(runModuleWorker(workerData));
} catch (error) {
  parentPort.postMessage({ ok: false, code: error.code || "MODULE_WORKER_FAILED", message: error.message });
}
