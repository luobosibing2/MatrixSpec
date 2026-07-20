const VALUE_OPTIONS = new Set([
  "--path", "--change", "--integration", "--confirm-compatible",
  "--runner", "--serve-url", "--model", "--agent", "--concurrency",
  "--retries", "--batch", "--design-template", "--spec-template", "--knowledge", "--template",
  "--complete", "--block", "--file", "--label", "--delegate",
  "--objective", "--after", "--lang", "--default-runner", "--mode"
]);

const REPEATABLE_OPTIONS = new Set(["--module-path"]);

const BOOLEAN_OPTIONS = new Set([
  "--help", "-h", "--json", "--force", "--no-template-update", "--run", "--resume",
  "--mock", "--no-update-check", "--required", "--clean", "--no-color", "--probe-models"
]);

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (BOOLEAN_OPTIONS.has(token)) {
      options[keyOf(token)] = true;
      continue;
    }
    if (VALUE_OPTIONS.has(token) || token === "--task") {
      const value = argv[index + 1];
      if (token === "--task") (options._tasks ??= []).push(value);
      else options[keyOf(token)] = value;
      index += value === undefined ? 0 : 1;
      if (token === "--block" && argv[index + 1] !== undefined && !argv[index + 1].startsWith("--")) {
        options.block_reason = argv[index + 1];
        index += 1;
      }
      continue;
    }
    if (REPEATABLE_OPTIONS.has(token)) {
      const key = keyOf(token);
      (options[key] ??= []).push(argv[index + 1]);
      index += argv[index + 1] === undefined ? 0 : 1;
      continue;
    }
    // Strict compatibility: unknown --options are positional tokens.
    positionals.push(token);
  }
  if (options._tasks) {
    options.task = positionals[0] === "implement" ? options._tasks.at(-1) : options._tasks;
    delete options._tasks;
  }
  if (options.concurrency !== undefined) {
    const concurrency = Number(options.concurrency);
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
      throw Object.assign(new Error("--concurrency must be an integer from 1 to 10."), { code: "INVALID_CONCURRENCY" });
    }
    options.concurrency = concurrency;
  }
  return { command: positionals[0] || "help", args: positionals.slice(1), options };
}

function keyOf(token) {
  return token.replace(/^-+/, "").replaceAll("-", "_");
}
