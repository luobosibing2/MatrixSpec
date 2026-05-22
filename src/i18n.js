const EN = new Set(["en", "en-us", "en_us", "en-gb", "en_gb"]);
const ZH = new Set(["zh", "zh-cn", "zh_cn", "cn"]);

export function langOf(options = {}, env = process.env) {
  const value = String(options.lang || env.MATSPEC_LANG || "").toLowerCase();
  if (EN.has(value)) return "en";
  if (ZH.has(value)) return "zh-CN";
  return "zh-CN";
}

export function isZh(options = {}) {
  return langOf(options) === "zh-CN";
}

export function pick(options, en, zh) {
  return isZh(options) ? zh : en;
}

export function format(template, vars = {}) {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export function tr(options, en, zh, vars = {}) {
  return format(pick(options, en, zh), vars);
}
