import fs from "node:fs";
import path from "node:path";
import { projectPaths } from "./project.js";

const NUMERIC_FIELDS = {
  turns: "turns",
  tool_calls: "toolCalls",
  input_tokens: "inputTokens",
  cached_input_tokens: "cachedInputTokens",
  output_tokens: "outputTokens",
  cost: "costUsd",
  duration_ms: "durationMs"
};

export function recordLocalUsage(command, options, result, durationMs) {
  if (process.env.MATSPEC_NO_LOCAL_METRICS || command === "metrics") return;
  appendMetric(options, {
    kind: "cli",
    component: inferComponent(command, result),
    command,
    success: result?.ok !== false,
    durationMs,
    change: result?.change || options.change || null,
    stage: result?.stage?.key || result?.acceptedStage || null,
    backtracks: command === "back" && result?.ok !== false ? 1 : 0
  });
}

export function metricsCommand(options = {}, args = []) {
  const action = args[0] || "show";
  if (action === "record") {
    const event = {
      kind: "agent",
      component: options.component || "candidate",
      label: options.label || null,
      change: options.change || null
    };
    for (const [option, field] of Object.entries(NUMERIC_FIELDS)) {
      if (options[option] === undefined) continue;
      const value = Number(options[option]);
      if (!Number.isFinite(value) || value < 0) return { ok: false, code: "METRIC_VALUE_INVALID", message: `Invalid --${option.replaceAll("_", "-")}: ${options[option]}` };
      event[field] = value;
    }
    appendMetric(options, event);
    return { ok: true, recorded: event };
  }
  if (action !== "show") return { ok: false, code: "METRICS_COMMAND_USAGE", message: "用法：matspec metrics show|record" };
  const events = readMetrics(options);
  return { ok: true, file: metricPath(options), eventCount: events.length, totals: summarize(events), byComponent: groupByComponent(events) };
}

function appendMetric(options, event) {
  const file = metricPath(options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`, "utf8");
}

function readMetrics(options) {
  const file = metricPath(options);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function metricPath(options) {
  return path.join(projectPaths(options).runtime, "metrics.jsonl");
}

function summarize(events) {
  const totals = { durationMs: 0, turns: 0, toolCalls: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0, backtracks: 0, cliCalls: 0, agentEvents: 0 };
  let hasObservedCost = false;
  for (const event of events) {
    if (Object.hasOwn(event, "costUsd")) hasObservedCost = true;
    for (const key of ["durationMs", "turns", "toolCalls", "inputTokens", "cachedInputTokens", "outputTokens", "costUsd", "backtracks"]) totals[key] += Number(event[key] || 0);
    if (event.kind === "cli") totals.cliCalls += 1;
    if (event.kind === "agent") totals.agentEvents += 1;
  }
  totals.costUsd = hasObservedCost ? Number(totals.costUsd.toFixed(6)) : null;
  return totals;
}

function groupByComponent(events) {
  return Object.fromEntries([...new Set(events.map((event) => event.component || "workflow"))].sort().map((component) => [component, summarize(events.filter((event) => (event.component || "workflow") === component))]));
}

function inferComponent(command, result) {
  const stage = result?.stage?.key || result?.acceptedStage;
  if (command === "back") return "operator";
  if (command === "review" || stage === "review") return "review";
  if (stage === "validation") return "validation";
  if (["go", "accept", "confirm", "implement", "done", "archive"].includes(command)) return "candidate";
  return "workflow";
}
