import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SRC_DIR, "../..");
const FULL_TEMPLATE_DIR = path.join(PACKAGE_ROOT, "templates", "full");

export function readFullTemplates() {
  return {
    design: readTemplate("DESIGN.md"),
    spec: readTemplate("SPEC.md"),
    specAnnotated: readTemplate("SPEC-annotated.md")
  };
}

export function requiredSpecSections() {
  return ["Component Purpose", "Domain Terminology", "Actors and Boundaries", "DFX Constraints", "Core Capabilities", "Data Constraints"];
}

export function requiredDesignSections() {
  return ["Design overview", "System architecture", "Data model", "Interface design", "Core flow design", "Algorithm design", "Caching design", "Error handling design", "Observability", "Security design"];
}

export function commonOutputRules() {
  return `Hard output rules:
1. Output only the final Markdown body. Do not add explanations, prefaces, or afterwords.
2. Do not wrap the whole document in \`\`\`md or any other code fence.
3. Do not mention sandbox, filesystem, read-only mode, inability to write files, or "copy into your repo" environment details.
4. Write in English by default.
5. Do not claim that files have been written; the MatSpec CLI saves artifacts.`;
}

export function specBlackBoxRules() {
  return `SPEC writing boundary:
1. SPEC answers "what the system does" for product, QA, business stakeholders, and AI agents.
2. Derive externally visible behavior and business rules from the generated design.md.
3. Do not include implementation details: file paths, class names, function names, table names, field types, indexes, framework internals, cache implementation, or source package names.
4. Abstract technical facts into user-visible capabilities, constraints, rules, or acceptance criteria.
5. Mark business intent that cannot be inferred from design.md as "to be confirmed"; do not invent it.`;
}

function readTemplate(name) {
  return fs.readFileSync(path.join(FULL_TEMPLATE_DIR, name), "utf8").trim();
}
