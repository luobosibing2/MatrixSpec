// Shared limits for module-first generation prompts.
// Limits count UTF-16 code units (JS string chars), not bytes. For typical Latin
// scripts 1 char ~ 1 byte ~ 0.4-1 token; for CJK / emoji a char may consume 3-4 bytes
// but still ~ 1 token, so this is a conservative size cap on the prompt body.
export const MODULE_PROMPT_LIMITS = {
  MAX_MODULE_FILES_IN_PROMPT: 30,
  MAX_MODULE_TREE_LINES: 80,
  MAX_MODULE_README_CONTEXT_CHARS: 4 * 1024,
  MAX_MODULE_DOCS_CONTEXT_CHARS: 6 * 1024
};

const TRUNCATION_SUFFIX = "\n... document context truncated";

export function limitedContext(files, maxChars) {
  let remaining = maxChars;
  const chunks = [];
  for (const file of files) {
    if (remaining <= 0) break;
    const header = `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n`;
    const content = String(file.content || "");
    // Reserve room for the truncation suffix in case we have to cut, so total chunk length
    // (header + slice + suffix) never exceeds the remaining budget.
    const willTruncate = content.length > Math.max(0, remaining - header.length);
    const sliceBudget = Math.max(0, remaining - header.length - (willTruncate ? TRUNCATION_SUFFIX.length : 0));
    const slice = content.slice(0, sliceBudget);
    const truncated = slice.length < content.length;
    chunks.push(`${header}${slice}${truncated ? TRUNCATION_SUFFIX : ""}`);
    remaining -= header.length + slice.length + (truncated ? TRUNCATION_SUFFIX.length : 0);
  }
  return chunks.join("\n\n");
}

export function limitedLines(text, limit) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (lines.length <= limit) return lines.join("\n");
  return `${lines.slice(0, limit).join("\n")}\n... ${lines.length - limit} more entries omitted from prompt`;
}
