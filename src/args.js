const VALUE_OPTIONS = new Set([
  "--path",
  "--change",
  "--integration",
  "--runner",
  "--mode",
  "--model",
  "--default-runner",
  "--lang"
]);

const BOOLEAN_OPTIONS = new Set([
  "--help",
  "-h",
  "--json",
  "--force",
  "--probe-models"
]);

export function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (VALUE_OPTIONS.has(token)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing option value: ${token}`);
      }
      const key = token.slice(2).replaceAll("-", "_");
      options[key] = value;
      index += 1;
    } else if (BOOLEAN_OPTIONS.has(token)) {
      const key = token.replace(/^-+/, "").replaceAll("-", "_");
      options[key] = true;
    } else if (token.startsWith("--")) {
      throw new Error(`Unknown option: ${token}`);
    } else {
      positionals.push(token);
    }
  }

  return { command: positionals[0] || "help", args: positionals.slice(1), options };
}
